import { WidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { t } from '../../i18n';

export class RecentFilesWidget extends BaseWidget {
  getType(): string { return 'recent-files'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const app = (window as any).app;
    if (!app) return;

    const vault = app.vault;
    const limit = (config.settings.limit as number) ?? 10;
    const excludeFolders = ((config.settings.excludeFolders as string) ?? '').split(',').map(s => s.trim()).filter(Boolean);

    let files = vault.getMarkdownFiles() as any[];
    files = files
      .filter((f: any) => {
        if (!excludeFolders.length) return true;
        return !excludeFolders.some((folder: string) => f.path.startsWith(folder));
      })
      .sort((a: any, b: any) => b.stat.mtime - a.stat.mtime)
      .slice(0, limit);

    container.addClass('xyw-recent-files');
    container.createEl('div', { cls: 'xyw-card-title', text: config.title || t('type-recent-files') });

    if (!files.length) {
      container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-data') });
      return;
    }

    const list = container.createEl('ul', { cls: 'xyw-file-list' });
    for (const file of files) {
      const item = list.createEl('li', { cls: 'xyw-file-item' });
      item.textContent = file.name;
      item.setAttr('data-path', file.path);
      item.addEventListener('click', () => {
        app.workspace.getLeaf(false).openFile(file);
      });
    }
  }
}