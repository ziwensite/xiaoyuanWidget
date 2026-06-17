import { WidgetConfig, ChildWidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { createWidget } from '../registry';
import { t } from '../../i18n';

export class ContainerTabWidget extends BaseWidget {
  private activeIndex = 0;
  private tabContentEl: HTMLElement | null = null;

  getType(): string { return this.config?.type ?? 'container-tab-h'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const children = config.children ?? [];
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
      this.tabContentEl = tabContent;
      this.buildTabs(tabBar, tabContent, children, config);
    } else {
      const tabBar = container.createEl('div', { cls: 'xyw-tab-bar-h' });
      const tabContent = container.createEl('div', { cls: 'xyw-tab-content-h' });
      this.tabContentEl = tabContent;
      this.buildTabs(tabBar, tabContent, children, config);
    }
  }

  private buildTabs(tabBar: HTMLElement, tabContent: HTMLElement, children: ChildWidgetConfig[], config: WidgetConfig): void {
    this.activeIndex = Math.min(this.activeIndex, children.length - 1);

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tabBtn = tabBar.createEl('button', {
        cls: `xyw-tab-btn${i === this.activeIndex ? ' xyw-tab-active' : ''}`,
        text: child.name,
      });

      tabBtn.addEventListener('click', async () => {
        this.activeIndex = i;
        tabBar.querySelectorAll('.xyw-tab-btn').forEach((el, idx) => {
          el.toggleClass('xyw-tab-active', idx === i);
        });
        tabContent.empty();
        await this.renderChildContent(tabContent, child);
      });

      if (i === this.activeIndex) {
        this.renderChildContent(tabContent, child);
      }
    }
  }

  private async renderChildContent(container: HTMLElement, child: ChildWidgetConfig): Promise<void> {
    const widget = createWidget(child.type as any);
    if (widget) {
      await widget.render(container, {
        type: child.type as any,
        title: child.name,
        settings: child.settings,
        children: child.children,
      });
    }
  }

  destroy(): void {
    this.tabContentEl = null;
    this.activeIndex = 0;
    super.destroy();
  }
}