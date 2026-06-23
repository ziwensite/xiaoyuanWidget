import { Component } from 'obsidian';

export interface DataviewQueryResult {
  type: 'table' | 'list' | 'task';
  headers: string[];
  values: any[][];
}

export class DataviewBridge {
  private static instance: DataviewBridge;
  private api: any = null;

  static getInstance(): DataviewBridge {
    if (!DataviewBridge.instance) {
      DataviewBridge.instance = new DataviewBridge();
    }
    return DataviewBridge.instance;
  }

  isAvailable(): boolean {
    const app = (window as any).app;
    if (!app) return false;
    try {
      const dv = (window as any).DataviewAPI;
      return !!dv;
    } catch {
      return false;
    }
  }

  getAPI(): any {
    if (this.api) return this.api;
    try {
      this.api = (window as any).DataviewAPI;
      return this.api;
    } catch {
      return null;
    }
  }

  async query(query: string): Promise<DataviewQueryResult | null> {
    const dv = this.getAPI();
    if (!dv) throw new Error('Dataview not available');

    const result = await dv.query(query);
    if (!result || !result.successful || !result.value) return null;

    return {
      type: result.value.type ?? 'list',
      headers: result.value.headers ?? [],
      values: result.value.values ?? [],
    };
  }

  async execute(query: string, container: HTMLElement, sourcePath: string): Promise<Component> {
    const dv = this.getAPI();
    if (!dv) throw new Error('Dataview not available');
    if (typeof dv.execute !== 'function') {
      throw new Error('Dataview 版本过低，不支持 execute，请升级');
    }

    const component = new Component();
    component.load();
    await dv.execute(query, container, component, sourcePath);
    return component;
  }

  async runJS(code: string, container: HTMLElement, sourcePath: string): Promise<Component> {
    const dv = this.getAPI();
    if (!dv) throw new Error('Dataview not available');
    if (typeof dv.executeJs !== 'function') {
      throw new Error('Dataview 版本过低，不支持 executeJs，请升级');
    }

    const component = new Component();
    component.load();
    await dv.executeJs(code, container, component, sourcePath);
    return component;
  }
}