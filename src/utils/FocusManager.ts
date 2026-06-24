import { App } from 'obsidian';

export class FocusManager {
  static restoreEditorFocus(app: App): void {
    const view = app.workspace.activeLeaf?.view;
    if (view && 'editor' in view) {
      (view as any).editor.focus();
    }
  }
}
