import { setIcon } from 'obsidian';
import { WidgetConfig } from '../../types';
import { BaseWidget } from '../base';

export class LabelWidget extends BaseWidget {
  getType(): string { return 'label'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const app = (window as any).app;
    if (!app) return;

    const text = (config.settings.text as string) || '';
    const labelStyle = (config.settings.labelStyle as string) || 'default';
    const cssClass = (config.settings.cssClass as string) || '';
    const selectedIcon = (config.settings.icon as string) || '';
    const customIcon = (config.settings.customIcon as string) || '';
    const icon = selectedIcon === '__custom__' ? customIcon : selectedIcon;
    const actionType = config.settings.actionType as string;
    const command = config.settings.command as string;
    const notePath = config.settings.notePath as string;

    const wrapper = container.createEl('div', { cls: 'xyw-label' });

    if (icon) {
      const iconEl = wrapper.createEl('span', { cls: 'xyw-label-icon' });
      setIcon(iconEl, icon);
    }

    wrapper.createEl('span', { cls: 'xyw-label-text', text });

    if (labelStyle && labelStyle !== 'default') {
      wrapper.addClass(`xyw-label-${labelStyle}`);
    }

    if (cssClass) {
      const classes = cssClass.split(/\s+/);
      for (const cls of classes) {
        if (cls) wrapper.addClass(cls);
      }
    }

    if (actionType && (command || notePath)) {
      wrapper.addClass('xyw-label-clickable');
      wrapper.addEventListener('click', async () => {
        if (actionType === 'command' && command) {
          app.commands.executeCommandById(command);
        } else if (actionType === 'open-note' && notePath) {
          const file = app.vault.getAbstractFileByPath(notePath);
          if (file) {
            const leaf = app.workspace.getLeaf();
            await leaf.openFile(file);
          }
        }
      });
    }
  }
}
