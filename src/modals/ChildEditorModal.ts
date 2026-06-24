import { App, Modal, Setting, Notice, FuzzySuggestModal, Command, TFile } from 'obsidian';
import { t } from '../i18n';
import { FocusManager } from '../utils/FocusManager';
import { WidgetStore } from '../store/WidgetStore';
import { getAllWidgetMetas, getWidgetMeta } from '../widgets/registry';
import { AnyWidgetType, WidgetStyle, FilterRule, SettingField } from '../types';
import { isLeafType } from './_shared';

class CommandPickerModal extends FuzzySuggestModal<Command> {
  constructor(app: App, private onChooseCmd: (command: Command) => void) {
    super(app);
    this.setPlaceholder('Search commands...');
  }
  getItems(): Command[] {
    return (this.app as any).commands.listCommands();
  }
  getItemText(command: Command): string {
    return `${command.name} (${command.id})`;
  }
  onChooseItem(command: Command): void {
    this.onChooseCmd(command);
  }
}

class FilePickerModal extends FuzzySuggestModal<TFile> {
  constructor(app: App, private onChooseFile: (file: TFile) => void) {
    super(app);
    this.setPlaceholder('Search notes...');
  }
  getItems(): TFile[] {
    return this.app.vault.getMarkdownFiles();
  }
  getItemText(file: TFile): string {
    return file.path;
  }
  onChooseItem(file: TFile): void {
    this.onChooseFile(file);
  }
}

export class ChildEditorModal extends Modal {
  private result: string | null = null;
  private resolve: ((value: string | null) => void) | null = null;
  private editingName = '';
  private editingTitle = '';
  private editingType: AnyWidgetType = 'stats-card';
  private editingSettings: Record<string, any> = {};
  private editingStyle: WidgetStyle | undefined;
  private editingFilters: FilterRule[] = [];

  constructor(app: App, private store: WidgetStore, private widgetId: string | null) {
    super(app);
  }

  async openAndGet(): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.open();
    });
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('xyw-editor-modal');

    const existing = this.widgetId ? this.store.getWidget(this.widgetId) : null;

    this.editingName = existing?.name ?? '';
    this.editingTitle = existing?.title ?? '';
    this.editingType = (existing?.type as AnyWidgetType) ?? 'stats-card';
    this.editingSettings = existing?.settings ? { ...existing.settings } : {};
    this.editingStyle = existing?.style ? JSON.parse(JSON.stringify(existing.style)) : undefined;
    this.editingFilters = existing?.filters ? JSON.parse(JSON.stringify(existing.filters)) : [];

    const settingsSection = contentEl.createEl('div');
    const styleSection = contentEl.createEl('div');
    const filterSection = contentEl.createEl('div');

const renderAll = () => {
      this.renderSettings(settingsSection);
      this.renderTitleStyle(styleSection);
      this.renderContentStyle(styleSection);
      this.renderFilterSection(filterSection);
    };
    renderAll();

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText(t('btn-save'))
        .setCta()
        .onClick(async () => {
          if (!this.editingName.trim()) { new Notice('Name is required'); return; }
          const data: any = { name: this.editingName.trim(), type: this.editingType, settings: this.editingSettings, children: [] };
          data.title = this.editingTitle.trim();
          if (this.editingStyle && Object.keys(this.editingStyle).length > 0) data.style = this.editingStyle;
          data.filters = this.editingFilters;
          if (!existing) {
            const saved = await this.store.addWidget(data);
            this.result = saved.id;
          } else {
            await this.store.updateWidget(this.widgetId!, data);
            this.result = this.widgetId;
          }
          this.close();
        }))
      .addButton(btn => btn
        .setButtonText(t('btn-cancel'))
        .onClick(() => {
          this.result = null;
          this.close();
        }));
  }

  private renderSettings(container: HTMLElement): void {
    container.empty();
    container.createEl('h3', { text: t('label-config') });
    const card = container.createEl('div', { cls: 'xyw-style-section' });
    new Setting(card)
      .setName(t('label-name'))
      .addText(tc => tc
        .setValue(this.editingName)
        .onChange(v => { this.editingName = v; }));
    new Setting(card)
      .setName('标题')
      .addText(tc => tc
        .setValue(this.editingTitle)
        .onChange(v => { this.editingTitle = v; }));
    new Setting(card)
      .setName(t('label-type'))
      .addDropdown(dd => {
        for (const m of getAllWidgetMetas()) {
          if (isLeafType(m.type)) {
            dd.addOption(m.type, t(`type-${m.type}`));
          }
        }
        dd.setValue(this.editingType);
        dd.onChange(v => {
          this.editingType = v as AnyWidgetType;
          this.editingSettings = {};
          const meta = getWidgetMeta(this.editingType);
          if (meta) {
            for (const f of meta.settingSchema) {
              this.editingSettings[f.key] = f.defaultValue;
            }
          }
          this.renderSettings(container);
        });
      });

    const meta = getWidgetMeta(this.editingType);
    if (meta && meta.settingSchema.length > 0) {
      const depRenderers: Array<() => void> = [];
      const controlKeys = new Set<string>();
      for (const field of meta.settingSchema) {
        if (field.dependsOn) {
          controlKeys.add(field.dependsOn.field);
        }
      }

      for (const field of meta.settingSchema) {
        if (field.dependsOn) {
          const controlVal = this.editingSettings[field.dependsOn.field];
          if (!field.dependsOn.values.includes(controlVal)) {
            continue;
          }
        }

        const currentVal = this.editingSettings[field.key] ?? field.defaultValue;

        if (field.key === 'command') {
          const s = new Setting(card).setName(t(field.labelKey));
          s.addText(tc => tc
            .setPlaceholder(field.placeholder ?? '')
            .setValue(String(currentVal))
            .onChange(v => { this.editingSettings[field.key] = v; }));
          s.addButton(btn => btn
            .setButtonText('...')
            .setTooltip('Browse commands')
            .onClick(() => {
              new CommandPickerModal(this.app, (cmd) => {
                this.editingSettings[field.key] = cmd.id;
                this.renderSettings(container);
              }).open();
            }));
          continue;
        }

        if (field.key === 'notePath') {
          const s = new Setting(card).setName(t(field.labelKey));
          s.addText(tc => tc
            .setPlaceholder(field.placeholder ?? '')
            .setValue(String(currentVal))
            .onChange(v => { this.editingSettings[field.key] = v; }));
          s.addButton(btn => btn
            .setButtonText('...')
            .setTooltip('Browse notes')
            .onClick(() => {
              new FilePickerModal(this.app, (file) => {
                this.editingSettings[field.key] = file.path;
                this.renderSettings(container);
              }).open();
            }));
          continue;
        }

        switch (field.type) {
          case 'text':
            new Setting(card).setName(t(field.labelKey)).addText(tc => tc
              .setPlaceholder(field.placeholder ?? '')
              .setValue(String(currentVal))
              .onChange(v => { this.editingSettings[field.key] = v; }));
            break;
          case 'number':
            new Setting(card).setName(t(field.labelKey)).addText(t => {
              t.setPlaceholder(field.placeholder ?? '0');
              t.setValue(String(currentVal));
              t.inputEl.type = 'number';
              t.onChange(v => { this.editingSettings[field.key] = Number(v) || 0; });
            });
            break;
          case 'textarea': {
            const label = card.createEl('h4', { text: t(field.labelKey), cls: 'xyw-textarea-label' });
            const ta = card.createEl('textarea', { cls: 'xyw-full-textarea' });
            ta.value = String(currentVal);
            ta.placeholder = field.placeholder ?? '';
            ta.addEventListener('change', () => { this.editingSettings[field.key] = ta.value; });
            break;
          }
          case 'select':
            if (field.options) {
              const opts = field.options;
              new Setting(card).setName(t(field.labelKey)).addDropdown(dd => {
                for (const opt of opts) dd.addOption(opt.value, opt.label);
                dd.setValue(String(currentVal));
                dd.onChange(v => {
                  this.editingSettings[field.key] = v;
                  if (controlKeys.has(field.key)) {
                    this.renderSettings(container);
                  }
                });
              });
            }
            break;
        }
      }
    }
  }

  private renderTitleStyle(container: HTMLElement): void {
    container.empty();
    container.createEl('h3', { text: t('style-title') });
    const card = container.createEl('div', { cls: 'xyw-style-section' });

    new Setting(card)
      .setName(t('style-title-align'))
      .addDropdown(dd => {
        dd.addOption('left', t('style-align-left'));
        dd.addOption('center', t('style-align-center'));
        dd.addOption('right', t('style-align-right'));
        dd.setValue(this.editingStyle?.title?.align ?? 'left');
        dd.onChange(v => {
          if (!this.editingStyle) this.editingStyle = {};
          if (!this.editingStyle.title) this.editingStyle.title = {};
          this.editingStyle.title.align = v as 'left' | 'center' | 'right';
        });
      });

    new Setting(card)
      .setName(t('style-title-color'))
      .addText(tc => {
        tc.inputEl.type = 'color';
        tc.setValue(this.editingStyle?.title?.color ?? '')
        .onChange(v => {
          if (!this.editingStyle) this.editingStyle = {};
          if (!this.editingStyle.title) this.editingStyle.title = {};
          this.editingStyle.title.color = v;
        });
      });

    new Setting(card)
      .setName(t('style-title-bg'))
      .addText(tc => {
        tc.inputEl.type = 'color';
        tc.setValue(this.editingStyle?.title?.bgColor ?? '')
        .onChange(v => {
          if (!this.editingStyle) this.editingStyle = {};
          if (!this.editingStyle.title) this.editingStyle.title = {};
          this.editingStyle.title.bgColor = v;
        });
      });

    new Setting(card)
      .setName(t('style-title-size'))
      .addText(tc => {
        tc.inputEl.type = 'number';
        tc.inputEl.placeholder = '14';
        tc.setValue(this.editingStyle?.title?.fontSize?.replace(/px$/, '') ?? '');
        tc.onChange(v => {
          if (!this.editingStyle) this.editingStyle = {};
          if (!this.editingStyle.title) this.editingStyle.title = {};
          this.editingStyle.title.fontSize = v ? `${v}px` : '';
        });
      })
      .addDropdown(dd => {
        dd.addOption('px', 'px');
        dd.setValue('px');
      });

    new Setting(card)
      .setName(t('style-title-weight'))
      .addDropdown(dd => {
        dd.addOption('', t('weight-default'));
        dd.addOption('normal', 'normal');
        dd.addOption('bold', 'bold');
        for (let i = 100; i <= 900; i += 100) dd.addOption(String(i), String(i));
        dd.setValue(this.editingStyle?.title?.fontWeight ?? '');
        dd.onChange(v => {
          if (!this.editingStyle) this.editingStyle = {};
          if (!this.editingStyle.title) this.editingStyle.title = {};
          this.editingStyle.title.fontWeight = v || undefined;
        });
      });
  }

  private renderContentStyle(container: HTMLElement): void {
    container.createEl('h3', { text: t('style-content') });
    const card = container.createEl('div', { cls: 'xyw-style-section' });

    new Setting(card)
      .setName(t('style-content-align'))
      .addDropdown(dd => {
        dd.addOption('left', t('style-align-left'));
        dd.addOption('center', t('style-align-center'));
        dd.addOption('right', t('style-align-right'));
        dd.setValue(this.editingStyle?.content?.align ?? 'left');
        dd.onChange(v => {
          if (!this.editingStyle) this.editingStyle = {};
          if (!this.editingStyle.content) this.editingStyle.content = {};
          this.editingStyle.content.align = v as 'left' | 'center' | 'right';
        });
      });

    new Setting(card)
      .setName(t('style-content-valign'))
      .addDropdown(dd => {
        dd.addOption('top', t('valign-top'));
        dd.addOption('middle', t('valign-middle'));
        dd.addOption('bottom', t('valign-bottom'));
        dd.setValue(this.editingStyle?.content?.valign ?? 'top');
        dd.onChange(v => {
          if (!this.editingStyle) this.editingStyle = {};
          if (!this.editingStyle.content) this.editingStyle.content = {};
          this.editingStyle.content.valign = v as 'top' | 'middle' | 'bottom';
        });
      });

    new Setting(card)
      .setName(t('style-content-color'))
      .addText(tc => {
        tc.inputEl.type = 'color';
        tc.setValue(this.editingStyle?.content?.color ?? '')
        .onChange(v => {
          if (!this.editingStyle) this.editingStyle = {};
          if (!this.editingStyle.content) this.editingStyle.content = {};
          this.editingStyle.content.color = v;
        });
      });

    new Setting(card)
      .setName(t('style-content-size'))
      .addText(tc => {
        tc.inputEl.type = 'number';
        tc.inputEl.placeholder = '13';
        tc.setValue(this.editingStyle?.content?.fontSize?.replace(/px$/, '') ?? '');
        tc.onChange(v => {
          if (!this.editingStyle) this.editingStyle = {};
          if (!this.editingStyle.content) this.editingStyle.content = {};
          this.editingStyle.content.fontSize = v ? `${v}px` : '';
        });
      })
      .addDropdown(dd => {
        dd.addOption('px', 'px');
        dd.setValue('px');
      });

    new Setting(card)
      .setName(t('style-content-weight'))
      .addDropdown(dd => {
        dd.addOption('', t('weight-default'));
        dd.addOption('normal', 'normal');
        dd.addOption('bold', 'bold');
        for (let i = 100; i <= 900; i += 100) dd.addOption(String(i), String(i));
        dd.setValue(this.editingStyle?.content?.fontWeight ?? '');
        dd.onChange(v => {
          if (!this.editingStyle) this.editingStyle = {};
          if (!this.editingStyle.content) this.editingStyle.content = {};
          this.editingStyle.content.fontWeight = v || undefined;
        });
      });

    new Setting(card)
      .setName(t('style-border-color'))
      .addText(tc => {
        tc.inputEl.type = 'color';
        tc.setValue(this.editingStyle?.borderColor ?? '')
        .onChange(v => {
          if (!this.editingStyle) this.editingStyle = {};
          this.editingStyle.borderColor = v;
        });
      });

    new Setting(card)
      .setName(t('style-card'))
      .addDropdown(dd => {
        dd.addOption('none', t('card-none'));
        dd.addOption('default', t('card-default'));
        dd.addOption('bordered', t('card-bordered'));
        dd.addOption('shadow', t('card-shadow'));
        dd.setValue(this.editingStyle?.cardStyle ?? 'default');
        dd.onChange(v => {
          if (!this.editingStyle) this.editingStyle = {};
          this.editingStyle.cardStyle = v;
        });
      });

    new Setting(card)
      .setName(t('style-content-style'))
      .addDropdown(dd => {
        dd.addOption('default', t('content-default'));
        dd.addOption('clean', t('content-clean'));
        dd.addOption('minimal', t('content-minimal'));
        dd.addOption('bordered', t('content-bordered'));
        dd.setValue(this.editingStyle?.contentStyle ?? 'default');
        dd.onChange(v => {
          if (!this.editingStyle) this.editingStyle = {};
          this.editingStyle.contentStyle = v;
        });
      });

  }

  private renderFilterSection(container: HTMLElement): void {
    container.empty();
    container.createEl('h3', { text: t('filter-title') });
    const card = container.createEl('div', { cls: 'xyw-filter-section' });

    const addBtn = card.createEl('button', { cls: 'xyw-filter-add-btn' });
    addBtn.textContent = '+ ' + t('filter-add');
    addBtn.addEventListener('click', () => {
      this.editingFilters.push({ source: 'fileprop', field: 'name', operator: 'contains', value: '', logic: 'and' });
      this.renderFilterRows(card);
    });

    this.renderFilterRows(card);
  }

  private renderFilterRows(container: HTMLElement): void {
    container.findAll('.xyw-filter-row').forEach(el => el.remove());

    for (let i = 0; i < this.editingFilters.length; i++) {
      const row = container.createEl('div', { cls: 'xyw-filter-row' });
      const rule = this.editingFilters[i];

      if (i > 0) {
        const logicSelect = row.createEl('select', { cls: 'xyw-filter-logic dropdown' });
        logicSelect.createEl('option', { value: 'and', text: 'AND' });
        logicSelect.createEl('option', { value: 'or', text: 'OR' });
        logicSelect.value = rule.logic;
        logicSelect.addEventListener('change', () => { rule.logic = logicSelect.value as 'and' | 'or'; });
      }

      const sourceSelect = row.createEl('select', { cls: 'xyw-filter-source dropdown' });
      sourceSelect.createEl('option', { value: 'fileprop', text: t('filter-source-fileprop') });
      sourceSelect.createEl('option', { value: 'yaml', text: t('filter-source-yaml') });
      sourceSelect.value = rule.source;
      sourceSelect.addEventListener('change', () => {
        rule.source = sourceSelect.value as 'yaml' | 'fileprop';
        if (rule.source === 'fileprop') {
          rule.field = fieldSelect.value;
          fieldSelect.style.display = '';
          fieldInput.style.display = 'none';
        } else {
          rule.field = fieldInput.value || '';
          fieldSelect.style.display = 'none';
          fieldInput.style.display = '';
        }
      });

      const fieldContainer = row.createEl('span', { cls: 'xyw-filter-field' });
      const fieldSelect = fieldContainer.createEl('select', { cls: 'dropdown' });
      const filePropFields = ['name', 'basename', 'ext', 'path', 'folder', 'link', 'ctime', 'cday', 'mtime', 'mday', 'size', 'starred', 'tags', 'etags', 'aliases', 'inlinks', 'outlinks', 'lists', 'tasks', 'text', 'frontmatter', 'day', 'isFolder'];
      for (const fp of filePropFields) {
        fieldSelect.createEl('option', { value: fp, text: `file.${fp}` });
      }
      fieldSelect.value = rule.source === 'fileprop' ? rule.field : 'name';
      fieldSelect.addEventListener('change', () => { rule.field = fieldSelect.value; });

      const fieldInput = fieldContainer.createEl('input');
      fieldInput.placeholder = 'field name';
      fieldInput.value = rule.source === 'yaml' ? rule.field : '';
      fieldInput.addEventListener('change', () => { rule.field = fieldInput.value; });

      const updateFieldVisibility = () => {
        if (rule.source === 'fileprop') {
          fieldSelect.style.display = '';
          fieldInput.style.display = 'none';
        } else {
          fieldSelect.style.display = 'none';
          fieldInput.style.display = '';
        }
      };
      updateFieldVisibility();

      const opSelect = row.createEl('select', { cls: 'xyw-filter-operator dropdown' });
      const ops: FilterRule['operator'][] = ['contains', 'not_contains', 'equals', 'not_equals', 'gt', 'lt'];
      for (const op of ops) {
        opSelect.createEl('option', { value: op, text: t(`filter-op-${op}`) });
      }
      opSelect.value = rule.operator;
      opSelect.addEventListener('change', () => { rule.operator = opSelect.value as FilterRule['operator']; });

      const valueInput = row.createEl('input', { cls: 'xyw-filter-value' });
      valueInput.value = rule.value;
      valueInput.addEventListener('change', () => { rule.value = valueInput.value; });

      const delBtn = row.createEl('button', { cls: 'xyw-filter-del' });
      delBtn.textContent = '\u00d7';
      delBtn.addEventListener('click', () => {
        this.editingFilters.splice(i, 1);
        container.querySelectorAll('.xyw-filter-row').forEach(el => el.remove());
        this.renderFilterRows(container);
      });
    }
  }

  onClose(): void {
    FocusManager.restoreEditorFocus(this.app);
    this.contentEl.empty();
    if (this.resolve) this.resolve(this.result);
  }
}