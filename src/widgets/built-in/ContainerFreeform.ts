import { ChildWidgetConfig, WidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { createWidget } from '../registry';
import { t } from '../../i18n';

export class ContainerFreeformWidget extends BaseWidget {
  getType(): string { return 'container-freeform'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const children = (config.children ?? []) as ChildWidgetConfig[];
    if (!children.length) {
      container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-children') });
      return;
    }

    container.addClass('xyw-container-freeform');
    container.style.position = 'relative';
    container.style.overflow = 'auto';

    const positions = (config.settings?.childPositions ?? {}) as Record<string, { x: number; y: number; w: number; h: number }>;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const pos = positions[child.id ?? ''] ?? { x: 0, y: i * 25, w: 100, h: 25 };

      const cell = container.createEl('div', { cls: 'xyw-container-cell xyw-freeform-cell' });
      cell.style.position = 'absolute';
      cell.style.left = pos.x + '%';
      cell.style.top = pos.y + '%';
      cell.style.width = pos.w + '%';
      cell.style.height = pos.h + '%';

      const widget = createWidget(child.type);
      if (widget) {
        await widget.render(cell, {
          type: child.type,
          title: child.title || '',
          settings: child.settings,
          children: child.children,
          style: child.style,
          filters: child.filters,
          sourcePath: config.sourcePath,
        });
      }
    }
  }
}
