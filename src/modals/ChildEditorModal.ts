import { App, Modal, Setting, Notice } from 'obsidian';
import { t } from '../i18n';
import { getAllWidgetMetas, getWidgetMeta } from '../widgets/registry';
import { ChildWidgetConfig, AnyWidgetType } from '../types';
import { isContainerType, isLeafType } from './_shared';

export class ChildEditorModal extends Modal {
  private result: ChildWidgetConfig | null = null;
  private resolve: ((value: ChildWidgetConfig | null) => void) | null = null;
  private settingsContainerEl!: HTMLElement;

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
          if (isLeafType(m.type)) {
            dd.addOption(m.type, t(`type-${m.type}`));
          }
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
          this.renderSettings(type, settings);
        });
      });

    this.settingsContainerEl = contentEl.createEl('div');
    this.renderSettings(type, settings);

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

  private renderSettings(type: AnyWidgetType, settings: Record<string, any>): void {
    this.settingsContainerEl.empty();
    const meta = getWidgetMeta(type as any);
    if (!meta || meta.settingSchema.length === 0) return;

    this.settingsContainerEl.createEl('h3', { text: t('label-config') });
    for (const field of meta.settingSchema) {
      const setting = new Setting(this.settingsContainerEl).setName(t(field.labelKey));
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

  onClose(): void {
    this.contentEl.empty();
    if (this.resolve) this.resolve(this.result);
  }
}
