import { WidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { t, t2 } from '../../i18n';
import { DataviewBridge } from '../../bridge/DataviewBridge';

export class DataviewTableWidget extends BaseWidget {
  getType(): string { return 'dv-table'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    container.addClass('xyw-dv-table');
    container.createEl('div', { cls: 'xyw-card-title', text: config.title || t('type-dv-table') });

    const dv = DataviewBridge.getInstance();
    if (!dv.isAvailable()) {
      container.createEl('div', { cls: 'xyw-error', text: t('msg-require-dataview') });
      return;
    }

    const query = config.settings.query as string;
    if (!query) {
      container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-data') });
      return;
    }

    try {
      const result = await dv.executeTableQuery(query);
      if (!result || !result.values.length) {
        container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-data') });
        return;
      }

      const table = container.createEl('table', { cls: 'xyw-table' });
      const thead = table.createEl('thead');
      const headRow = thead.createEl('tr');
      for (const h of result.headers) {
        headRow.createEl('th', { text: String(h) });
      }

      const tbody = table.createEl('tbody');
      for (const row of result.values) {
        const tr = tbody.createEl('tr');
        for (const cell of row) {
          tr.createEl('td', { text: cell ? String(cell) : '' });
        }
      }
    } catch (e: any) {
      container.createEl('div', { cls: 'xyw-error', text: t2('msg-dataview-query-error', { msg: e.message }) });
    }
  }
}