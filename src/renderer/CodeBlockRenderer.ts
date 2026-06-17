import { WidgetStore } from '../store/WidgetStore';
import { createWidget } from '../widgets/registry';
import { WidgetCodeBlockData } from '../types';
import type WidgetPlugin from '../main';
import { WidgetEditorModal } from '../modals';
import { setIcon } from 'obsidian';

export class CodeBlockRenderer {
  private store: WidgetStore;
  private plugin: WidgetPlugin;

  constructor(store: WidgetStore, plugin: WidgetPlugin) {
    this.store = store;
    this.plugin = plugin;
  }

  async render(source: string, container: HTMLElement): Promise<void> {
    container.empty();
    container.addClass('xyw-block');

    let data: WidgetCodeBlockData;
    try {
      data = this.parseSource(source);
    } catch {
      container.createEl('div', { cls: 'xyw-error', text: 'Invalid widget config' });
      return;
    }

    const def = this.store.getWidget(data.id);
    if (!def) {
      container.createEl('div', { cls: 'xyw-error', text: `Widget "${data.id}" not found. Create it in settings first.` });
      return;
    }

    const widget = createWidget(def.type);
    if (!widget) {
      container.createEl('div', { cls: 'xyw-error', text: `Unknown widget type: ${def.type}` });
      return;
    }

    try {
      await widget.render(container, {
        type: def.type,
        title: def.name,
        settings: def.settings,
        children: def.children,
      });
    } catch (e: any) {
      container.empty();
      container.createEl('div', { cls: 'xyw-error', text: `Render error: ${e.message}` });
    }

    const editBtn = container.createEl('button', { cls: 'xyw-edit-overlay' });
    setIcon(editBtn, 'pencil');
    editBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      new WidgetEditorModal(this.plugin.app, this.plugin, this.store, data.id, () => {
        this.render(source, container);
      }).open();
    });
  }

  private parseSource(source: string): WidgetCodeBlockData {
    const lines = source.trim().split('\n');
    const data: Record<string, string> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx < 0) continue;
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();
      if (key && value) {
        data[key] = value;
      }
    }

    if (!data.id) {
      throw new Error('Missing id');
    }

    return { id: data.id };
  }
}