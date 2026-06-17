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

  async executeQuery(query: string): Promise<any[]> {
    const dv = this.getAPI();
    if (!dv) throw new Error('Dataview not available');

    const result = dv.query(query);
    if (result && result.successful && result.value) {
      return result.value.values ?? [];
    }
    return [];
  }

  async executeTableQuery(query: string): Promise<{ headers: string[]; values: any[][] } | null> {
    const dv = this.getAPI();
    if (!dv) throw new Error('Dataview not available');

    const result = dv.query(query);
    if (result && result.successful && result.value) {
      return {
        headers: result.value.headers ?? [],
        values: result.value.values ?? [],
      };
    }
    return null;
  }
}