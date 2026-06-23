import { Component } from 'obsidian';
import { WidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { t, t2 } from '../../i18n';
import { DataviewBridge } from '../../bridge/DataviewBridge';

export class DataviewWidget extends BaseWidget {
  private dvComponent: Component | null = null;

  getType(): string { return 'dataview'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    if (this.dvComponent) {
      this.dvComponent.unload();
      this.dvComponent = null;
    }

    container.addClass('xyw-dv');
    if (config.title) {
      container.createEl('div', { cls: 'xyw-card-title', text: config.title });
    }

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
      const outputContainer = container.createEl('div', { cls: 'xyw-dv-output' });
      this.dvComponent = await dv.execute(query, outputContainer, config.sourcePath ?? '');
    } catch (e: unknown) {
      container.find('.xyw-dv-output')?.remove();
      const message = e instanceof Error ? e.message : String(e);
      container.createEl('div', { cls: 'xyw-error', text: t2('msg-dataview-query-error', { msg: message }) });
    }
  }

  destroy(): void {
    if (this.dvComponent) {
      this.dvComponent.unload();
      this.dvComponent = null;
    }
    super.destroy();
  }
}
