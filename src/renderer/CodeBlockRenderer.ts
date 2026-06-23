import { WidgetStore } from '../store/WidgetStore';
import { createWidget } from '../widgets/registry';
import { WidgetCodeBlockData, IWidget, WidgetDefinition, ChildWidgetConfig } from '../types';
import type WidgetPlugin from '../main';
import { WidgetEditorModal, ChildEditorModal } from '../modals';
import { isContainerType } from '../modals/_shared';
import { setIcon } from 'obsidian';

export class CodeBlockRenderer {
  private store: WidgetStore;
  private plugin: WidgetPlugin;
  private activeInstances: Set<IWidget> = new Set();
  private containerMap: Map<HTMLElement, IWidget> = new Map();
  private cleanupFns: (() => void)[] = [];

  constructor(store: WidgetStore, plugin: WidgetPlugin) {
    this.store = store;
    this.plugin = plugin;
    this.setupAutoRefresh();
  }

  private setupAutoRefresh(): void {
    const refreshAll = () => {
      for (const widget of this.activeInstances) {
        widget.refresh().catch(() => {});
      }
    };

    const vault = this.plugin.app.vault;
    const events = [
      vault.on('modify', refreshAll),
      vault.on('delete', refreshAll),
      vault.on('create', refreshAll),
    ];

    this.cleanupFns = events.map(evt => () => vault.offref(evt));
  }

  destroy(): void {
    for (const cleanup of this.cleanupFns) cleanup();
    for (const widget of this.activeInstances) widget.destroy();
    this.activeInstances.clear();
    this.containerMap.clear();
    this.cleanupFns = [];
  }

  private resolveChildren(ids: string[] | undefined): WidgetDefinition[] {
    if (!ids) return [];
    const result: WidgetDefinition[] = [];
    for (const id of ids) {
      const def = this.store.getWidget(id);
      if (def) result.push(def);
    }
    return result;
  }

  async render(source: string, container: HTMLElement, sourcePath?: string): Promise<void> {
    container.empty();
    container.className = 'xyw-block';

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
      const oldWidget = this.containerMap.get(container);
      if (oldWidget) {
        this.activeInstances.delete(oldWidget);
        oldWidget.destroy();
      }

      const mergedSettings = { ...def.settings };
      if (data.settings) {
        Object.assign(mergedSettings, data.settings);
      }
      const resolvedChildren = this.resolveChildren(def.children) as ChildWidgetConfig[];
      await widget.render(container, {
        type: def.type,
        title: data.title || def.title || '',
        settings: mergedSettings,
        children: resolvedChildren,
        style: def.style,
        filters: def.filters,
        sourcePath,
      });
      this.activeInstances.add(widget);
      this.containerMap.set(container, widget);
    } catch (e: unknown) {
      container.empty();
      const message = e instanceof Error ? e.message : String(e);
      container.createEl('div', { cls: 'xyw-error', text: `Render error: ${message}` });
    }

    const editBtn = container.createEl('button', { cls: 'xyw-edit-overlay' });
    setIcon(editBtn, 'pencil');
    editBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!isContainerType(def.type)) {
        const modal = new ChildEditorModal(this.plugin.app, this.store, data.id);
        modal.openAndGet().then(() => {
          this.render(source, container, sourcePath);
        });
      } else {
        new WidgetEditorModal(this.plugin.app, this.plugin, this.store, data.id, () => {
          this.render(source, container, sourcePath);
        }).open();
      }
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

    const result: WidgetCodeBlockData = { id: data.id };
    if (data.title) result.title = data.title;

    const inlineSettings: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('settings.')) {
        inlineSettings[key.slice(9)] = value;
      }
    }
    if (Object.keys(inlineSettings).length > 0) result.settings = inlineSettings;

    return result;
  }
}