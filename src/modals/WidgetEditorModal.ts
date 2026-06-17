import { App, Modal, Setting, Notice, ButtonComponent } from 'obsidian';
import type WidgetPlugin from '../main';
import { WidgetStore } from '../store/WidgetStore';
import { t } from '../i18n';
import { getAllWidgetMetas, getWidgetMeta } from '../widgets/registry';
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
    let settings: Record<string, any> = existing?.settings ? { ...existing.settings } : {};

    const renderSection = () => {
      this.renderDynamicSection(dynamicSectionEl, type, children, settings, (v) => {
        type = v as AnyWidgetType;
        const meta = getWidgetMeta(type);
        settings = {};
        if (meta) {
          for (const field of meta.settingSchema) {
            settings[field.key] = field.defaultValue;
          }
        }
        if (!isContainerType(type)) children = [];
        renderSection();
      });
    };
    renderSection();

    const bottomRow = contentEl.createEl('div', { cls: 'xyw-bottom-row' });
    new ButtonComponent(bottomRow)
      .setButtonText(t('btn-add-child'))
      .setCta()
      .onClick(async () => {
        const modal = new ChildEditorModal(this.app, null);
        const result = await modal.openAndGet();
        if (result) { children.push(result); renderSection(); }
      });

    const rightGroup = bottomRow.createEl('div', { cls: 'xyw-bottom-right' });
    new ButtonComponent(rightGroup)
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
        });
    new ButtonComponent(rightGroup)
      .setButtonText(t('btn-cancel'))
      .onClick(() => this.close());
  }

  private renderDynamicSection(container: HTMLElement, type: AnyWidgetType, children: ChildWidgetConfig[], settings: Record<string, any>, onTypeChange?: (v: string) => void): void {
    container.empty();

    if (!isContainerType(type)) {
      const meta = getWidgetMeta(type);
      if (meta && meta.settingSchema.length > 0) {
        container.createEl('h3', { text: t('label-config') });
        for (const field of meta.settingSchema) {
          const setting = new Setting(container).setName(t(field.labelKey));
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
      return;
    }

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
        this.renderChildCard(listEl, children, i, refreshList);
      }
    };
    refreshList();
  }

  private renderChildCard(listEl: HTMLElement, children: ChildWidgetConfig[], index: number, onRefresh: () => void): void {
    const child = children[index];
    const card = listEl.createEl('div', { cls: 'xyw-child-card-simple' });
    card.draggable = true;

    card.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', String(index));
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
      if (from >= 0 && from !== index) {
        const [item] = children.splice(from, 1);
        const to = from < index ? index - 1 : index;
        children.splice(to, 0, item);
        onRefresh();
      }
    });

    card.createEl('span', {
      cls: 'xyw-child-label-simple',
      text: `${index + 1}. ${child.name} (${t(`type-${child.type}`)})`,
    });
    const acts = card.createEl('div', { cls: 'xyw-child-actions-simple' });

    new ButtonComponent(acts)
      .setIcon('copy')
      .setTooltip('Duplicate')
      .onClick(() => {
        const copy = JSON.parse(JSON.stringify(children[index]));
        children.splice(index + 1, 0, copy);
        onRefresh();
      });
    new ButtonComponent(acts)
      .setIcon('pencil')
      .setTooltip(t('btn-edit'))
      .onClick(async () => {
        const modal = new ChildEditorModal(this.app, children[index]);
        const result = await modal.openAndGet();
        if (result) { children[index] = result; onRefresh(); }
      });
    new ButtonComponent(acts)
      .setIcon('trash-2')
      .setTooltip(t('btn-delete'))
      .onClick(() => {
        children.splice(index, 1);
        onRefresh();
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
