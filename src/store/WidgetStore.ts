import { WidgetDefinition, WidgetStoreData } from '../types';
import { generateId } from '../utils';

export class WidgetStore {
  private data: WidgetStoreData = { widgets: [] };
  private saveFn: () => Promise<void>;

  constructor(loadData: () => Promise<WidgetStoreData>, saveData: (data: WidgetStoreData) => Promise<void>) {
    this.saveFn = async () => {
      await saveData(this.data);
    };
    this.init(loadData);
  }

  private async init(loadData: () => Promise<WidgetStoreData>): Promise<void> {
    const loaded = await loadData();
    if (loaded && loaded.widgets) {
      this.data = loaded;
    }
  }

  getWidgets(): WidgetDefinition[] {
    return this.data.widgets;
  }

  getWidget(id: string): WidgetDefinition | undefined {
    return this.data.widgets.find(w => w.id === id);
  }

  async addWidget(def: Omit<WidgetDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<WidgetDefinition> {
    const widget: WidgetDefinition = {
      ...def,
      id: generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.widgets.push(widget);
    await this.saveFn();
    return widget;
  }

  async updateWidget(id: string, updates: Partial<Omit<WidgetDefinition, 'id' | 'createdAt'>>): Promise<boolean> {
    const idx = this.data.widgets.findIndex(w => w.id === id);
    if (idx === -1) return false;
    this.data.widgets[idx] = {
      ...this.data.widgets[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    await this.saveFn();
    return true;
  }

  async deleteWidget(id: string): Promise<boolean> {
    const idx = this.data.widgets.findIndex(w => w.id === id);
    if (idx === -1) return false;
    this.data.widgets.splice(idx, 1);
    await this.saveFn();
    return true;
  }

  async importWidgets(defs: Omit<WidgetDefinition, 'createdAt' | 'updatedAt'>[]): Promise<number> {
    const now = Date.now();
    for (const def of defs) {
      if (!this.getWidget(def.id)) {
        this.data.widgets.push({
          ...def,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    await this.saveFn();
    return defs.length;
  }

  exportWidgets(): WidgetDefinition[] {
    return JSON.parse(JSON.stringify(this.data.widgets));
  }
}