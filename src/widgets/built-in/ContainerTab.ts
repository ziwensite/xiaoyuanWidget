import { WidgetConfig, ChildWidgetConfig, AnyWidgetType, IWidget } from '../../types';
import { BaseWidget } from '../base';
import { createWidget } from '../registry';
import { t } from '../../i18n';

function applyContainerAlignment(el: HTMLElement, config: WidgetConfig): void {
  const hAlign = (config.settings.hAlign as string) || 'stretch';
  const vAlign = (config.settings.vAlign as string) || 'stretch';
  if (hAlign === 'stretch' && vAlign === 'stretch') return;
  el.style.display = 'flex';
  el.style.flexDirection = 'column';
  if (hAlign === 'left') el.style.alignItems = 'flex-start';
  else if (hAlign === 'center') el.style.alignItems = 'center';
  else if (hAlign === 'right') el.style.alignItems = 'flex-end';
  if (vAlign === 'middle') el.style.justifyContent = 'center';
  else if (vAlign === 'bottom') el.style.justifyContent = 'flex-end';
}

export abstract class BaseContainerTabWidget extends BaseWidget {
  protected activeIndex = 0;
  protected tabContentEl: HTMLElement | null = null;
  private childWidget: IWidget | null = null;

  abstract getType(): string;

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const children = (config.children ?? []) as ChildWidgetConfig[];
    if (!children.length) {
      container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-children') });
      return;
    }

    const isVertical = config.type === 'container-tab-v';
    container.addClass(isVertical ? 'xyw-container-tab-v' : 'xyw-container-tab-h');

    if (isVertical) {
      const flexRow = container.createEl('div', { cls: 'xyw-tab-v-wrapper' });
      const tabBar = flexRow.createEl('div', { cls: 'xyw-tab-bar-v' });
      const tabContent = flexRow.createEl('div', { cls: 'xyw-tab-content-v' });
      applyContainerAlignment(tabContent, config);
      this.tabContentEl = tabContent;
      this.buildTabs(tabBar, tabContent, children, config);
    } else {
      const tabBar = container.createEl('div', { cls: 'xyw-tab-bar-h' });
      const tabContent = container.createEl('div', { cls: 'xyw-tab-content-h' });
      applyContainerAlignment(tabContent, config);
      this.tabContentEl = tabContent;
      this.buildTabs(tabBar, tabContent, children, config);
    }
  }

  private async buildTabs(tabBar: HTMLElement, tabContent: HTMLElement, children: ChildWidgetConfig[], config: WidgetConfig): Promise<void> {
    this.activeIndex = Math.min(this.activeIndex, children.length - 1);

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tabBtn = tabBar.createEl('div', {
        cls: `xyw-card-title${i === this.activeIndex ? ' xyw-tab-active' : ''}`,
        text: child.title || child.name,
      });

      tabBtn.addEventListener('click', async () => {
        this.activeIndex = i;
        tabBar.querySelectorAll('.xyw-card-title').forEach((el, idx) => {
          el.toggleClass('xyw-tab-active', idx === i);
        });
        tabContent.empty();
        await this.renderChildContent(tabContent, child, config);
      });

      if (i === this.activeIndex) {
        await this.renderChildContent(tabContent, child, config);
      }
    }
  }

  private async renderChildContent(container: HTMLElement, child: ChildWidgetConfig, config: WidgetConfig): Promise<void> {
    if (this.childWidget) {
      this.childWidget.destroy();
      this.childWidget = null;
    }
    const widget = createWidget(child.type);
    if (widget) {
      await widget.render(container, {
        type: child.type,
        title: '',
        settings: child.settings,
        style: child.style,
        filters: child.filters,
        sourcePath: config.sourcePath,
      });
      this.childWidget = widget;
    }
  }

  destroy(): void {
    if (this.childWidget) {
      this.childWidget.destroy();
      this.childWidget = null;
    }
    this.tabContentEl = null;
    this.activeIndex = 0;
    super.destroy();
  }
}

export class ContainerTabHWidget extends BaseContainerTabWidget {
  getType(): string { return 'container-tab-h'; }
}

export class ContainerTabVWidget extends BaseContainerTabWidget {
  getType(): string { return 'container-tab-v'; }
}