import { ChildWidgetConfig, WidgetConfig, IWidget, TabPage, DEFAULT_CHILD_X, DEFAULT_CHILD_Y, DEFAULT_CHILD_W, DEFAULT_CHILD_H } from '../../types';
import { BaseWidget } from '../base';
import { t } from '../../i18n';

export class ContainerWidget extends BaseWidget {
  private activeTabIndex = 0;
  private activeWidgets: IWidget[] = [];

  getType(): string { return 'container'; }

  destroy(): void {
    this.destroyActiveWidgets();
    this.activeTabIndex = 0;
    super.destroy();
  }

  private destroyActiveWidgets(): void {
    for (const w of this.activeWidgets) w.destroy();
    this.activeWidgets = [];
  }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const showTabs = (config.settings?.showTabs as boolean) ?? false;
    const tabPosition = (config.settings?.tabPosition as string) ?? 'top';
    const tabs = (config.settings?.tabs as TabPage[]) ?? [];

    if (!tabs.length) {
      container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-children') });
      return;
    }

    container.addClass('xyw-container');
    container.style.position = 'relative';
    container.style.overflow = 'auto';

    const childMap = new Map<string, ChildWidgetConfig>();
    for (const child of (config.children ?? []) as ChildWidgetConfig[]) {
      if (child.id) childMap.set(child.id, child);
    }

    if (!showTabs) {
      this.activeTabIndex = 0;
      this.renderTabChildren(container, tabs[0], childMap, config);
    } else {
      this.activeTabIndex = Math.min(this.activeTabIndex, tabs.length - 1);
      const isVertical = tabPosition === 'left' || tabPosition === 'right';

      if (isVertical) {
        const wrapper = container.createEl('div', { cls: 'xyw-tab-v-wrapper' });
        const tabBar = wrapper.createEl('div', { cls: 'xyw-tab-bar-v' });
        const tabContent = wrapper.createEl('div', { cls: 'xyw-tab-content-v' });
        this.buildTabs(tabBar, tabContent, tabs, childMap, config);
      } else {
        const tabBar = container.createEl('div', { cls: 'xyw-tab-bar-h' });
        const tabContent = container.createEl('div', { cls: 'xyw-tab-content-h' });
        tabContent.style.position = 'relative';
        tabContent.style.overflow = 'auto';
        this.buildTabs(tabBar, tabContent, tabs, childMap, config);
      }
    }
  }

  private buildTabs(tabBar: HTMLElement, tabContent: HTMLElement, tabs: TabPage[], childMap: Map<string, ChildWidgetConfig>, config: WidgetConfig): void {
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const tabBtn = tabBar.createEl('div', {
        cls: `xyw-card-title${i === this.activeTabIndex ? ' xyw-tab-active' : ''}`,
        text: tab.name,
      });
      tabBtn.addEventListener('click', async () => {
        this.activeTabIndex = i;
        tabBar.querySelectorAll('.xyw-card-title').forEach((el, idx) => {
          el.toggleClass('xyw-tab-active', idx === i);
        });
        this.destroyActiveWidgets();
        tabContent.empty();
        await this.renderTabChildren(tabContent, tab, childMap, config);
      });
    }
    this.renderTabChildren(tabContent, tabs[this.activeTabIndex], childMap, config);
  }

  private async renderTabChildren(container: HTMLElement, page: TabPage, childMap: Map<string, ChildWidgetConfig>, config: WidgetConfig): Promise<void> {
    const children = page.children ?? [];
    const positions = page.childPositions ?? {};

    for (const childId of children) {
      const child = childMap.get(childId);
      if (!child) continue;

      const pos = positions[childId] ?? { x: DEFAULT_CHILD_X, y: DEFAULT_CHILD_Y, w: DEFAULT_CHILD_W, h: DEFAULT_CHILD_H };
      const cell = container.createEl('div', { cls: 'xyw-container-cell xyw-freeform-cell' });
      cell.style.position = 'absolute';
      cell.style.left = pos.x + 'px';
      cell.style.top = pos.y + 'px';
      const pr = config.style?.containerPaddingRight;
      cell.style.width = pr
        ? `calc(${pos.w}% - ${pos.x}px - ${pr})`
        : `calc(${pos.w}% - ${pos.x}px)`;
      cell.style.height = pos.h + 'px';

      const widget = await this.renderChildWidget(cell, child, config.sourcePath);
      if (widget) this.activeWidgets.push(widget);
    }

    // Auto-calculate container height from child positions when no fixed style.height
    if (!config.style?.height) {
      const maxBottom = Math.max(10, ...children.map(id => {
        const p = positions[id];
        return p ? p.y + p.h : 0;
      }));
      container.style.height = `${maxBottom}px`;
    }
    if (config.style?.containerPaddingRight) {
      container.style.paddingRight = config.style.containerPaddingRight;
    }
  }
}
