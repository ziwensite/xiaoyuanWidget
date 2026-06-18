import { WidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { t } from '../../i18n';
import { applyFilters } from '../../utils/StyleUtils';

export class RandomNoteWidget extends BaseWidget {
  getType(): string { return 'random-note'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const app = (window as any).app;
    let files = app.vault.getMarkdownFiles();
    files = applyFilters(files, config.filters);
    if (!files.length) {
      container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-data') });
      return;
    }

    container.addClass('xyw-recent-files');
    container.createEl('div', { cls: 'xyw-card-title', text: config.title || t('type-random-note') });

    const randomFile = files[Math.floor(Math.random() * files.length)];
    const item = container.createEl('div', { cls: 'xyw-file-item', text: randomFile.name });
    item.addEventListener('click', () => {
      app.workspace.getLeaf(false).openFile(randomFile);
    });
  }
}