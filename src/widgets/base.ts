import { IWidget, WidgetConfig } from '../types';
import { applyWidgetStyle } from '../utils/StyleUtils';
import { getCardStyleCSS, getContentStyleCSS } from '../utils/StyleThemes';
import { isContainerType } from '../modals/_shared';

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
    const type = this.getType();
    const isLeaf = !isContainerType(type);
    applyWidgetStyle(container, config, isLeaf);

    const style = config.style;
    let needsScope = false;
    const { cardStyle, contentStyle } = style ?? {};
    if ((cardStyle && cardStyle !== 'default') || (contentStyle && contentStyle !== 'default')) needsScope = true;
    if (style?.title || style?.content) needsScope = true;

    if (needsScope) {
      const scope = `xyw-t${Math.random().toString(36).slice(2, 8)}`;
      container.addClass(scope);
      const parts: string[] = [];

      const cardCSS = getCardStyleCSS(cardStyle ?? '', scope);
      if (cardCSS) parts.push(cardCSS);
      const contentCSS = getContentStyleCSS(contentStyle ?? '', scope);
      if (contentCSS) parts.push(contentCSS);

      if (style?.title) {
        const rules: string[] = [];
        if (style.title.fontSize) rules.push(`.${scope} .xyw-card-title { font-size: ${style.title.fontSize}; }`);
        if (style.title.color) rules.push(`.${scope} .xyw-card-title { color: ${style.title.color}; }`);
        if (style.title.fontWeight) rules.push(`.${scope} .xyw-card-title { font-weight: ${style.title.fontWeight}; }`);
        if (style.title.bgColor) rules.push(`.${scope} .xyw-card-title { background-color: ${style.title.bgColor}; }`);
        if (style.title.align) rules.push(`.${scope} .xyw-card-title { text-align: ${style.title.align}; }`);
        if (rules.length) parts.push(rules.join('\n'));
      }

      if (style?.content) {
        const rules: string[] = [];
        if (style.content.fontSize) rules.push(`.${scope} th, .${scope} td { font-size: ${style.content.fontSize}; }`);
        if (style.content.color) rules.push(`.${scope} th, .${scope} td { color: ${style.content.color}; }`);
        if (style.content.fontWeight) rules.push(`.${scope} th, .${scope} td { font-weight: ${style.content.fontWeight}; }`);
        if (style.content.align) rules.push(`.${scope} table { text-align: ${style.content.align}; }`);
        if (style.content.align) rules.push(`.${scope} { text-align: ${style.content.align}; }`);
        if (style.content.valign && style.content.valign !== 'top') {
          const flexVal = style.content.valign === 'middle' ? 'center' : 'flex-end';
          rules.push(`.${scope} { display: flex; flex-direction: column; justify-content: ${flexVal}; }`);
          container.style.overflowY = '';
          container.style.overflowX = '';
        }
        if (rules.length) parts.push(rules.join('\n'));
      }

      if (parts.length) container.createEl('style', { text: parts.join('\n') });
    }
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