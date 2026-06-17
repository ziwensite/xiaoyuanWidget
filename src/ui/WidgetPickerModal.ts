import { App, Modal, Setting, Component } from 'obsidian';
import { WidgetStore } from '../store/WidgetStore';
import { t, getLang } from '../i18n';

export class WidgetPickerModal extends Modal {
  private store: WidgetStore;
  private onSelect: (id: string) => void;

  constructor(app: App, store: WidgetStore, onSelect: (id: string) => void) {
    super(app);
    this.store = store;
    this.onSelect = onSelect;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('xyw-picker-modal');

    contentEl.createEl('h2', { text: t('title-pick-widget') });

    const widgets = this.store.getWidgets();

    if (!widgets.length) {
      contentEl.createEl('p', { text: t('label-no-widgets') });
      return;
    }

    const list = contentEl.createEl('div', { cls: 'xyw-picker-list' });

    for (const w of widgets) {
      const item = list.createEl('div', { cls: 'xyw-picker-item' });
      item.createEl('span', { cls: 'xyw-picker-name', text: w.name });
      item.createEl('span', { cls: 'xyw-picker-type', text: t(`type-${w.type}`) });
      item.createEl('span', { cls: 'xyw-picker-id', text: w.id });

      item.addEventListener('click', () => {
        this.onSelect(w.id);
        this.close();
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}