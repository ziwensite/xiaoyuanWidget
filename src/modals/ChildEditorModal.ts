import { App, Modal, Setting, Notice } from 'obsidian';
import { t } from '../i18n';
import { getAllWidgetMetas, getWidgetMeta } from '../widgets/registry';
import { ChildWidgetConfig, AnyWidgetType, WidgetStyle, FilterRule } from '../types';
import { isContainerType, isLeafType } from './_shared';

export class ChildEditorModal extends Modal {
  private result: ChildWidgetConfig | null = null;
  private resolve: ((value: ChildWidgetConfig | null) => void) | null = null;
  private settingsContainerEl!: HTMLElement;
  private styleContainerEl!: HTMLElement;
  private contentStyleContainerEl!: HTMLElement;
  private filterContainerEl!: HTMLElement;

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

    let name = this.existing?.name ?? '';
    let type: AnyWidgetType = (this.existing?.type as AnyWidgetType) ?? 'stats-card';
    let settings = this.existing?.settings ? { ...this.existing.settings } : {};
    let children: ChildWidgetConfig[] = this.existing?.children ? JSON.parse(JSON.stringify(this.existing.children)) : [];
    const extra: {
      style: WidgetStyle | undefined;
      filters: FilterRule[];
    } = {
      style: this.existing?.style ? JSON.parse(JSON.stringify(this.existing.style)) : undefined,
      filters: this.existing?.filters ? JSON.parse(JSON.stringify(this.existing.filters)) : [],
    };

    this.settingsContainerEl = contentEl.createEl('div');

    const renderSettingsWithState = () => {
      this.renderSettings(type, settings, name, (v) => { name = v; }, (v) => {
        type = v as AnyWidgetType;
        settings = {};
        const meta = getWidgetMeta(type as any);
        if (meta) {
          for (const field of meta.settingSchema) {
            settings[field.key] = field.defaultValue;
          }
        }
        if (!isContainerType(type)) children = [];
        renderSettingsWithState();
      }, extra);
    };
    renderSettingsWithState();

    this.styleContainerEl = contentEl.createEl('div');
    this.renderTitleStyle(extra);

    this.contentStyleContainerEl = contentEl.createEl('div');
    this.renderContentStyle(extra);

    this.filterContainerEl = contentEl.createEl('div');
    this.renderFilterSection(extra);

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText(t('btn-save'))
        .setCta()
        .onClick(() => {
          if (!name.trim()) { new Notice('Name is required'); return; }
          this.result = { name: name.trim(), type, settings };
          if (isContainerType(type)) this.result.children = children;
          if (extra.style && Object.keys(extra.style).length > 0) this.result.style = extra.style;
          if (extra.filters.length > 0) this.result.filters = extra.filters;
          this.close();
        }))
      .addButton(btn => btn
        .setButtonText(t('btn-cancel'))
        .onClick(() => this.close()));
  }

  private renderSettings(type: AnyWidgetType, settings: Record<string, any>, name: string, setName: (v: string) => void, onTypeChange: (v: string) => void, extra: { style: WidgetStyle | undefined; filters: FilterRule[] }): void {
    this.settingsContainerEl.empty();
    this.settingsContainerEl.createEl('h3', { text: t('label-config') });
    const card = this.settingsContainerEl.createEl('div', { cls: 'xyw-config-card' });

    new Setting(card)
      .setName(t('label-name'))
      .addText(tc => tc
        .setValue(name)
        .onChange(v => { setName(v); }));

    new Setting(card)
      .setName(t('label-type'))
      .addDropdown(dd => {
        for (const m of getAllWidgetMetas()) {
          if (isLeafType(m.type)) {
            dd.addOption(m.type, t(`type-${m.type}`));
          }
        }
        dd.setValue(type);
        dd.onChange(v => { onTypeChange(v); });
      });

    const meta = getWidgetMeta(type as any);
    if (meta) {
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

    this.renderSizeSetting(card, t('style-width'), extra, 'width');
    this.renderSizeSetting(card, t('style-height'), extra, 'height');
  }

  private renderTitleStyle(extra: { style: WidgetStyle | undefined; filters: FilterRule[] }): void {
    this.styleContainerEl.empty();
    this.styleContainerEl.createEl('h3', { text: t('style-title') });
    const card = this.styleContainerEl.createEl('div', { cls: 'xyw-style-section' });

    new Setting(card)
      .setName(t('style-title-align'))
      .addDropdown(dd => {
        dd.addOption('left', t('style-align-left'));
        dd.addOption('center', t('style-align-center'));
        dd.addOption('right', t('style-align-right'));
        dd.setValue(extra.style?.title?.align ?? 'left');
        dd.onChange(v => {
          if (!extra.style) extra.style = {};
          if (!extra.style.title) extra.style.title = {};
          extra.style.title.align = v as 'left' | 'center' | 'right';
        });
      });

    new Setting(card)
      .setName(t('style-title-color'))
      .addText(tc => {
        tc.inputEl.type = 'color';
        tc.setValue(extra.style?.title?.color ?? '')
        .onChange(v => {
          if (!extra.style) extra.style = {};
          if (!extra.style.title) extra.style.title = {};
          extra.style.title.color = v;
        });
      });

    new Setting(card)
      .setName(t('style-title-bg'))
      .addText(tc => {
        tc.inputEl.type = 'color';
        tc.setValue(extra.style?.title?.bgColor ?? '')
        .onChange(v => {
          if (!extra.style) extra.style = {};
          if (!extra.style.title) extra.style.title = {};
          extra.style.title.bgColor = v;
        });
      });

    new Setting(card)
      .setName(t('style-title-size'))
      .addText(tc => {
        tc.inputEl.type = 'number';
        tc.inputEl.placeholder = '14';
        tc.setValue(extra.style?.title?.fontSize?.replace(/px$/, '') ?? '');
        tc.onChange(v => {
          if (!extra.style) extra.style = {};
          if (!extra.style.title) extra.style.title = {};
          extra.style.title.fontSize = v ? `${v}px` : '';
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
        dd.setValue(extra.style?.title?.fontWeight ?? '');
        dd.onChange(v => {
          if (!extra.style) extra.style = {};
          if (!extra.style.title) extra.style.title = {};
          extra.style.title.fontWeight = v || undefined;
        });
      });
  }

  private renderContentStyle(extra: { style: WidgetStyle | undefined; filters: FilterRule[] }): void {
    this.contentStyleContainerEl.empty();
    this.contentStyleContainerEl.createEl('h3', { text: t('style-content') });
    const card = this.contentStyleContainerEl.createEl('div', { cls: 'xyw-style-section' });

    new Setting(card)
      .setName(t('style-content-align'))
      .addDropdown(dd => {
        dd.addOption('left', t('style-align-left'));
        dd.addOption('center', t('style-align-center'));
        dd.addOption('right', t('style-align-right'));
        dd.setValue(extra.style?.content?.align ?? 'left');
        dd.onChange(v => {
          if (!extra.style) extra.style = {};
          if (!extra.style.content) extra.style.content = {};
          extra.style.content.align = v as 'left' | 'center' | 'right';
        });
      });

    new Setting(card)
      .setName(t('style-content-color'))
      .addText(tc => {
        tc.inputEl.type = 'color';
        tc.setValue(extra.style?.content?.color ?? '')
        .onChange(v => {
          if (!extra.style) extra.style = {};
          if (!extra.style.content) extra.style.content = {};
          extra.style.content.color = v;
        });
      });

    new Setting(card)
      .setName(t('style-content-size'))
      .addText(tc => {
        tc.inputEl.type = 'number';
        tc.inputEl.placeholder = '13';
        tc.setValue(extra.style?.content?.fontSize?.replace(/px$/, '') ?? '');
        tc.onChange(v => {
          if (!extra.style) extra.style = {};
          if (!extra.style.content) extra.style.content = {};
          extra.style.content.fontSize = v ? `${v}px` : '';
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
        dd.setValue(extra.style?.content?.fontWeight ?? '');
        dd.onChange(v => {
          if (!extra.style) extra.style = {};
          if (!extra.style.content) extra.style.content = {};
          extra.style.content.fontWeight = v || undefined;
        });
      });

    new Setting(card)
      .setName(t('style-border-color'))
      .addText(tc => {
        tc.inputEl.type = 'color';
        tc.setValue(extra.style?.borderColor ?? '')
        .onChange(v => {
          if (!extra.style) extra.style = {};
          extra.style.borderColor = v;
        });
      });
  }

  private parseSizeValue(val: string | undefined): { num: string; unit: string } {
    if (!val) return { num: '', unit: 'px' };
    const match = val.match(/^([\d.]+)\s*(px|%|em|rem|vw|vh|auto)?$/);
    if (!match) return { num: val, unit: '' };
    if (match[2] === 'auto') return { num: '', unit: 'auto' };
    return { num: match[1], unit: match[2] || 'px' };
  }

  private renderSizeSetting(card: HTMLElement, label: string, extra: { style: WidgetStyle | undefined }, prop: 'width' | 'height'): void {
    const parsed = this.parseSizeValue(extra.style?.[prop]);
    let textComp: any;
    new Setting(card)
      .setName(label)
      .addText(tc => {
        textComp = tc;
        tc.inputEl.type = 'number';
        tc.inputEl.placeholder = 'auto';
        tc.setValue(parsed.num);
        tc.onChange(v => {
          if (!extra.style) extra.style = {};
          const cur = extra.style[prop] || '';
          const unit = cur.replace(/^[\d.]+/, '') || 'px';
          extra.style[prop] = v ? `${v}${unit}` : '';
        });
        if (parsed.unit === 'auto') tc.inputEl.disabled = true;
      })
      .addDropdown(dd => {
        const units = ['px', '%', 'em', 'rem', 'vw', 'vh', 'auto'];
        for (const u of units) dd.addOption(u, u);
        dd.setValue(parsed.unit);
        dd.onChange(v => {
          if (!extra.style) extra.style = {};
          if (v === 'auto') {
            extra.style[prop] = 'auto';
            textComp.inputEl.disabled = true;
          } else {
            textComp.inputEl.disabled = false;
            extra.style[prop] = textComp.inputEl.value ? `${textComp.inputEl.value}${v}` : '';
          }
        });
      });
  }

  private renderFilterSection(extra: { style: WidgetStyle | undefined; filters: FilterRule[] }): void {
    this.filterContainerEl.empty();
    this.filterContainerEl.createEl('h3', { text: t('filter-title') });
    const card = this.filterContainerEl.createEl('div', { cls: 'xyw-filter-section' });

    const addBtn = card.createEl('button', { cls: 'xyw-filter-add-btn' });
    addBtn.textContent = '+ ' + t('filter-add');
    addBtn.addEventListener('click', () => {
      extra.filters.push({ source: 'fileprop', field: 'name', operator: 'contains', value: '', logic: 'and' });
      this.renderFilterRows(card, extra.filters);
    });

    this.renderFilterRows(card, extra.filters);
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
      fieldInput.addEventListener('blur', () => { rule.field = fieldInput.value; });

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
      delBtn.textContent = '×';
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