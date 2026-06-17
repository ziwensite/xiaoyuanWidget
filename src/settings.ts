import { App, PluginSettingTab, Setting, Modal, Notice, ButtonComponent } from 'obsidian';
import type WidgetPlugin from './main';
import { WidgetStore } from './store/WidgetStore';
import { getAllWidgetMetas, getWidgetMeta } from './widgets/registry';
import { t, t2 } from './i18n';
import { WidgetDefinition, ChildWidgetConfig, AnyWidgetType } from './types';

const CONTAINER_TYPES = new Set(['container-row', 'container-col', 'container-tab-h', 'container-tab-v']);

function isContainerType(type: string): boolean {
  return CONTAINER_TYPES.has(type);
}

class ChildEditorModal extends Modal {
  private result: ChildWidgetConfig | null = null;
  private resolve: ((value: ChildWidgetConfig | null) => void) | null = null;

  constructor(app: App, private existing: ChildWidgetConfig | null) {
    super(app);
  }

  async openAndGet(): Promise<ChildWidgetConfig | null> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('xyw-editor-modal');

    const isNew = !this.existing;
    contentEl.createEl('h2', { text: isNew ? t('btn-add-child') : t('btn-edit') });

    let name = this.existing?.name ?? '';
    let type: AnyWidgetType = (this.existing?.type as AnyWidgetType) ?? 'stats-card';
    let settings = this.existing?.settings ? { ...this.existing.settings } : {};
    let children: ChildWidgetConfig[] = this.existing?.children ? JSON.parse(JSON.stringify(this.existing.children)) : [];

    new Setting(contentEl)
      .setName(t('label-name'))
      .addText(tc => tc
        .setValue(name)
        .onChange(v => { name = v; }));

    new Setting(contentEl)
      .setName(t('label-type'))
      .addDropdown(dd => {
        for (const m of getAllWidgetMetas()) {
          dd.addOption(m.type, t(`type-${m.type}`));
        }
        dd.setValue(type);
        dd.onChange(v => {
          type = v as AnyWidgetType;
          settings = {};
          const meta = getWidgetMeta(type as any);
          if (meta) {
            for (const field of meta.settingSchema) {
              settings[field.key] = field.defaultValue;
            }
          }
          if (!isContainerType(type)) children = [];
          this.close();
          new ChildEditorModal(this.app, { name, type, settings, children: children.length ? children : undefined }).open();
        });
      });

    const meta = getWidgetMeta(type as any);
    if (meta && meta.settingSchema.length > 0) {
      contentEl.createEl('h3', { text: t('label-config') });
      for (const field of meta.settingSchema) {
        const setting = new Setting(contentEl).setName(t(field.labelKey));
        const currentVal = settings[field.key] ?? field.defaultValue;
        switch (field.type) {
          case 'text':
            setting.addText(tc => tc
              .setPlaceholder(field.placeholder ?? '')
              .setValue(String(currentVal))
              .onChange(v => { settings[field.key] = v; }));
            break;
          case 'number':
            setting.addText(t => {
              t.setPlaceholder(field.placeholder ?? '0');
              t.setValue(String(currentVal));
              t.inputEl.type = 'number';
              t.onChange(v => { settings[field.key] = Number(v) || 0; });
            });
            break;
          case 'textarea':
            setting.addTextArea(ta => ta
              .setPlaceholder(field.placeholder ?? '')
              .setValue(String(currentVal))
              .onChange(v => { settings[field.key] = v; }));
            break;
          case 'select':
            if (field.options) {
              setting.addDropdown(dd => {
                for (const opt of field.options!) dd.addOption(opt.value, opt.label);
                dd.setValue(String(currentVal));
                dd.onChange(v => { settings[field.key] = v; });
              });
            }
            break;
        }
      }
    }

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText(t('btn-save'))
        .setCta()
        .onClick(() => {
          if (!name.trim()) { new Notice('Name is required'); return; }
          this.result = { name: name.trim(), type, settings };
          if (isContainerType(type)) this.result.children = children;
          this.close();
        }))
      .addButton(btn => btn
        .setButtonText(t('btn-cancel'))
        .onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
    if (this.resolve) this.resolve(this.result);
  }
}

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

    contentEl.createEl('h2', { text: isNew ? t('title-new-widget') : t('title-edit-widget') });

    let name = existing?.name ?? '';
    let type: AnyWidgetType = (existing?.type as AnyWidgetType) ?? 'stats-card';
    let settings = existing?.settings ? { ...existing.settings } : {};
    let children: ChildWidgetConfig[] = existing?.children ? JSON.parse(JSON.stringify(existing.children)) : [];

    new Setting(contentEl)
      .setName(t('label-name'))
      .addText(tc => tc
        .setValue(name)
        .onChange(v => { name = v; }));

    if (isNew) {
      new Setting(contentEl)
        .setName(t('label-type'))
        .addDropdown(dd => {
          for (const m of getAllWidgetMetas()) {
            dd.addOption(m.type, t(`type-${m.type}`));
          }
          dd.setValue(type);
          dd.onChange(v => {
            type = v as AnyWidgetType;
            settings = {};
            const meta = getWidgetMeta(type as any);
            if (meta) for (const field of meta.settingSchema) settings[field.key] = field.defaultValue;
            if (!isContainerType(type)) children = [];
            this.close();
            new WidgetEditorModal(this.app, this.plugin, this.store, this.editId, this.onSaved).open();
          });
        });
    } else {
      new Setting(contentEl)
        .setName(t('label-type'))
        .setDesc(t(`type-${existing!.type}`));
    }

    if (isContainerType(type)) {
      contentEl.createEl('h3', { text: t('label-children') });

      if (!children.length) {
        contentEl.createEl('p', { cls: 'xyw-empty-state', text: t('msg-no-children') });
      }

      const listEl = contentEl.createEl('div', { cls: 'xyw-child-list' });

      const refreshList = () => {
        listEl.empty();
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          const card = listEl.createEl('div', { cls: 'xyw-child-card-simple' });
          const label = card.createEl('span', {
            cls: 'xyw-child-label-simple',
            text: `${i + 1}. ${child.name} (${t(`type-${child.type}`)})`,
          });
          const acts = card.createEl('div', { cls: 'xyw-child-actions-simple' });
          new ButtonComponent(acts)
            .setIcon('arrow-up')
            .setTooltip('Move up')
            .onClick(() => {
              if (i > 0) { [children[i - 1], children[i]] = [children[i], children[i - 1]]; refreshList(); }
            });
          new ButtonComponent(acts)
            .setIcon('arrow-down')
            .setTooltip('Move down')
            .onClick(() => {
              if (i < children.length - 1) { [children[i], children[i + 1]] = [children[i + 1], children[i]]; refreshList(); }
            });
          new ButtonComponent(acts)
            .setIcon('pencil')
            .setTooltip(t('btn-edit'))
            .onClick(async () => {
              const modal = new ChildEditorModal(this.app, child);
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
      };
      refreshList();

      new Setting(contentEl)
        .addButton(btn => btn
          .setButtonText(t('btn-add-child'))
          .setCta()
          .onClick(async () => {
            const modal = new ChildEditorModal(this.app, null);
            const result = await modal.openAndGet();
            if (result) { children.push(result); refreshList(); }
          }));
    }

    const meta = getWidgetMeta(type as any);
    if (meta && meta.settingSchema.length > 0) {
      contentEl.createEl('h3', { text: t('label-config') });
      for (const field of meta.settingSchema) {
        const setting = new Setting(contentEl).setName(t(field.labelKey));
        const currentVal = settings[field.key] ?? field.defaultValue;
        switch (field.type) {
          case 'text':
            setting.addText(tc => tc
              .setPlaceholder(field.placeholder ?? '')
              .setValue(String(currentVal))
              .onChange(v => { settings[field.key] = v; }));
            break;
          case 'number':
            setting.addText(t => {
              t.setPlaceholder(field.placeholder ?? '0');
              t.setValue(String(currentVal));
              t.inputEl.type = 'number';
              t.onChange(v => { settings[field.key] = Number(v) || 0; });
            });
            break;
          case 'textarea':
            setting.addTextArea(ta => ta
              .setPlaceholder(field.placeholder ?? '')
              .setValue(String(currentVal))
              .onChange(v => { settings[field.key] = v; }));
            break;
          case 'select':
            if (field.options) {
              setting.addDropdown(dd => {
                for (const opt of field.options!) dd.addOption(opt.value, opt.label);
                dd.setValue(String(currentVal));
                dd.onChange(v => { settings[field.key] = v; });
              });
            }
            break;
        }
      }
    }

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText(t('btn-save'))
        .setCta()
        .onClick(async () => {
          if (!name.trim()) { new Notice('Name is required'); return; }
          const data: any = { name: name.trim(), type, settings };
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
        }))
      .addButton(btn => btn
        .setButtonText(t('btn-cancel'))
        .onClick(() => this.close()));
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class WidgetSettingTab extends PluginSettingTab {
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

    const widgets = this.store.getWidgets();
    if (!widgets.length) {
      containerEl.createEl('p', { cls: 'xyw-empty-state', text: t('label-no-widgets') });
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