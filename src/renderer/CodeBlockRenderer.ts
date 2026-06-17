import { WidgetStore } from '../store/WidgetStore';
import { createWidget } from '../widgets/registry';
import { WidgetCodeBlockData } from '../types';
import { t } from '../i18n';

export class CodeBlockRenderer {
  private store: WidgetStore;

  constructor(store: WidgetStore) {
    this.store = store;
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