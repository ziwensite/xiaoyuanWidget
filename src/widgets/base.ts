import { IWidget, WidgetConfig } from '../types';

export abstract class BaseWidget implements IWidget {
  protected container: HTMLElement | null = null;
  protected config: WidgetConfig | null = null;

  abstract getType(): string;

  async render(container: HTMLElement, config: WidgetConfig): Promise<void> {
    this.container = container;
    this.config = config;
    container.empty();
    await this.renderContent(container, config);
  }

  protected abstract renderContent(container: HTMLElement, config: WidgetConfig): Promise<void>;

  async refresh(): Promise<void> {
    if (this.container && this.config) {
      await this.render(this.container, this.config);
    }
  }

  destroy(): void {
    this.container = null;
    this.config = null;
  }
}