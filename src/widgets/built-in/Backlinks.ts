import { WidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { t } from '../../i18n';
import { applyFilters } from '../../utils/StyleUtils';

export class BacklinksWidget extends BaseWidget {
  getType(): string { return 'backlinks'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const app = (window as any).app;
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) {
      container.createEl('div', { cls: 'xyw-empty', text: 'No active file' });
      return;
    }

    const resolvedLinks = app.metadataCache.resolvedLinks ?? {};
    const backlinkFiles: any[] = [];
    for (const [path, links] of Object.entries(resolvedLinks)) {
      if ((links as Record<string, number>)[activeFile.path]) {
        const f = app.vault.getAbstractFileByPath(path);
        if (f) backlinkFiles.push(f);
      }
    }

    let filtered = applyFilters(backlinkFiles, config.filters);

    container.addClass('xyw-recent-files');
    container.createEl('div', { cls: 'xyw-card-title', text: config.title || t('type-backlinks') });

    if (!filtered.length) {
      container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-data') });
      return;
    }

    const list = container.createEl('ul', { cls: 'xyw-file-list' });
    for (const f of filtered) {
      const item = list.createEl('li', { cls: 'xyw-file-item', text: f.path });
      item.addEventListener('click', () => {
        app.workspace.getLeaf(false).openFile(f);
      });
    }
  }
}