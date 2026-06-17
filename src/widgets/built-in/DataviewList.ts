import { WidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { t, t2 } from '../../i18n';
import { DataviewBridge } from '../../bridge/DataviewBridge';

export class DataviewListWidget extends BaseWidget {
  getType(): string { return 'dv-list'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    container.addClass('xyw-dv-list');
    container.createEl('div', { cls: 'xyw-card-title', text: config.title || 'Dataview List' });

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
      const result = await dv.query(query);
      if (!result || !result.values.length) {
        container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-data') });
        return;
      }

      const list = container.createEl('ul', { cls: 'xyw-list' });
      for (const row of result.values) {
        const item = list.createEl('li', { cls: 'xyw-list-item' });
        const text = row.map((v: any) => v != null ? String(v) : '-').join(' · ');
        item.textContent = text;
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      container.createEl('div', { cls: 'xyw-error', text: t2('msg-dataview-query-error', { msg: message }) });
    }
  }
}