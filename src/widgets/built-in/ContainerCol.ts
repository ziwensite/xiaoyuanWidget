import { WidgetConfig, WidgetDefinition } from '../../types';
import { BaseWidget } from '../base';
import { createWidget } from '../registry';
import { t } from '../../i18n';

function applyContainerAlignment(el: HTMLElement, config: WidgetConfig): void {
  const hAlign = (config.settings.hAlign as string) || 'stretch';
  const vAlign = (config.settings.vAlign as string) || 'stretch';
  if (hAlign === 'stretch' && vAlign === 'stretch') return;
  if (hAlign === 'left') el.style.alignItems = 'flex-start';
  else if (hAlign === 'center') el.style.alignItems = 'center';
  else if (hAlign === 'right') el.style.alignItems = 'flex-end';
  if (vAlign === 'top') el.style.justifyContent = 'flex-start';
  else if (vAlign === 'middle') el.style.justifyContent = 'center';
  else if (vAlign === 'bottom') el.style.justifyContent = 'flex-end';
}

export class ContainerColWidget extends BaseWidget {
  getType(): string { return 'container-col'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const children = config.children as WidgetDefinition[] ?? [];
    if (!children.length) {
      container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-children') });
      return;
    }

    container.addClass('xyw-container-col');
    applyContainerAlignment(container, config);
    for (const child of children) {
      const cell = container.createEl('div', { cls: 'xyw-container-cell' });
      const widget = createWidget(child.type);
      if (widget) {
        await widget.render(cell, {
          type: child.type,
          title: (child as any).title || '',
          settings: child.settings,
          style: child.style,
          filters: child.filters,
          sourcePath: config.sourcePath,
        });
      }
    }
  }
}