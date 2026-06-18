import { App, PluginSettingTab, Setting, Notice, ButtonComponent, Modal } from 'obsidian';
import type WidgetPlugin from './main';
import { WidgetStore } from './store/WidgetStore';
import { t, t2 } from './i18n';
import { WidgetEditorModal, isContainerType } from './modals';
import { scanWidgetReferences } from './utils/ReferenceScanner';

export class WidgetSettingTab extends PluginSettingTab {
  private filterText = '';

  constructor(app: App, private plugin: WidgetPlugin, private store: WidgetStore) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: t('settings-widget-mgr') });
    new Setting(containerEl).setDesc(t('codeblock-hint'));

    new Setting(containerEl)
      .addButton(btn => btn
        .setButtonText(t('btn-new-widget'))
        .setCta()
        .onClick(() => {
          new WidgetEditorModal(this.app, this.plugin, this.store, null, () => this.display()).open();
        }))
      .addButton(btn => btn
        .setButtonText(t('btn-export'))
        .onClick(() => {
          const data = this.store.exportWidgets();
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'xiaoyuan-widgets.json';
          a.click();
          URL.revokeObjectURL(a.href);
        }))
      .addButton(btn => btn
        .setButtonText(t('btn-import'))
        .onClick(() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json';
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
              const text = await file.text();
              const data = JSON.parse(text);
              const arr = Array.isArray(data) ? data : data.widgets ?? [];
              if (!arr.length) { new Notice('No valid widgets found.'); return; }
              const count = await this.store.importWidgets(arr);
              new Notice(t2('msg-import-success', { n: String(count) }));
              this.display();
            } catch (e) { new Notice('Import failed: ' + e.message); }
          };
          input.click();
        }));

    new Setting(containerEl)
      .addSearch(cb => cb
        .setPlaceholder('Search widgets...')
        .setValue(this.filterText)
        .onChange(v => {
          this.filterText = v.toLowerCase();
          this.display();
        }));

    let widgets = this.store.getWidgets();
    if (this.filterText) {
      widgets = widgets.filter(w =>
        w.name.toLowerCase().includes(this.filterText) ||
        w.id.toLowerCase().includes(this.filterText) ||
        t(`type-${w.type}`).toLowerCase().includes(this.filterText)
      );
    }
    if (!widgets.length) {
      containerEl.createEl('p', { cls: 'xyw-empty-state', text: this.filterText ? 'No matching widgets.' : t('label-no-widgets') });
      return;
    }

    const list = containerEl.createEl('div', { cls: 'xyw-widget-list' });
    for (const w of widgets) {
      const item = list.createEl('div', { cls: 'xyw-widget-card' });
      const info = item.createEl('div', { cls: 'xyw-widget-info' });
      const parts = [t(`type-${w.type}`), w.id];
      if (w.children?.length) parts.push(`[${w.children.length}]`);
      info.createEl('div', { cls: 'xyw-widget-name', text: w.name });
      info.createEl('div', { cls: 'xyw-widget-meta', text: parts.join(' · ') });
      const actions = item.createEl('div', { cls: 'xyw-widget-actions' });
      new ButtonComponent(actions)
        .setIcon('clipboard-copy')
        .setTooltip('Copy code block')
        .onClick(() => {
          navigator.clipboard.writeText(`\`\`\`xiaoyuanwidget\nid: ${w.id}\n\`\`\``)
            .then(() => new Notice(t('msg-copied')));
        });
      new ButtonComponent(actions)
        .setIcon('search')
        .setTooltip(t('label-find-references'))
        .onClick(async () => {
          const refs = await scanWidgetReferences(this.app, w.id);
          const refCount = refs.length;
          if (!refCount) {
            new Notice(t('label-no-widgets'));
            return;
          }
          const modal = new Modal(this.app);
          modal.contentEl.createEl('h3', { text: `${t('label-find-references')} — ${w.name}` });
          const list = modal.contentEl.createEl('div', { cls: 'xyw-widget-list' });
          for (const ref of refs) {
            list.createEl('div', { cls: 'xyw-widget-card', text: ref.filePath });
          }
          modal.open();
        });
      new ButtonComponent(actions)
        .setIcon('pencil')
        .setTooltip(t('btn-edit'))
        .onClick(() => {
          new WidgetEditorModal(this.app, this.plugin, this.store, w.id, () => this.display()).open();
        });
      new ButtonComponent(actions)
        .setIcon('trash-2')
        .setTooltip(t('btn-delete'))
        .onClick(async () => {
          if (confirm(t2('msg-confirm-delete', { name: w.name }))) {
            await this.store.deleteWidget(w.id);
            this.display();
          }
        });
    }
  }
}