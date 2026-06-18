import { WidgetConfig, ChildWidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { createWidget } from '../registry';
import { t } from '../../i18n';

export class ContainerRowWidget extends BaseWidget {
  getType(): string { return 'container-row'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const children = (config.children ?? []) as ChildWidgetConfig[];
    if (!children.length) {
      container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-children') });
      return;
    }

    container.addClass('xyw-container-row');
    for (const child of children) {
      const cell = container.createEl('div', { cls: 'xyw-container-cell' });
      const widget = createWidget(child.type);
      if (widget) {
        await widget.render(cell, {
          type: child.type,
          title: child.name,
          settings: child.settings,
          children: child.children,
          style: child.style,
          filters: child.filters,
        });
      }
    }
  }
}