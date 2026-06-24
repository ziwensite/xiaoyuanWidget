import { App, Modal, Setting, Notice, ButtonComponent, Menu } from 'obsidian';
import { FocusManager } from '../utils/FocusManager';
import type WidgetPlugin from '../main';
import { WidgetStore } from '../store/WidgetStore';
import { t } from '../i18n';
import { WidgetDefinition, WidgetStyle, TabPage, DEFAULT_CHILD_X, DEFAULT_CHILD_Y, DEFAULT_CHILD_W, DEFAULT_CHILD_H } from '../types';
import { ChildEditorModal } from './ChildEditorModal';

export class WidgetEditorModal extends Modal {
  private tabs: TabPage[] = [];
  private activeTabIdx = 0;
  private showTabs = false;
  private tabPosition = 'top';
  private freeformPositions: Record<string, { x: number; y: number; w: number; h: number }> = {};
  private freeformPreviewEl: HTMLElement | null = null;
  private freeformAutoHeight = true;
  private heightInputEl: HTMLInputElement | null = null;
  private editingStyle: WidgetStyle = {};

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

    // Initialize tabs from existing data
    if (existing?.settings?.tabs) {
      this.tabs = JSON.parse(JSON.stringify((existing.settings as any).tabs ?? []));
      this.showTabs = (existing.settings as any).showTabs ?? false;
      this.tabPosition = (existing.settings as any).tabPosition ?? 'top';
    } else {
      const flatChildren = existing?.children ? [...existing.children] : [];
      const flatPositions = existing?.settings?.childPositions
        ? JSON.parse(JSON.stringify(existing.settings.childPositions))
        : {};
      this.tabs = [{ name: t('tab-default-name').replace('{n}', '1'), children: flatChildren, childPositions: flatPositions }];
      this.showTabs = false;
      this.tabPosition = 'top';
    }
    if (!this.tabs.length) {
      this.tabs = [{ name: t('tab-default-name').replace('{n}', '1'), children: [], childPositions: {} }];
    }
    this.activeTabIdx = 0;

    let name = existing?.name ?? '';
    let editingSettings: Record<string, any> = existing?.settings ? { ...existing.settings } : {};
    const editingStyle: WidgetStyle = existing?.style ? JSON.parse(JSON.stringify(existing.style)) : {};
    this.editingStyle = editingStyle;
    this.freeformAutoHeight = !editingStyle.height;

    const saveActivePositions = () => {
      if (this.tabs[this.activeTabIdx]) {
        this.tabs[this.activeTabIdx].childPositions = JSON.parse(JSON.stringify(this.freeformPositions));
      }
    };

    const syncPositionsFromTab = () => {
      const p = this.tabs[this.activeTabIdx]?.childPositions;
      this.freeformPositions = p ? JSON.parse(JSON.stringify(p)) : {};
    };
    syncPositionsFromTab();

    const renderFull = () => {
      saveActivePositions();
      contentEl.empty();
      contentEl.addClass('xyw-editor-modal');

      // Name
      new Setting(contentEl)
        .setName(t('label-name'))
        .addText(tc => tc.setValue(name).onChange(v => { name = v; }));

      // Show tabs toggle
      new Setting(contentEl)
        .setName(t('label-show-tabs'))
        .addToggle(tc => tc.setValue(this.showTabs).onChange(v => {
          this.showTabs = v;
          renderFull();
        }));

      if (this.showTabs) {
        // Tab position dropdown
        new Setting(contentEl)
          .setName(t('label-tab-position'))
          .addDropdown(dd => {
            dd.addOption('top', t('tab-position-top'));
            dd.addOption('left', t('tab-position-left'));
            dd.addOption('right', t('tab-position-right'));
            dd.addOption('bottom', t('tab-position-bottom'));
            dd.setValue(this.tabPosition);
            dd.onChange(v => { this.tabPosition = v; });
          });

        // Tab bar
        const tabBarRow = contentEl.createEl('div', { cls: 'xyw-tab-editor-bar' });
        for (let i = 0; i < this.tabs.length; i++) {
          const tabBtn = tabBarRow.createEl('div', {
            cls: `xyw-tab-editor-btn${i === this.activeTabIdx ? ' xyw-tab-editor-active' : ''}`,
            text: this.tabs[i].name,
          });
          tabBtn.addEventListener('click', () => {
            this.activeTabIdx = i;
            syncPositionsFromTab();
            renderFull();
          });
        }
        new ButtonComponent(tabBarRow)
          .setIcon('plus')
          .setTooltip(t('btn-add-tab'))
          .onClick(() => {
            const n = this.tabs.length + 1;
            this.tabs.push({ name: t('tab-default-name').replace('{n}', String(n)), children: [], childPositions: {} });
            this.activeTabIdx = this.tabs.length - 1;
            syncPositionsFromTab();
            renderFull();
          });

        // Tab rename & delete buttons for active tab (if >1 tab)
        if (this.tabs.length > 1) {
          const tabActions = contentEl.createEl('div', { cls: 'xyw-tab-editor-actions' });
          const activeTab = this.tabs[this.activeTabIdx];
          new Setting(tabActions)
            .setName(t('btn-rename'))
            .addText(tc => tc.setValue(activeTab.name).onChange(v => {
              activeTab.name = v;
            }));
          new ButtonComponent(tabActions)
            .setButtonText(t('btn-delete'))
            .onClick(() => {
              this.tabs.splice(this.activeTabIdx, 1);
              if (this.activeTabIdx >= this.tabs.length) this.activeTabIdx = this.tabs.length - 1;
              syncPositionsFromTab();
              renderFull();
            });
        }
      }

      // Child list for active tab
      const children = this.tabs[this.activeTabIdx]?.children ?? [];
      const listEl = contentEl.createEl('div', { cls: 'xyw-child-list' });
      const emptyEl = contentEl.createEl('p', { cls: 'xyw-empty-state', text: t('msg-no-children') });

      const refreshList = () => {
        listEl.empty();
        emptyEl.style.display = children.length ? 'none' : '';
        for (let i = 0; i < children.length; i++) {
          this.renderChildCard(listEl, children, i, refreshList);
        }
      };
      refreshList();

      // Freeform preview
      contentEl.createEl('h3', { text: t('freeform-preview') });
      this.freeformPreviewEl = contentEl.createEl('div', { cls: 'xyw-freeform-preview' });
      const previewHeight = this.freeformAutoHeight
        ? parseInt(this.calcFreeformHeight()) || 400
        : parseInt(editingStyle.height ?? '400') || 400;
      this.renderFreeformPreview(this.freeformPreviewEl, children, previewHeight);

      // Style section
      const styleSection = contentEl.createEl('div', { cls: 'xyw-style-section' });
      styleSection.createEl('h3', { text: t('style-content') });

      const hint = styleSection.createEl('div', { cls: 'xyw-freeform-hint', text: t('freeform-hint') });

      new Setting(styleSection)
        .setName(t('style-border-color'))
        .addText(tc => {
          tc.inputEl.type = 'color';
          tc.setValue(editingStyle?.borderColor ?? '')
          .onChange(v => {
            if (editingStyle) editingStyle.borderColor = v;
          });
        });
      const hParsed = (() => {
        if (!editingStyle?.height) return { num: '', unit: 'px' };
        const m = editingStyle.height.match(/^([\d.]+)\s*(px|%|em|rem|vw|vh)?$/);
        return m ? { num: m[1], unit: m[2] || 'px' } : { num: editingStyle.height, unit: '' };
      })();
      this.heightInputEl = null;
      new Setting(styleSection)
        .setName(t('style-height'))
        .addText(tc => {
          tc.inputEl.type = 'number';
          tc.inputEl.placeholder = this.freeformAutoHeight ? `auto (${this.calcFreeformHeight().replace(/px$/, '')})` : 'auto';
          tc.setValue(this.freeformAutoHeight ? '' : hParsed.num);
          this.heightInputEl = tc.inputEl;
          tc.onChange(v => {
            if (!editingStyle) return;
            editingStyle.height = v ? `${v}px` : '';
            this.freeformAutoHeight = !v;
            if (this.freeformPreviewEl)
              this.freeformPreviewEl.style.height = v ? `${v}px` : this.calcFreeformHeight();
            if (!v && this.heightInputEl)
              this.heightInputEl.placeholder = `auto (${this.calcFreeformHeight().replace(/px$/, '')})`;
          });
        })
        .addDropdown(dd => {
          dd.addOption('px', 'px');
          dd.setValue('px');
        });
      new Setting(styleSection)
        .setName(t('style-container-padding-right'))
        .addText(tc => {
          tc.inputEl.type = 'number';
          tc.inputEl.placeholder = '0';
          tc.setValue(editingStyle?.containerPaddingRight?.replace(/px$/, '') ?? '');
          tc.onChange(v => {
            if (!editingStyle) return;
            editingStyle.containerPaddingRight = v ? `${v}px` : '';
          });
        })
        .addDropdown(dd => {
          dd.addOption('px', 'px');
          dd.setValue('px');
        });

      // Bottom buttons
      const bottomRow = contentEl.createEl('div', { cls: 'xyw-bottom-row' });
      const leftGroup = bottomRow.createEl('div', { cls: 'xyw-bottom-left' });
      new ButtonComponent(leftGroup)
        .setButtonText(t('btn-new-widget'))
        .setCta()
        .onClick(async () => {
          const modal = new ChildEditorModal(this.app, this.store, null);
          const id = await modal.openAndGet();
          if (id) { children.push(id); refreshList(); renderFull(); }
        });
      new ButtonComponent(leftGroup)
        .setButtonText(t('btn-insert-ref'))
        .onClick((event) => {
          const leaves = this.store.getLeafWidgets();
          if (leaves.length === 0) { new Notice(t('msg-no-leaf-widgets')); return; }
          const menu = new Menu();
          for (const leaf of leaves) {
            menu.addItem((item) => {
              item.setTitle(`${leaf.name} (${t(`type-${leaf.type}`)})`);
              item.onClick(() => {
                children.push(leaf.id);
                refreshList(); renderFull();
              });
            });
          }
          menu.showAtMouseEvent(event);
        });
      new ButtonComponent(leftGroup)
        .setButtonText(t('btn-duplicate'))
        .onClick((event) => {
          const leaves = this.store.getLeafWidgets();
          if (leaves.length === 0) { new Notice(t('msg-no-leaf-widgets')); return; }
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
                  refreshList(); renderFull();
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
          if (!name.trim()) { new Notice(t('msg-name-required')); return; }

          // Flatten children from all tabs for the top-level children field
          const allChildren: string[] = [];
          for (const tab of this.tabs) {
            for (const cid of tab.children) {
              if (!allChildren.includes(cid)) allChildren.push(cid);
            }
          }

          // Save positions back to active tab
          const activeTab = this.tabs[this.activeTabIdx];
          activeTab.childPositions = JSON.parse(JSON.stringify(this.freeformPositions));

          const data: any = {
            name: name.trim(),
            type: 'container',
            children: allChildren,
            settings: {
              ...editingSettings,
              showTabs: this.showTabs,
              tabPosition: this.tabPosition,
              tabs: this.tabs,
              _freeformVersion: 2,
            },
          };
          const styleToSave = editingStyle ? { ...editingStyle } : undefined;
          if (styleToSave && this.freeformAutoHeight) delete styleToSave.height;
          if (styleToSave && Object.keys(styleToSave).length > 0) data.style = styleToSave;

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

  // ── Child card rendering ──

  private renderChildCard(listEl: HTMLElement, children: string[], index: number, onRefresh: () => void): void {
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
            const origPos = this.freeformPositions[childDef.id];
            if (origPos) {
              const pw = this.freeformPreviewEl?.clientWidth ?? 600;
              const ph = this.freeformPreviewEl?.clientHeight ?? 400;
              const origWpx = (origPos.w / 100) * pw;
              this.freeformPositions[saved.id] = {
                x: Math.min(pw - origWpx, origPos.x + 20),
                y: Math.min(ph - origPos.h, origPos.y + 20),
                w: origPos.w,
                h: origPos.h,
              };
            }
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

    // Position inputs
    if (childDef) {
      const pos = this.freeformPositions[childId] ?? { x: DEFAULT_CHILD_X, y: DEFAULT_CHILD_Y, w: DEFAULT_CHILD_W, h: DEFAULT_CHILD_H };
      this.freeformPositions[childId] = pos;

      const posRow = card.createEl('div', { cls: 'xyw-freeform-pos-inputs' });
      posRow.setAttribute('data-child-id', childId);

      const UNIT = { x: 'px', y: 'px', w: '%', h: 'px' };

      const createPosInput = (labelKey: string, key: 'x' | 'y' | 'w' | 'h', min: number, max: number, defaultVal: number) => {
        const lbl = posRow.createEl('label');
        lbl.textContent = t(labelKey);
        const inp = lbl.createEl('input', { type: 'number', attr: { min: String(min), max: String(max) } });
        inp.value = String(Math.round(pos[key]));
        lbl.createSpan({ text: UNIT[key] });
        inp.addEventListener('input', () => {
          const raw = inp.value === '' ? defaultVal : Number(inp.value);
          pos[key] = Math.max(min, Math.min(max, raw));
          const children = this.tabs[this.activeTabIdx]?.children ?? [];
          const pw = this.freeformPreviewEl?.clientWidth ?? 600;
          const ph = this.freeformPreviewEl?.clientHeight ?? 400;
          this.resolveOverlap(childId, pos, children, pw, ph);
          inp.value = String(Math.round(pos[key]));
          if (this.freeformPreviewEl) this.renderFreeformPreview(this.freeformPreviewEl, children);
          this.syncFreeformHeight();
        });
        return inp;
      };

      createPosInput('freeform-x', 'x', 0, 99999, 10);
      createPosInput('freeform-y', 'y', 0, 99999, 10);
      createPosInput('freeform-w', 'w', 0, 100, 100);
      createPosInput('freeform-h', 'h', 0, 99999, 15);
    }
  }

  // ── Overlap / position utilities ──

  private overlaps(
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
    cw: number
  ): boolean {
    const aw = (a.w / 100) * cw;
    const bw = (b.w / 100) * cw;
    return a.x < b.x + bw && a.x + aw > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  private resolveOverlap(
    selfId: string,
    pos: { x: number; y: number; w: number; h: number },
    children: string[],
    cw: number,
    ch: number
  ): void {
    for (let iter = 0; iter < 5; iter++) {
      let anyOverlap = false;
      for (const childId of children) {
        if (childId === selfId) continue;
        const cp = this.freeformPositions[childId];
        if (!cp) continue;
        if (!this.overlaps(pos, cp, cw)) continue;
        anyOverlap = true;

        const cpw = (cp.w / 100) * cw;
        const pw = (pos.w / 100) * cw;

        const rightX = cp.x + cpw;
        if (rightX + pw <= cw) {
          pos.x = rightX;
          continue;
        }

        const leftX = cp.x - pw;
        if (leftX >= 0) {
          pos.x = leftX;
          continue;
        }

        const downY = cp.y + cp.h;
        pos.y = downY;

        if (pos.x + pw > cw) {
          pos.w = ((cw - pos.x) / cw) * 100;
        }
      }
      if (!anyOverlap) break;
    }
  }

  private ensurePositions(children: string[]): void {
    for (const id of children) {
      if (!this.freeformPositions[id]) {
        this.freeformPositions[id] = { x: DEFAULT_CHILD_X, y: DEFAULT_CHILD_Y, w: DEFAULT_CHILD_W, h: DEFAULT_CHILD_H };
      }
    }
  }

  private calcFreeformHeight(): string {
    const positions = Object.values(this.freeformPositions);
    if (!positions.length) return '400px';
    const maxBottom = Math.max(...positions.map(p => p.y + p.h));
    if (maxBottom <= 0) return '400px';
    const height = Math.max(10, Math.ceil(maxBottom));
    return `${height}px`;
  }

  private renderFreeformPreview(previewEl: HTMLElement, children: string[], containerHeight?: number): void {
    previewEl.empty();
    if (!children.length) return;

    this.ensurePositions(children);
    const height = containerHeight ?? (parseInt(previewEl.style.height) || 400);
    previewEl.style.height = height + 'px';

    for (let i = 0; i < children.length; i++) {
      const childId = children[i];
      const childDef = this.store.getWidget(childId);
      const pos = this.freeformPositions[childId] ?? { x: DEFAULT_CHILD_X, y: DEFAULT_CHILD_Y, w: DEFAULT_CHILD_W, h: DEFAULT_CHILD_H };
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
          startX: e.clientX, startY: e.clientY,
          origX: pos.x, origY: pos.y, origW: pos.w, origH: pos.h,
        };

        const onMove = (ev: MouseEvent) => {
          if (!dragData) return;
          const dx = ev.clientX - dragData.startX;
          const dy = ev.clientY - dragData.startY;
          pos.x = Math.max(0, Math.min(cw - (pos.w / 100) * cw, dragData.origX + dx));
          pos.y = Math.max(0, Math.min(ch - pos.h, dragData.origY + dy));
          this.resolveOverlap(childId, pos, children, cw, ch);
          dragData.origX = pos.x;
          dragData.origY = pos.y;
          dragData.startX = ev.clientX;
          dragData.startY = ev.clientY;
          this.updatePreviewBlockStyle(block, pos);
          this.syncFreeformInputs(childId, pos);
          this.syncFreeformHeight();
        };

        const onUp = () => { cleanUp(); };

        const cleanUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          window.removeEventListener('blur', cleanUp);
          block.removeClass('xyw-dragging');
          dragData = null;
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        window.addEventListener('blur', cleanUp);
      });

      // Resize handle
      const resizeHandle = block.createEl('div', { cls: 'xyw-freeform-resize-handle' });
      resizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const cw = previewEl.clientWidth;
        const ch = previewEl.clientHeight;
        if (!cw || !ch) return;

        let startX = e.clientX, startY = e.clientY;
        let origW = pos.w, origH = pos.h;

        const onMove = (ev: MouseEvent) => {
          const dw = ((ev.clientX - startX) / cw) * 100;
          const dy = ev.clientY - startY;
          pos.w = Math.max(0, Math.min(100 - (pos.x / cw) * 100, origW + dw));
          pos.h = Math.max(0, Math.min(ch - pos.y, origH + dy));
          for (const otherId of children) {
            if (otherId === childId) continue;
            const cp = this.freeformPositions[otherId];
            if (!cp || !this.overlaps(pos, cp, cw)) continue;
            if (pos.x < cp.x) pos.w = Math.min(pos.w, ((cp.x - pos.x) / cw) * 100);
            if (pos.y < cp.y) pos.h = Math.min(pos.h, cp.y - pos.y);
          }
          pos.w = Math.max(0, pos.w);
          pos.h = Math.max(0, pos.h);
          origW = pos.w;
          origH = pos.h;
          startX = ev.clientX;
          startY = ev.clientY;
          this.updatePreviewBlockStyle(block, pos);
          this.syncFreeformInputs(childId, pos);
          this.syncFreeformHeight();
        };

        const onUp = () => { cleanUp(); };

        const cleanUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          window.removeEventListener('blur', cleanUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        window.addEventListener('blur', cleanUp);
      });
    }
  }

  private updatePreviewBlockStyle(block: HTMLElement, pos: { x: number; y: number; w: number; h: number }): void {
    block.style.left = pos.x + 'px';
    block.style.top = pos.y + 'px';
    block.style.width = pos.w + '%';
    block.style.height = pos.h + 'px';
  }

  private syncFreeformHeight(): void {
    if (!this.freeformAutoHeight) return;
    const height = this.calcFreeformHeight();
    const num = height.replace(/px$/, '');
    if (this.heightInputEl) this.heightInputEl.placeholder = `auto (${num})`;
    if (this.freeformPreviewEl) this.freeformPreviewEl.style.height = height;
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
    FocusManager.restoreEditorFocus(this.app);
    this.contentEl.empty();
  }
}
