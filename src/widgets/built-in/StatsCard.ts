import { WidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { t } from '../../i18n';
import { applyFilters } from '../../utils/StyleUtils';

export class StatsCardWidget extends BaseWidget {
  getType(): string { return 'stats-card'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const app = (window as any).app;
    if (!app) return;

    const vault = app.vault;
    let files = vault.getMarkdownFiles();
    files = applyFilters(files, config.filters);
    const dimension = (config.settings.dimension as string) ?? 'total';

    let value: number;
    let label: string;

    switch (dimension) {
      case 'today': {
        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);
        value = files.filter((f: any) => {
          const ctime = new Date(f.stat.ctime);
          return ctime.toISOString().slice(0, 10) === todayStr;
        }).length;
        label = t('stats-today');
        break;
      }
      case 'week': {
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        value = files.filter((f: any) => f.stat.ctime > weekAgo).length;
        label = t('stats-week');
        break;
      }
      default: {
        value = files.length;
        label = t('stats-total-notes');
        break;
      }
    }

    container.addClass('xyw-stats-card');
    if (config.title) {
      container.createEl('div', { cls: 'xyw-card-title', text: config.title });
    }
    container.createEl('div', { cls: 'xyw-card-value', text: String(value) });
    const showLabel = (config.settings.showLabel as string) !== 'hide';
    if (showLabel) {
      container.createEl('div', { cls: 'xyw-card-label', text: label });
    }
  }
}