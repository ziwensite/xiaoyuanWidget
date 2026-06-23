import { WidgetConfig, ChildWidgetConfig } from '../../types';
import { BaseWidget } from '../base';
import { createWidget } from '../registry';
import { t } from '../../i18n';

function applyContainerAlignment(el: HTMLElement, config: WidgetConfig): void {
  const hAlign = (config.settings.hAlign as string) || 'stretch';
  const vAlign = (config.settings.vAlign as string) || 'stretch';
  if (hAlign === 'stretch' && vAlign === 'stretch') return;
  if (hAlign === 'left') el.style.justifyContent = 'flex-start';
  else if (hAlign === 'center') el.style.justifyContent = 'center';
  else if (hAlign === 'right') el.style.justifyContent = 'flex-end';
  if (vAlign === 'top') el.style.alignItems = 'flex-start';
  else if (vAlign === 'middle') el.style.alignItems = 'center';
  else if (vAlign === 'bottom') el.style.alignItems = 'flex-end';
}

export class ContainerRowWidget extends BaseWidget {
  getType(): string { return 'container-row'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const children = (config.children ?? []) as ChildWidgetConfig[];
    if (!children.length) {
      container.createEl('div', { cls: 'xyw-empty', text: t('msg-no-children') });
      return;
    }

    container.addClass('xyw-container-row');
    applyContainerAlignment(container, config);
    for (const child of children) {
      const cell = container.createEl('div', { cls: 'xyw-container-cell' });
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