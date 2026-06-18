import { App, Modal, Setting, Notice, ButtonComponent, Menu } from 'obsidian';
import type WidgetPlugin from '../main';
import { WidgetStore } from '../store/WidgetStore';
import { t } from '../i18n';
import { getAllWidgetMetas } from '../widgets/registry';
import { WidgetDefinition, AnyWidgetType } from '../types';
import { isContainerType } from './_shared';
import { ChildEditorModal } from './ChildEditorModal';

export class WidgetEditorModal extends Modal {
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

    let name = existing?.name ?? '';
    let type: AnyWidgetType = (existing?.type as AnyWidgetType) ?? 'container-row';
    let children: string[] = existing?.children ? [...existing.children] : [];

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
            renderFull();
          });
        });

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
          if (leaves.length === 0) { new Notice('暂无子部件'); return; }
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
          if (leaves.length === 0) { new Notice('暂无子部件'); return; }
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
        children.splice(index, 1);
        onRefresh();
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}