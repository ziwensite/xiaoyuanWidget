import { IWidget, WidgetConfig } from '../types';
import { applyWidgetStyle } from '../utils/StyleUtils';

export abstract class BaseWidget implements IWidget {
  protected container: HTMLElement | null = null;
  protected config: WidgetConfig | null = null;
  protected _active = false;

  abstract getType(): string;

  async render(container: HTMLElement, config: WidgetConfig): Promise<void> {
    this.container = container;
    this.config = config;
    this._active = true;
    container.empty();
    await this.renderContent(container, config);
    applyWidgetStyle(container, config);
  }

  protected abstract renderContent(container: HTMLElement, config: WidgetConfig): Promise<void>;

  async refresh(): Promise<void> {
    if (this.container && this.config && this._active) {
      await this.render(this.container, this.config);
    }
  }

  destroy(): void {
    this._active = false;
    this.container = null;
    this.config = null;
  }
}