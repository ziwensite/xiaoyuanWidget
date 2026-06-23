import { App, PluginSettingTab, Setting, Notice, ButtonComponent, Modal } from 'obsidian';
import type WidgetPlugin from './main';
import { WidgetStore } from './store/WidgetStore';
import { t, t2 } from './i18n';
import { WidgetEditorModal, ChildEditorModal } from './modals';
import { isLeafType } from './modals/_shared';
import { scanWidgetReferences } from './utils/ReferenceScanner';

export class WidgetSettingTab extends PluginSettingTab {
  private filterText = '';
  private contentDiv: HTMLElement | null = null;

  constructor(app: App, private plugin: WidgetPlugin, private store: WidgetStore) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    this.contentDiv = null;

    new Setting(containerEl)
      .setName(t('settings-widget-mgr'))
      .setDesc(t('codeblock-hint'))
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

    const searchInput = containerEl.createEl('input', {
      cls: 'xyw-picker-search',
      attr: { placeholder: t('label-filter') },
    });
    searchInput.value = this.filterText;
    searchInput.addEventListener('input', () => {
      this.filterText = searchInput.value.toLowerCase();
      this.renderContent();
    });

    this.contentDiv = containerEl.createEl('div');
    this.renderContent();
  }

  private renderContent(): void {
    if (!this.contentDiv) return;
    this.contentDiv.empty();

    const filterWidget = (w: any) => {
      if (!this.filterText) return true;
      return w.name.toLowerCase().includes(this.filterText) ||
        w.id.toLowerCase().includes(this.filterText) ||
        t(`type-${w.type}`).toLowerCase().includes(this.filterText);
    };

    const containers = this.store.getContainerWidgets().filter(filterWidget);
    const leaves = this.store.getLeafWidgets().filter(filterWidget);

    if (containers.length === 0 && leaves.length === 0) {
      this.contentDiv.createEl('p', { cls: 'xyw-empty-state', text: this.filterText ? 'No matching widgets.' : t('label-no-widgets') });
      return;
    }

    if (containers.length > 0) {
      const containerHeader = this.contentDiv.createEl('div', { cls: 'xyw-section-header' });
      containerHeader.createEl('h3', { text: `\u{1F4E6} ${t('label-container')}` });
      new ButtonComponent(containerHeader)
        .setButtonText('新建')
        .setCta()
        .onClick(() => {
          new WidgetEditorModal(this.app, this.plugin, this.store, null, () => this.display()).open();
        });
      const list = this.contentDiv.createEl('div', { cls: 'xyw-widget-list' });
      for (const w of containers) {
        this.renderWidgetCard(list, w);
      }
    }

    if (leaves.length > 0) {
      const leafHeader = this.contentDiv.createEl('div', { cls: 'xyw-section-header' });
      leafHeader.createEl('h3', { text: `\u{1F331} ${t('label-leaf')}` });
      new ButtonComponent(leafHeader)
        .setButtonText('新建')
        .setCta()
        .onClick(async () => {
          const modal = new ChildEditorModal(this.app, this.store, null);
          await modal.openAndGet();
          this.display();
        });
      const list = this.contentDiv.createEl('div', { cls: 'xyw-widget-list' });
      for (const w of leaves) {
        this.renderWidgetCard(list, w);
      }
    }
  }

  private renderWidgetCard(list: HTMLElement, w: any): void {
    const item = list.createEl('div', { cls: 'xyw-widget-card' });
    const info = item.createEl('div', { cls: 'xyw-widget-info' });
    const parts = [t(`type-${w.type}`), w.id];
    if (w.children?.length) parts.push(`[${w.children.length}]`);
    if (isLeafType(w.type)) {
      const refs = this.store.getReferencingContainers(w.id);
      if (refs.length > 0) parts.push(`[${refs.length}]`);
    }
    info.createEl('div', { cls: 'xyw-widget-name', text: w.name });
    info.createEl('div', { cls: 'xyw-widget-meta', text: parts.join(' \u00b7 ') });

    const actions = item.createEl('div', { cls: 'xyw-widget-actions' });
    new ButtonComponent(actions)
      .setIcon('link')
      .setTooltip(t('context-reference-wgt'))
      .onClick(() => {
        navigator.clipboard.writeText(`\`\`\`xiaoyuanwidget\nid: ${w.id}\n\`\`\``)
          .then(() => new Notice(t('msg-copied')));
      });
    new ButtonComponent(actions)
      .setIcon('copy')
      .setTooltip(t('btn-duplicate'))
      .onClick(async () => {
        const copy = JSON.parse(JSON.stringify(w));
        delete copy.id; delete copy.createdAt; delete copy.updatedAt;
        copy.name = w.name + ' 副本';
        await this.store.addWidget(copy);
        this.display();
      });
    new ButtonComponent(actions)
      .setIcon('search')
      .setTooltip(t('label-find-references'))
      .onClick(async () => {
        const refs = await scanWidgetReferences(this.app, w.id);
        const refCount = refs.length;
        if (!refCount) {
          new Notice(t('msg-no-references'));
          return;
        }
        const modal = new Modal(this.app);
        modal.contentEl.createEl('h3', { text: `${t('label-find-references')} \u2014 ${w.name}` });
        const list = modal.contentEl.createEl('div', { cls: 'xyw-widget-list' });
        for (const ref of refs) {
          list.createEl('div', { cls: 'xyw-widget-card', text: ref.filePath });
        }
        modal.open();
      });
        if (isLeafType(w.type)) {
          new ButtonComponent(actions)
            .setIcon('pencil')
            .setTooltip(t('btn-edit'))
            .onClick(async () => {
              const modal = new ChildEditorModal(this.app, this.store, w.id);
              await modal.openAndGet();
              this.display();
            });
        } else {
          new ButtonComponent(actions)
            .setIcon('pencil')
            .setTooltip(t('btn-edit'))
            .onClick(() => {
              new WidgetEditorModal(this.app, this.plugin, this.store, w.id, () => this.display()).open();
            });
        }
    new ButtonComponent(actions)
      .setIcon('trash-2')
      .setTooltip(t('btn-delete'))
      .onClick(async () => {
        if (isLeafType(w.type)) {
          const refs = this.store.getReferencingContainers(w.id);
          if (refs.length > 0) {
            if (!confirm(t2('msg-delete-referenced', { name: w.name, n: String(refs.length) }))) return;
          } else {
            if (!confirm(t2('msg-confirm-delete', { name: w.name }))) return;
          }
        } else {
          if (!confirm(t2('msg-confirm-delete', { name: w.name }))) return;
        }
        await this.store.deleteWidget(w.id);
        this.display();
      });
  }
}