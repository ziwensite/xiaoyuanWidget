import { WidgetConfig, WidgetDefinition } from '../../types';
import { BaseWidget } from '../base';
import { createWidget } from '../registry';
import { t } from '../../i18n';

export class ContainerColWidget extends BaseWidget {
  getType(): string { return 'container-col'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const children = config.children as WidgetDefinition[] ?? [];
    if (!children.length) {
      container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-children') });
      return;
    }

    container.addClass('xyw-container-col');
    for (const child of children) {
      const cell = container.createEl('div', { cls: 'xyw-container-cell' });
      const widget = createWidget(child.type);
      if (widget) {
        await widget.render(cell, {
          type: child.type,
          title: child.name,
          settings: child.settings,
          style: child.style,
          filters: child.filters,
        });
      }
    }
  }
}