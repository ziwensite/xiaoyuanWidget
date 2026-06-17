import { WidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { createWidget } from '../registry';

export class ContainerRowWidget extends BaseWidget {
  getType(): string { return 'container-row'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const children = config.children ?? [];
    if (!children.length) {
      container.createEl('div', { cls: 'xyw-empty', text: 'No children' });
      return;
    }

    container.addClass('xyw-container-row');
    for (const child of children) {
      const cell = container.createEl('div', { cls: 'xyw-container-cell' });
      const widget = createWidget(child.type as any);
      if (widget) {
        await widget.render(cell, {
          type: child.type as any,
          title: child.name,
          settings: child.settings,
          children: child.children,
        });
      }
    }
  }
}