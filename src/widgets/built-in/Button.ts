import { setIcon } from 'obsidian';
import { WidgetConfig } from '../../types';
import { BaseWidget } from '../base';

export class ButtonWidget extends BaseWidget {
  getType(): string { return 'button'; }

  protected async renderContent(container: HTMLElement, config: WidgetConfig): Promise<void> {
    const app = (window as any).app;
    if (!app) return;

    const buttonText = (config.settings.buttonText as string) || 'Button';
    const buttonStyle = (config.settings.buttonStyle as string) || 'default';
    const cssClass = (config.settings.cssClass as string) || '';
    const selectedIcon = (config.settings.icon as string) || '';
    const customIcon = (config.settings.customIcon as string) || '';
    const icon = selectedIcon === '__custom__' ? customIcon : selectedIcon;
    const actionType = config.settings.actionType as string;
    const command = config.settings.command as string;
    const notePath = config.settings.notePath as string;

    const btn = container.createEl('button', { cls: 'xyw-button' });

    if (icon) {
      const iconEl = btn.createEl('span', { cls: 'xyw-button-icon' });
      setIcon(iconEl, icon);
    }

    btn.createEl('span', { cls: 'xyw-button-text', text: buttonText });

    if (buttonStyle && buttonStyle !== 'default') {
      btn.addClass(`xyw-button-${buttonStyle}`);
    }

    if (cssClass) {
      const classes = cssClass.split(/\s+/);
      for (const cls of classes) {
        if (cls) btn.addClass(cls);
      }
    }

    btn.addEventListener('click', async () => {
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
