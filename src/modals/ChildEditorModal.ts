import { App, Modal, Setting, Notice } from 'obsidian';
import { t } from '../i18n';
import { WidgetStore } from '../store/WidgetStore';
import { getAllWidgetMetas, getWidgetMeta } from '../widgets/registry';
import { AnyWidgetType, WidgetStyle, FilterRule } from '../types';
import { isLeafType } from './_shared';

export class ChildEditorModal extends Modal {
  private result: string | null = null;
  private resolve: ((value: string | null) => void) | null = null;

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
    const isNew = !existing;

    let name = existing?.name ?? '';
    let type: AnyWidgetType = (existing?.type as AnyWidgetType) ?? 'stats-card';
    let settings: Record<string, any> = existing?.settings ? { ...existing.settings } : {};
    let style: WidgetStyle | undefined = existing?.style ? JSON.parse(JSON.stringify(existing.style)) : undefined;
    let filters: FilterRule[] = existing?.filters ? JSON.parse(JSON.stringify(existing.filters)) : [];

    const initSettings = (t: AnyWidgetType) => {
      settings = {};
      const m = getWidgetMeta(t);
      if (m) {
        for (const f of m.settingSchema) {
          settings[f.key] = f.defaultValue;
        }
      }
    };

    const settingsSection = contentEl.createEl('div');
    const styleSection = contentEl.createEl('div');
    const filterSection = contentEl.createEl('div');

    const renderAll = () => {
      this.renderSettings(settingsSection, name, type, settings);
      this.renderTitleStyle(styleSection, style);
      this.renderContentStyle(styleSection, style);
      this.renderFilterSection(filterSection, filters);
    };
    renderAll();

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText(t('btn-save'))
        .setCta()
        .onClick(async () => {
          if (!name.trim()) { new Notice('Name is required'); return; }
          const data: any = { name: name.trim(), type, settings, children: [] };
          if (style && Object.keys(style).length > 0) data.style = style;
          if (filters.length > 0) data.filters = filters;
          if (isNew) {
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

  private renderSettings(container: HTMLElement, name: string, type: AnyWidgetType, settings: Record<string, any>): void {
    container.empty();
    container.createEl('h3', { text: t('label-config') });
    const card = container.createEl('div', { cls: 'xyw-style-section' });
    new Setting(card)
      .setName(t('label-name'))
      .addText(tc => tc
        .setValue(name)
        .onChange(v => { name = v; }));
    new Setting(container)
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
          const meta = getWidgetMeta(type);
          settings = {};
          if (meta) {
            for (const f of meta.settingSchema) {
              settings[f.key] = f.defaultValue;
            }
          }
          this.onOpen();
        });
      });
    const meta = getWidgetMeta(type);
    if (meta && meta.settingSchema.length > 0) {
      for (const field of meta.settingSchema) {
        const setting = new Setting(card).setName(t(field.labelKey));
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
              const opts = field.options;
              setting.addDropdown(dd => {
                for (const opt of opts) dd.addOption(opt.value, opt.label);
                dd.setValue(String(currentVal));
                dd.onChange(v => { settings[field.key] = v; });
              });
            }
            break;
        }
      }
    }
  }

  private renderTitleStyle(container: HTMLElement, style: WidgetStyle | undefined): void {
    container.empty();
    container.createEl('h3', { text: t('style-title') });
    const card = container.createEl('div', { cls: 'xyw-style-section' });

    new Setting(card)
      .setName(t('style-title-align'))
      .addDropdown(dd => {
        dd.addOption('left', t('style-align-left'));
        dd.addOption('center', t('style-align-center'));
        dd.addOption('right', t('style-align-right'));
        dd.setValue(style?.title?.align ?? 'left');
        dd.onChange(v => {
          if (!style) style = {};
          if (!style.title) style.title = {};
          style.title.align = v as 'left' | 'center' | 'right';
        });
      });

    new Setting(card)
      .setName(t('style-title-color'))
      .addText(tc => {
        tc.inputEl.type = 'color';
        tc.setValue(style?.title?.color ?? '')
        .onChange(v => {
          if (!style) style = {};
          if (!style.title) style.title = {};
          style.title.color = v;
        });
      });

    new Setting(card)
      .setName(t('style-title-bg'))
      .addText(tc => {
        tc.inputEl.type = 'color';
        tc.setValue(style?.title?.bgColor ?? '')
        .onChange(v => {
          if (!style) style = {};
          if (!style.title) style.title = {};
          style.title.bgColor = v;
        });
      });

    new Setting(card)
      .setName(t('style-title-size'))
      .addText(tc => {
        tc.inputEl.type = 'number';
        tc.inputEl.placeholder = '14';
        tc.setValue(style?.title?.fontSize?.replace(/px$/, '') ?? '');
        tc.onChange(v => {
          if (!style) style = {};
          if (!style.title) style.title = {};
          style.title.fontSize = v ? `${v}px` : '';
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
        dd.setValue(style?.title?.fontWeight ?? '');
        dd.onChange(v => {
          if (!style) style = {};
          if (!style.title) style.title = {};
          style.title.fontWeight = v || undefined;
        });
      });
  }

  private renderContentStyle(container: HTMLElement, style: WidgetStyle | undefined): void {
    container.createEl('h3', { text: t('style-content') });
    const card = container.createEl('div', { cls: 'xyw-style-section' });

    new Setting(card)
      .setName(t('style-content-align'))
      .addDropdown(dd => {
        dd.addOption('left', t('style-align-left'));
        dd.addOption('center', t('style-align-center'));
        dd.addOption('right', t('style-align-right'));
        dd.setValue(style?.content?.align ?? 'left');
        dd.onChange(v => {
          if (!style) style = {};
          if (!style.content) style.content = {};
          style.content.align = v as 'left' | 'center' | 'right';
        });
      });

    new Setting(card)
      .setName(t('style-content-color'))
      .addText(tc => {
        tc.inputEl.type = 'color';
        tc.setValue(style?.content?.color ?? '')
        .onChange(v => {
          if (!style) style = {};
          if (!style.content) style.content = {};
          style.content.color = v;
        });
      });

    new Setting(card)
      .setName(t('style-content-size'))
      .addText(tc => {
        tc.inputEl.type = 'number';
        tc.inputEl.placeholder = '13';
        tc.setValue(style?.content?.fontSize?.replace(/px$/, '') ?? '');
        tc.onChange(v => {
          if (!style) style = {};
          if (!style.content) style.content = {};
          style.content.fontSize = v ? `${v}px` : '';
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
        dd.setValue(style?.content?.fontWeight ?? '');
        dd.onChange(v => {
          if (!style) style = {};
          if (!style.content) style.content = {};
          style.content.fontWeight = v || undefined;
        });
      });

    new Setting(card)
      .setName(t('style-border-color'))
      .addText(tc => {
        tc.inputEl.type = 'color';
        tc.setValue(style?.borderColor ?? '')
        .onChange(v => {
          if (!style) style = {};
          style.borderColor = v;
        });
      });

    this.renderSizeSetting(card, t('style-width'), style, 'width');
    this.renderSizeSetting(card, t('style-height'), style, 'height');
  }

  private parseSizeValue(val: string | undefined): { num: string; unit: string } {
    if (!val) return { num: '', unit: 'px' };
    const match = val.match(/^([\d.]+)\s*(px|%|em|rem|vw|vh|auto)?$/);
    if (!match) return { num: val, unit: '' };
    if (match[2] === 'auto') return { num: '', unit: 'auto' };
    return { num: match[1], unit: match[2] || 'px' };
  }

  private renderSizeSetting(card: HTMLElement, label: string, style: WidgetStyle | undefined, prop: 'width' | 'height'): void {
    const parsed = this.parseSizeValue(style?.[prop]);
    let textComp: any;
    new Setting(card)
      .setName(label)
      .addText(tc => {
        textComp = tc;
        tc.inputEl.type = 'number';
        tc.inputEl.placeholder = 'auto';
        tc.setValue(parsed.num);
        tc.onChange(v => {
          if (!style) style = {};
          const cur = style[prop] || '';
          const unit = cur.replace(/^[\d.]+/, '') || 'px';
          style[prop] = v ? `${v}${unit}` : '';
        });
        if (parsed.unit === 'auto') tc.inputEl.disabled = true;
      })
      .addDropdown(dd => {
        const units = ['px', '%', 'em', 'rem', 'vw', 'vh', 'auto'];
        for (const u of units) dd.addOption(u, u);
        dd.setValue(parsed.unit);
        dd.onChange(v => {
          if (!style) style = {};
          if (v === 'auto') {
            style[prop] = 'auto';
            textComp.inputEl.disabled = true;
          } else {
            textComp.inputEl.disabled = false;
            style[prop] = textComp.inputEl.value ? `${textComp.inputEl.value}${v}` : '';
          }
        });
      });
  }

  private renderFilterSection(container: HTMLElement, filters: FilterRule[]): void {
    container.empty();
    container.createEl('h3', { text: t('filter-title') });
    const card = container.createEl('div', { cls: 'xyw-filter-section' });

    const addBtn = card.createEl('button', { cls: 'xyw-filter-add-btn' });
    addBtn.textContent = '+ ' + t('filter-add');
    addBtn.addEventListener('click', () => {
      filters.push({ source: 'fileprop', field: 'name', operator: 'contains', value: '', logic: 'and' });
      this.renderFilterRows(card, filters);
    });

    this.renderFilterRows(card, filters);
  }

  private renderFilterRows(container: HTMLElement, filters: FilterRule[]): void {
    container.findAll('.xyw-filter-row').forEach(el => el.remove());

    for (let i = 0; i < filters.length; i++) {
      const row = container.createEl('div', { cls: 'xyw-filter-row' });
      const rule = filters[i];

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
      const filePropFields = ['name', 'path', 'ctime', 'mtime', 'size'];
      for (const fp of filePropFields) {
        fieldSelect.createEl('option', { value: fp, text: fp });
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
        filters.splice(i, 1);
        container.querySelectorAll('.xyw-filter-row').forEach(el => el.remove());
        this.renderFilterRows(container, filters);
      });
    }
  }

  onClose(): void {
    this.contentEl.empty();
    if (this.resolve) this.resolve(this.result);
  }
}