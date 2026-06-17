import { App } from 'obsidian';

export interface WidgetReference {
  filePath: string;
  fileName: string;
}

export async function scanWidgetReferences(app: App, widgetId: string): Promise<WidgetReference[]> {
  const files = app.vault.getMarkdownFiles();
  const results: WidgetReference[] = [];
  const regex = /```xiaoyuanwidget[\s\S]*?id:\s*(\S+)[\s\S]*?```/g;

  for (const file of files) {
    const content = await app.vault.read(file);
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match[1] === widgetId) {
        results.push({ filePath: file.path, fileName: file.name });
      }
    }
  }

  return results;
}

export async function scanAllWidgetReferences(app: App): Promise<Map<string, WidgetReference[]>> {
  const files = app.vault.getMarkdownFiles();
  const refMap = new Map<string, WidgetReference[]>();
  const regex = /```xiaoyuanwidget[\s\S]*?id:\s*(\S+)[\s\S]*?```/g;

  for (const file of files) {
    const content = await app.vault.read(file);
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const id = match[1];
      const list = refMap.get(id) || [];
      list.push({ filePath: file.path, fileName: file.name });
      refMap.set(id, list);
    }
  }

  return refMap;
}