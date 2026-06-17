import { WidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { createWidget } from '../registry';
import { t } from '../../i18n';

export class ContainerColWidget extends BaseWidget {
  getType(): string { return 'container-col'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const children = config.children ?? [];
    if (!children.length) {
      container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-children') });
      return;
    }

    container.addClass('xyw-container-col');
    for (const child of children) {
      const cell = container.createEl('div', { cls: 'xyw-container-cell' });
      const widget = createWidget(child.type as any);
      if (widget) {
        await widget.render(cell, {
          type: child.type as any,
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