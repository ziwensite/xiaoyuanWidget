import { App, Modal, Setting, Notice, ButtonComponent, Menu } from 'obsidian';
import type WidgetPlugin from '../main';
import { WidgetStore } from '../store/WidgetStore';
import { t } from '../i18n';
import { getAllWidgetMetas } from '../widgets/registry';
import { WidgetDefinition, AnyWidgetType, WidgetStyle } from '../types';
import { isContainerType } from './_shared';
import { ChildEditorModal } from './ChildEditorModal';

export class WidgetEditorModal extends Modal {
  private freeformPositions: Record<string, { x: number; y: number; w: number; h: number }> = {};
  private freeformPreviewEl: HTMLElement | null = null;

  constructor(
    app: App,
    private plugin: WidgetPlugin,
    private store: WidgetStore,
    private editId: string | null,
    private onSaved: (widget?: WidgetDefinition) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('xyw-editor-modal');

    const existing = this.editId ? this.store.getWidget(this.editId) : null;
    const isNew = !existing;

    // Initialize freeform positions from store
    if (existing?.settings?.childPositions) {
      this.freeformPositions = JSON.parse(JSON.stringify(existing.settings.childPositions));
    } else {
      this.freeformPositions = {};
    }
    this.freeformPreviewEl = null;

    let name = existing?.name ?? '';
    let type: AnyWidgetType = (existing?.type as AnyWidgetType) ?? 'container-row';
    let children: string[] = existing?.children ? [...existing.children] : [];
    let editingSettings: Record<string, any> = existing?.settings ? { ...existing.settings } : {};
    const editingStyle: WidgetStyle = existing?.style ? JSON.parse(JSON.stringify(existing.style)) : {};

    const renderFull = () => {
      contentEl.empty();
      contentEl.addClass('xyw-editor-modal');

      new Setting(contentEl)
        .setName(t('label-name'))
        .addText(tc => tc
          .setValue(name)
          .onChange(v => { name = v; }));

      const headerRow = contentEl.createEl('div', { cls: 'xyw-section-header' });
      headerRow.createEl('h3', { text: t('label-widget-list') });
      new Setting(headerRow)
        .setName(t('label-layout-type'))
        .addDropdown(dd => {
          for (const m of getAllWidgetMetas()) {
            if (isContainerType(m.type)) {
              dd.addOption(m.type, t(`type-${m.type}`));
            }
          }
          dd.setValue(type);
          dd.onChange(v => {
            type = v as AnyWidgetType;
            if (type === 'container-freeform') {
              if (!editingStyle.height) editingStyle.height = '400px';
            }
            renderFull();
          });
        });

      const listEl = contentEl.createEl('div', { cls: 'xyw-child-list' });
      const emptyEl = contentEl.createEl('p', { cls: 'xyw-empty-state', text: t('msg-no-children') });

      const isFreeform = type === 'container-freeform';
      const refreshList = () => {
        listEl.empty();
        emptyEl.style.display = children.length ? 'none' : '';
        for (let i = 0; i < children.length; i++) {
          this.renderChildCard(listEl, children, i, refreshList, isFreeform);
        }
      };
      refreshList();

      // Freeform preview area
      if (type === 'container-freeform') {
        this.ensureFreeformPositions(children);
        contentEl.createEl('h3', { text: t('freeform-preview') });
        this.freeformPreviewEl = contentEl.createEl('div', { cls: 'xyw-freeform-preview' });
        const previewHeight = parseInt(editingStyle.height ?? '400') || 400;
        this.renderFreeformPreview(this.freeformPreviewEl, children, previewHeight);
      }

      const styleSection = contentEl.createEl('div', { cls: 'xyw-style-section' });
      styleSection.createEl('h3', { text: t('style-content') });

      if (type === 'container-freeform') {
        const hint = styleSection.createEl('div', { cls: 'xyw-freeform-hint', text: t('freeform-hint') });
      }

      if (type !== 'container-freeform') {
        new Setting(styleSection)
          .setName(t('style-content-align'))
          .addDropdown(dd => {
            dd.addOption('stretch', t('align-stretch'));
            dd.addOption('left', t('style-align-left'));
            dd.addOption('center', t('style-align-center'));
            dd.addOption('right', t('style-align-right'));
            dd.setValue(editingSettings.hAlign ?? 'stretch');
            dd.onChange(v => { editingSettings.hAlign = v; });
          });
        new Setting(styleSection)
          .setName(t('style-content-valign'))
          .addDropdown(dd => {
            dd.addOption('stretch', t('align-stretch'));
            dd.addOption('top', t('valign-top'));
            dd.addOption('middle', t('valign-middle'));
            dd.addOption('bottom', t('valign-bottom'));
            dd.setValue(editingSettings.vAlign ?? 'stretch');
            dd.onChange(v => { editingSettings.vAlign = v; });
          });
      }

      new Setting(styleSection)
        .setName(t('style-border-color'))
        .addText(tc => {
          tc.inputEl.type = 'color';
          tc.setValue(editingStyle?.borderColor ?? '')
          .onChange(v => {
            if (editingStyle) editingStyle.borderColor = v;
          });
        });
      const parseSize = (val: string | undefined) => {
        if (!val) return { num: '', unit: 'px' };
        const m = val.match(/^([\d.]+)\s*(px|%|em|rem|vw|vh)?$/);
        return m ? { num: m[1], unit: m[2] || 'px' } : { num: val, unit: '' };
      };
      const wParsed = parseSize(editingStyle?.width);
      new Setting(styleSection)
        .setName(t('style-width'))
        .addText(tc => {
          tc.inputEl.type = 'number';
          tc.inputEl.placeholder = 'auto';
          tc.setValue(wParsed.num);
          tc.onChange(v => {
            if (!editingStyle) return;
            const unit = (editingStyle.width ?? '').replace(/^[\d.]+/, '') || 'px';
            editingStyle.width = v ? `${v}${unit}` : '';
          });
        })
        .addDropdown(dd => {
          const units = ['px', '%', 'em', 'rem', 'vw', 'vh'];
          for (const u of units) dd.addOption(u, u);
          dd.setValue(wParsed.unit);
          dd.onChange(v => {
            if (!editingStyle) return;
            const num = (editingStyle.width ?? '').replace(/[^\d.]+/g, '');
            editingStyle.width = num ? `${num}${v}` : '';
          });
        });
      const hParsed = parseSize(editingStyle?.height);
      new Setting(styleSection)
        .setName(t('style-height'))
        .addText(tc => {
          tc.inputEl.type = 'number';
          tc.inputEl.placeholder = 'auto';
          tc.setValue(hParsed.num);
          tc.onChange(v => {
            if (!editingStyle) return;
            const unit = (editingStyle.height ?? '').replace(/^[\d.]+/, '') || 'px';
            editingStyle.height = v ? `${v}${unit}` : '';
          });
        })
        .addDropdown(dd => {
          const units = ['px', '%', 'em', 'rem', 'vw', 'vh'];
          for (const u of units) dd.addOption(u, u);
          dd.setValue(hParsed.unit);
          dd.onChange(v => {
            if (!editingStyle) return;
            const num = (editingStyle.height ?? '').replace(/[^\d.]+/g, '');
            editingStyle.height = num ? `${num}${v}` : '';
          });
        });

      const setPad = (key: 'paddingTop' | 'paddingBottom' | 'paddingLeft' | 'paddingRight', label: string) => {
        new Setting(styleSection)
          .setName(label)
          .addText(tc => {
            tc.inputEl.type = 'number';
            tc.inputEl.placeholder = '默认';
            tc.setValue(((editingStyle as any)[key] ?? '').replace(/px$/, ''));
            tc.onChange(v => {
              (editingStyle as any)[key] = v ? `${v}px` : '';
            });
          });
      };
      setPad('paddingTop', t('style-padding-top') + '（px）');
      setPad('paddingBottom', t('style-padding-bottom') + '（px）');
      setPad('paddingLeft', t('style-padding-left') + '（px）');
      setPad('paddingRight', t('style-padding-right') + '（px）');

      const bottomRow = contentEl.createEl('div', { cls: 'xyw-bottom-row' });
      const leftGroup = bottomRow.createEl('div', { cls: 'xyw-bottom-left' });
      new ButtonComponent(leftGroup)
        .setButtonText('新建')
        .setCta()
        .onClick(async () => {
          const modal = new ChildEditorModal(this.app, this.store, null);
          const id = await modal.openAndGet();
          if (id) { children.push(id); renderFull(); }
        });
      new ButtonComponent(leftGroup)
        .setButtonText('引用')
        .onClick((event) => {
          const leaves = this.store.getLeafWidgets();
          if (leaves.length === 0) { new Notice('暂无叶子'); return; }
          const menu = new Menu();
          for (const leaf of leaves) {
            menu.addItem((item) => {
              item.setTitle(`${leaf.name} (${t(`type-${leaf.type}`)})`);
              item.onClick(() => {
                children.push(leaf.id);
                renderFull();
              });
            });
          }
          menu.showAtMouseEvent(event);
        });
      new ButtonComponent(leftGroup)
        .setButtonText('复制')
        .onClick((event) => {
          const leaves = this.store.getLeafWidgets();
          if (leaves.length === 0) { new Notice('暂无叶子'); return; }
          const menu = new Menu();
          for (const leaf of leaves) {
            menu.addItem((item) => {
              item.setTitle(`${leaf.name} (${t(`type-${leaf.type}`)})`);
              item.onClick(async () => {
                const def = this.store.getWidget(leaf.id);
                if (def) {
                  const copy = JSON.parse(JSON.stringify(def));
                  delete copy.id; delete copy.createdAt; delete copy.updatedAt;
                  const saved = await this.store.addWidget(copy);
                  children.push(saved.id);
                  renderFull();
                }
              });
            });
          }
          menu.showAtMouseEvent(event);
        });

      const rightGroup = bottomRow.createEl('div', { cls: 'xyw-bottom-right' });
      new ButtonComponent(rightGroup)
        .setButtonText(t('btn-save'))
        .setCta()
        .onClick(async () => {
          if (!name.trim()) { new Notice('Name is required'); return; }
          const data: any = { name: name.trim(), type, children };
          if (editingStyle && Object.keys(editingStyle).length > 0) data.style = editingStyle;
          if (type === 'container-freeform') {
            data.settings = { ...editingSettings, childPositions: this.freeformPositions };
          } else {
            data.settings = editingSettings;
          }
          if (isNew) {
            const saved = await this.store.addWidget(data);
            new Notice(t('btn-save'));
            this.onSaved(saved);
          } else {
            await this.store.updateWidget(this.editId!, data);
            new Notice(t('btn-save'));
            this.onSaved();
          }
          this.close();
        });
      new ButtonComponent(rightGroup)
        .setButtonText(t('btn-cancel'))
        .onClick(() => this.close());
    };
    renderFull();
  }

  private renderChildCard(listEl: HTMLElement, children: string[], index: number, onRefresh: () => void, isFreeform?: boolean): void {
    const childId = children[index];
    const childDef = this.store.getWidget(childId);
    const card = listEl.createEl('div', { cls: 'xyw-child-card-simple' });
    card.draggable = true;

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', String(index));
      card.addClass('xyw-dragging');
    });
    card.addEventListener('dragend', () => {
      card.removeClass('xyw-dragging');
      listEl.querySelectorAll('.drag-over').forEach(el => el.removeClass('drag-over'));
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.addClass('drag-over');
    });
    card.addEventListener('dragleave', () => {
      card.removeClass('drag-over');
    });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.removeClass('drag-over');
      const from = parseInt(e.dataTransfer?.getData('text/plain') ?? '-1');
      if (from >= 0 && from !== index) {
        const [item] = children.splice(from, 1);
        const to = from < index ? index - 1 : index;
        children.splice(to, 0, item);
        onRefresh();
      }
    });

    const label = childDef
      ? `${index + 1}. ${childDef.name} (${t(`type-${childDef.type}`)})`
      : `${index + 1}. [已删除] ${childId}`;
    card.createEl('span', {
      cls: 'xyw-child-label-simple',
      text: label,
    });
    const acts = card.createEl('div', { cls: 'xyw-child-actions-simple' });

    new ButtonComponent(acts)
      .setIcon('copy')
      .setTooltip(t('btn-duplicate'))
      .onClick(() => {
        if (childDef) {
          const copy = JSON.parse(JSON.stringify(childDef));
          delete copy.id; delete copy.createdAt; delete copy.updatedAt;
          this.store.addWidget(copy).then(saved => {
            children.splice(index + 1, 0, saved.id);
            onRefresh();
          });
        }
      });
    new ButtonComponent(acts)
      .setIcon('pencil')
      .setTooltip(t('btn-edit'))
      .onClick(async () => {
        if (childDef) {
          const modal = new ChildEditorModal(this.app, this.store, childId);
          const id = await modal.openAndGet();
          if (id) onRefresh();
        }
      });
    new ButtonComponent(acts)
      .setIcon('trash-2')
      .setTooltip(t('btn-delete'))
      .onClick(() => {
        delete this.freeformPositions[childId];
        children.splice(index, 1);
        onRefresh();
      });

    // Position inputs for freeform
    if (isFreeform && childDef) {
      const pos = this.freeformPositions[childId] ?? { x: 0, y: index * 25, w: 100, h: 25 };
      this.freeformPositions[childId] = pos;

      const posRow = card.createEl('div', { cls: 'xyw-freeform-pos-inputs' });
      posRow.setAttribute('data-child-id', childId);

      const createPosInput = (labelKey: string, key: 'x' | 'y' | 'w' | 'h', min: number, max: number, defaultVal: number) => {
        const lbl = posRow.createEl('label');
        lbl.textContent = t(labelKey);
        const inp = lbl.createEl('input', { type: 'number', attr: { min: String(min), max: String(max) } });
        inp.value = String(Math.round(pos[key]));
        inp.addEventListener('change', () => {
          const raw = inp.value === '' ? defaultVal : Number(inp.value);
          pos[key] = Math.max(min, Math.min(max, raw));
          inp.value = String(Math.round(pos[key]));
          if (this.freeformPreviewEl) this.renderFreeformPreview(this.freeformPreviewEl, children);
        });
        return inp;
      };

      createPosInput('freeform-x', 'x', 0, 100, 0);
      createPosInput('freeform-y', 'y', 0, 100, 0);
      createPosInput('freeform-w', 'w', 5, 100, 100);
      createPosInput('freeform-h', 'h', 5, 100, 25);
    }
  }

  private ensureFreeformPositions(children: string[]): void {
    for (let i = 0; i < children.length; i++) {
      const id = children[i];
      if (!this.freeformPositions[id]) {
        this.freeformPositions[id] = { x: 0, y: i * 25, w: 100, h: 25 };
      }
    }
  }

  private renderFreeformPreview(previewEl: HTMLElement, children: string[], containerHeight?: number): void {
    previewEl.empty();
    if (!children.length) return;

    const height = containerHeight ?? (parseInt(previewEl.style.height) || 400);
    previewEl.style.height = height + 'px';

    for (let i = 0; i < children.length; i++) {
      const childId = children[i];
      const childDef = this.store.getWidget(childId);
      const pos = this.freeformPositions[childId] ?? { x: 0, y: i * 25, w: 100, h: 25 };
      this.freeformPositions[childId] = pos;

      const block = previewEl.createEl('div', { cls: 'xyw-freeform-preview-block' });
      block.textContent = childDef?.name ?? `#${i + 1}`;
      this.updatePreviewBlockStyle(block, pos);

      // Drag to reposition
      let dragData: { startX: number; startY: number; origX: number; origY: number; origW: number; origH: number } | null = null;

      block.addEventListener('mousedown', (e) => {
        if ((e.target as HTMLElement).hasClass('xyw-freeform-resize-handle')) return;
        e.preventDefault();
        const cw = previewEl.clientWidth;
        const ch = previewEl.clientHeight;
        if (!cw || !ch) return;

        block.addClass('xyw-dragging');
        dragData = {
          startX: e.clientX,
          startY: e.clientY,
          origX: pos.x,
          origY: pos.y,
          origW: pos.w,
          origH: pos.h,
        };

        const onMove = (ev: MouseEvent) => {
          if (!dragData) return;
          const dx = ((ev.clientX - dragData.startX) / cw) * 100;
          const dy = ((ev.clientY - dragData.startY) / ch) * 100;
          pos.x = Math.max(0, Math.min(100 - pos.w, dragData.origX + dx));
          pos.y = Math.max(0, Math.min(100 - pos.h, dragData.origY + dy));
          this.updatePreviewBlockStyle(block, pos);
          this.syncFreeformInputs(childId, pos);
        };

        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          block.removeClass('xyw-dragging');
          dragData = null;
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      // Resize handle
      const resizeHandle = block.createEl('div', { cls: 'xyw-freeform-resize-handle' });
      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const cw = previewEl.clientWidth;
        const ch = previewEl.clientHeight;
        if (!cw || !ch) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const origW = pos.w;
        const origH = pos.h;

        const onMove = (ev: MouseEvent) => {
          const dx = ((ev.clientX - startX) / cw) * 100;
          const dy = ((ev.clientY - startY) / ch) * 100;
          pos.w = Math.max(5, Math.min(100 - pos.x, origW + dx));
          pos.h = Math.max(5, Math.min(100 - pos.y, origH + dy));
          this.updatePreviewBlockStyle(block, pos);
          this.syncFreeformInputs(childId, pos);
        };

        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }
  }

  private updatePreviewBlockStyle(block: HTMLElement, pos: { x: number; y: number; w: number; h: number }): void {
    block.style.left = pos.x + '%';
    block.style.top = pos.y + '%';
    block.style.width = pos.w + '%';
    block.style.height = pos.h + '%';
  }

  private syncFreeformInputs(childId: string, pos: { x: number; y: number; w: number; h: number }): void {
    const posRow = this.contentEl.querySelector(`.xyw-freeform-pos-inputs[data-child-id="${childId}"]`);
    if (!posRow) return;
    const inputs = posRow.querySelectorAll('input[type="number"]');
    if (inputs.length >= 4) {
      (inputs[0] as HTMLInputElement).value = String(Math.round(pos.x));
      (inputs[1] as HTMLInputElement).value = String(Math.round(pos.y));
      (inputs[2] as HTMLInputElement).value = String(Math.round(pos.w));
      (inputs[3] as HTMLInputElement).value = String(Math.round(pos.h));
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}