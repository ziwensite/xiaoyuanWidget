import { Component } from 'obsidian';
import { WidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { t, t2 } from '../../i18n';
import { DataviewBridge } from '../../bridge/DataviewBridge';

export class DataviewJSWidget extends BaseWidget {
  private dvComponent: Component | null = null;

  getType(): string { return 'dv-js'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    if (this.dvComponent) {
      this.dvComponent.unload();
      this.dvComponent = null;
    }

    container.addClass('xyw-dv-js');
    if (config.title) {
      container.createEl('div', { cls: 'xyw-card-title', text: config.title });
    }

    const dv = DataviewBridge.getInstance();
    if (!dv.isAvailable()) {
      container.createEl('div', { cls: 'xyw-error', text: t('msg-require-dataview') });
      return;
    }

    const code = config.settings.code as string;
    if (!code) {
      container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-data') });
      return;
    }

    try {
      const outputContainer = container.createEl('div', { cls: 'xyw-dvjs-output' });
      this.dvComponent = await dv.runJS(code, outputContainer, config.sourcePath ?? '');
    } catch (e: unknown) {
      container.find('.xyw-dvjs-output')?.remove();
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
