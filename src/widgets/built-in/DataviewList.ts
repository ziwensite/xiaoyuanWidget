import { WidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { t, t2 } from '../../i18n';
import { DataviewBridge } from '../../bridge/DataviewBridge';

export class DataviewListWidget extends BaseWidget {
  getType(): string { return 'dv-list'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    container.addClass('xyw-dv-list');
    container.createEl('div', { cls: 'xyw-card-title', text: config.title || t('type-dv-list') });

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
      const values = await dv.executeQuery(query);
      if (!values || !values.length) {
        container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-data') });
        return;
      }

      const list = container.createEl('ul', { cls: 'xyw-list' });
      for (const row of values) {
        const item = list.createEl('li', { cls: 'xyw-list-item' });
        item.textContent = row[0] ? String(row[0]) : '-';
      }
    } catch (e: any) {
      container.createEl('div', { cls: 'xyw-error', text: t2('msg-dataview-query-error', { msg: e.message }) });
    }
  }
}