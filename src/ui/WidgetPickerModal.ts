import { App, Modal } from 'obsidian';
import { WidgetStore } from '../store/WidgetStore';
import { t } from '../i18n';
import { WidgetDefinition } from '../types';
import { isContainerType } from '../modals/_shared';
import type WidgetPlugin from '../main';
import { WidgetEditorModal, ChildEditorModal } from '../modals';

export class WidgetPickerModal extends Modal {
  private store: WidgetStore;
  private plugin: WidgetPlugin;
  private onInsert: (id: string) => void;
  private filterText = '';

  constructor(app: App, plugin: WidgetPlugin, store: WidgetStore, onInsert: (id: string) => void) {
    super(app);
    this.plugin = plugin;
    this.store = store;
    this.onInsert = onInsert;
  }

  onOpen(): void {
    this.render();
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('xyw-picker-modal');

    const titleRow = contentEl.createEl('div', { cls: 'xyw-picker-title-row' });
    titleRow.createEl('h2', { text: t('title-pick-widget') });

    const toolbar = contentEl.createEl('div', { cls: 'xyw-picker-toolbar' });
    const newContainerBtn = toolbar.createEl('button', { cls: 'xyw-picker-btn-primary', text: t('btn-new-container') });
    newContainerBtn.addEventListener('click', () => {
      const modal = new WidgetEditorModal(this.app, this.plugin, this.store, null, (widget) => {
        if (widget) { this.onInsert(widget.id); this.close(); }
      });
      modal.open();
    });

    const newLeafBtn = toolbar.createEl('button', { cls: 'xyw-picker-btn', text: t('btn-new-leaf') });
    newLeafBtn.addEventListener('click', async () => {
      const temp = await this.store.addWidget({ name: t('type-stats-card'), type: 'stats-card', settings: {} });
      const modal = new ChildEditorModal(this.app, this.store, temp.id);
      const id = await modal.openAndGet();
      if (id) { this.onInsert(id); this.close(); }
    });

    const searchInput = contentEl.createEl('input', {
      cls: 'xyw-picker-search',
      attr: { placeholder: t('label-filter') },
    });
    searchInput.addEventListener('input', () => {
      this.filterText = searchInput.value.toLowerCase();
      this.renderList();
    });

    const listContainer = contentEl.createEl('div', { cls: 'xyw-picker-list' });
    this.renderListInto(listContainer);
  }

  private renderListInto(container: HTMLElement): void {
    container.empty();

    let widgets = this.store.getWidgets();
    if (this.filterText) {
      widgets = widgets.filter(w =>
        w.name.toLowerCase().includes(this.filterText) ||
        w.id.toLowerCase().includes(this.filterText) ||
        t(`type-${w.type}`).toLowerCase().includes(this.filterText)
      );
    }

    const containers = widgets.filter(w => isContainerType(w.type));
    const leaves = widgets.filter(w => !isContainerType(w.type));

    if (containers.length > 0) {
      container.createEl('div', { cls: 'xyw-picker-group-title', text: t('label-widget-list') });
      for (const w of containers) this.renderCard(container, w);
    }

    if (leaves.length > 0) {
      container.createEl('div', { cls: 'xyw-picker-group-title', text: t('label-child-list') });
      for (const w of leaves) this.renderCard(container, w);
    }

    if (!widgets.length) {
      container.createEl('p', { cls: 'xyw-empty-state', text: this.filterText ? 'No matching widgets.' : t('label-no-widgets') });
    }
  }

  private renderList(): void {
    const listContainer = this.contentEl.querySelector('.xyw-picker-list') as HTMLElement;
    if (listContainer) this.renderListInto(listContainer);
  }

  private renderCard(container: HTMLElement, w: WidgetDefinition): void {
    const card = container.createEl('div', { cls: 'xyw-picker-card' });
    const info = card.createEl('div', { cls: 'xyw-picker-card-info' });
    info.createEl('div', { cls: 'xyw-picker-card-name', text: w.name });
    info.createEl('div', { cls: 'xyw-picker-card-type', text: t(`type-${w.type}`) });

    const actions = card.createEl('div', { cls: 'xyw-picker-card-actions' });

    const insertBtn = actions.createEl('button', { cls: 'xyw-picker-card-btn', text: t('btn-insert-ref') });
    insertBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onInsert(w.id);
      this.close();
    });

    const dupBtn = actions.createEl('button', { cls: 'xyw-picker-card-btn', text: t('btn-duplicate') });
    dupBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const copy = JSON.parse(JSON.stringify(w));
      delete copy.id; delete copy.createdAt; delete copy.updatedAt;
      const saved = await this.store.addWidget(copy);
      if (!isContainerType(w.type)) {
        const modal = new ChildEditorModal(this.app, this.store, saved.id);
        const id = await modal.openAndGet();
        if (id) { this.onInsert(id); this.close(); }
      } else {
        new WidgetEditorModal(this.app, this.plugin, this.store, saved.id, (widget) => {
          if (widget) { this.onInsert(widget.id); this.close(); }
        }).open();
      }
    });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}