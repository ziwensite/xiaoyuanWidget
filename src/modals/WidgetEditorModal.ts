import { App, Modal, Setting, Notice, ButtonComponent } from 'obsidian';
import type WidgetPlugin from '../main';
import { WidgetStore } from '../store/WidgetStore';
import { t } from '../i18n';
import { getAllWidgetMetas } from '../widgets/registry';
import { WidgetDefinition, ChildWidgetConfig, AnyWidgetType } from '../types';
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
    let children: ChildWidgetConfig[] = existing?.children ? JSON.parse(JSON.stringify(existing.children)) : [];

    new Setting(contentEl)
      .setName(t('label-name'))
      .addText(tc => tc
        .setValue(name)
        .onChange(v => { name = v; }));

    const dynamicSectionEl = contentEl.createEl('div');
    let refreshChildren: (() => void) | null = null;
    refreshChildren = this.renderDynamicSection(dynamicSectionEl, type, children, (v) => { type = v as AnyWidgetType; });

    const bottomRow = contentEl.createEl('div', { cls: 'xyw-bottom-row' });
    new ButtonComponent(bottomRow)
      .setButtonText(t('btn-add-child'))
      .setCta()
      .onClick(async () => {
        const modal = new ChildEditorModal(this.app, null);
        const result = await modal.openAndGet();
        if (result) { children.push(result); refreshChildren?.(); }
      });

    const rightGroup = bottomRow.createEl('div', { cls: 'xyw-bottom-right' });
    new ButtonComponent(rightGroup)
      .setButtonText(t('btn-save'))
      .setCta()
      .onClick(async () => {
          if (!name.trim()) { new Notice('Name is required'); return; }
          const data: any = { name: name.trim(), type, settings: {} };
          if (isContainerType(type)) data.children = children;
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
  }

  private renderDynamicSection(container: HTMLElement, type: AnyWidgetType, children: ChildWidgetConfig[], onTypeChange?: (v: string) => void): (() => void) | null {
    container.empty();

    if (!isContainerType(type)) return null;

    const headerRow = container.createEl('div', { cls: 'xyw-section-header' });
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
          onTypeChange?.(v);
        });
      });

    const listEl = container.createEl('div', { cls: 'xyw-child-list' });
    const emptyEl = container.createEl('p', { cls: 'xyw-empty-state', text: t('msg-no-children') });

        const refreshList = () => {
      listEl.empty();
      emptyEl.style.display = children.length ? 'none' : '';
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const card = listEl.createEl('div', { cls: 'xyw-child-card-simple' });
        card.draggable = true;
        card.addEventListener('dragstart', (e) => {
          e.dataTransfer?.setData('text/plain', String(i));
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
          if (from >= 0 && from !== i) {
            const [item] = children.splice(from, 1);
            const to = from < i ? i - 1 : i;
            children.splice(to, 0, item);
            refreshList();
          }
        });
        const label = card.createEl('span', {
          cls: 'xyw-child-label-simple',
          text: `${i + 1}. ${child.name} (${t(`type-${child.type}`)})`,
        });
        const acts = card.createEl('div', { cls: 'xyw-child-actions-simple' });
        this.addChildActions(acts, children, i, listEl);
      }
    };
    refreshList();

    return refreshList;
  }

  private addChildActions(acts: HTMLElement, children: ChildWidgetConfig[], i: number, listEl: HTMLElement): void {
    const refreshList = () => {
      listEl.empty();
      for (let j = 0; j < children.length; j++) {
        const child = children[j];
        const card = listEl.createEl('div', { cls: 'xyw-child-card-simple' });
        card.draggable = true;
        card.addEventListener('dragstart', (e) => {
          e.dataTransfer?.setData('text/plain', String(j));
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
          if (from >= 0 && from !== j) {
            const [item] = children.splice(from, 1);
            const to = from < j ? j - 1 : j;
            children.splice(to, 0, item);
            refreshList();
          }
        });
        const label = card.createEl('span', {
          cls: 'xyw-child-label-simple',
          text: `${j + 1}. ${child.name} (${t(`type-${child.type}`)})`,
        });
        const acts2 = card.createEl('div', { cls: 'xyw-child-actions-simple' });
        this.addChildActions(acts2, children, j, listEl);
      }
    };
    new ButtonComponent(acts)
      .setIcon('copy')
      .setTooltip('Duplicate')
      .onClick(() => {
        const copy = JSON.parse(JSON.stringify(children[i]));
        children.splice(i + 1, 0, copy);
        refreshList();
      });
    new ButtonComponent(acts)
      .setIcon('pencil')
      .setTooltip(t('btn-edit'))
      .onClick(async () => {
        const modal = new ChildEditorModal(this.app, children[i]);
        const result = await modal.openAndGet();
        if (result) { children[i] = result; refreshList(); }
      });
    new ButtonComponent(acts)
      .setIcon('trash-2')
      .setTooltip(t('btn-delete'))
      .onClick(() => {
        children.splice(i, 1);
        refreshList();
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
