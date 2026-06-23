import { Plugin, Notice, Editor, Menu } from 'obsidian';
import { WidgetStore } from './store/WidgetStore';
import { registerWidgetType } from './widgets/registry';
import { StatsCardWidget } from './widgets/built-in/StatsCard';
import { RecentFilesWidget } from './widgets/built-in/RecentFiles';
import { TagCloudWidget } from './widgets/built-in/TagCloud';
import { DataviewWidget } from './widgets/built-in/Dataview';
import { DataviewJSWidget } from './widgets/built-in/DataviewJS';
import { ContainerRowWidget } from './widgets/built-in/ContainerRow';
import { ContainerColWidget } from './widgets/built-in/ContainerCol';
import { ContainerTabHWidget, ContainerTabVWidget } from './widgets/built-in/ContainerTab';
import { BacklinksWidget } from './widgets/built-in/Backlinks';
import { RandomNoteWidget } from './widgets/built-in/RandomNote';
import { ButtonWidget } from './widgets/built-in/Button';
import { LabelWidget } from './widgets/built-in/Label';
import { CodeBlockRenderer } from './renderer/CodeBlockRenderer';
import { WidgetPickerModal } from './ui/WidgetPickerModal';
import { WidgetEditorModal } from './modals';
import { WidgetSettingTab } from './settings';
import { t, getLang, setLang } from './i18n';
import { WidgetMeta } from './types';

const COMMON_ICONS = [
  'search', 'book-open', 'file-text', 'link', 'external-link',
  'plus', 'edit', 'trash-2', 'copy', 'download',
  'arrow-right', 'arrow-up-right', 'refresh-cw', 'settings',
  'home', 'star', 'heart', 'bell', 'calendar', 'clock',
  'user', 'users', 'folder-open', 'tag', 'list',
  'check', 'x', 'alert-circle', 'info', 'help-circle',
  'github', 'globe', 'mail', 'phone', 'map-pin',
  'bold', 'italic', 'underline', 'code', 'terminal',
];

export default class WidgetPlugin extends Plugin {
  store!: WidgetStore;
  private renderer!: CodeBlockRenderer;

  async onload(): Promise<void> {
    const lang = getLang();
    setLang(lang);

    const loadedData = (await this.loadData()) as any;
    this.store = new WidgetStore(
      loadedData ?? { widgets: [] },
      (data) => this.saveData(data)
    );

    this.renderer = new CodeBlockRenderer(this.store, this);

    this.migrateLegacyTypes();
    this.registerWidgetTypes();
    this.registerCodeBlockProcessor();
    this.registerContextMenu();
    this.registerCommands();
    this.registerSettingTab();
  }

  onunload(): void {
    this.renderer.destroy();
  }

  private registerWidgetTypes(): void {
    const metas: WidgetMeta[] = [
      {
        type: 'stats-card',
        defaultTitle: t('type-stats-card'),
        description: 'Display vault statistics as a card',
        settingSchema: [
          {
            key: 'dimension',
            labelKey: 'config-dimension',
            type: 'select',
            defaultValue: 'total',
            options: [
              { label: t('stats-total-notes'), value: 'total' },
              { label: t('stats-today'), value: 'today' },
              { label: t('stats-week'), value: 'week' },
            ],
          },
          {
            key: 'showLabel',
            labelKey: 'config-stats-show-label',
            type: 'select',
            defaultValue: 'show',
            options: [
              { label: t('label-show'), value: 'show' },
              { label: t('label-hide'), value: 'hide' },
            ],
          },
        ],
      },
      {
        type: 'recent-files',
        defaultTitle: t('type-recent-files'),
        description: 'List recently modified files',
        settingSchema: [
          {
            key: 'limit',
            labelKey: 'config-limit',
            type: 'number',
            defaultValue: 10,
            placeholder: '10',
          },
        ],
      },
      {
        type: 'tag-cloud',
        defaultTitle: t('type-tag-cloud'),
        description: 'Display tags as a cloud',
        settingSchema: [
          {
            key: 'minCount',
            labelKey: 'config-min-count',
            type: 'number',
            defaultValue: 1,
            placeholder: '1',
          },
        ],
      },
      {
        type: 'dataview',
        defaultTitle: t('type-dataview'),
        description: 'Execute a Dataview DQL query (auto-detect table/list/task)',
        settingSchema: [
          {
            key: 'query',
            labelKey: 'config-query',
            type: 'textarea',
            defaultValue: '',
            placeholder: 'TABLE file.ctime FROM ""',
          },
        ],
      },
      {
        type: 'dv-js',
        defaultTitle: t('type-dv-js'),
        description: 'Execute custom JavaScript with Dataview API',
        settingSchema: [
          {
            key: 'code',
            labelKey: 'config-js-code',
            type: 'textarea',
            defaultValue: '',
            placeholder: 'dv.paragraph("Hello from DataviewJS!")',
          },
        ],
      },
      {
        type: 'container-row',
        defaultTitle: t('type-container-row'),
        description: 'Arrange child widgets in a horizontal row',
        settingSchema: [],
      },
      {
        type: 'container-col',
        defaultTitle: t('type-container-col'),
        description: 'Arrange child widgets in a vertical column',
        settingSchema: [],
      },
      {
        type: 'container-tab-h',
        defaultTitle: t('type-container-tab-h'),
        description: 'Arrange child widgets as horizontal tabs',
        settingSchema: [],
      },
      {
        type: 'container-tab-v',
        defaultTitle: t('type-container-tab-v'),
        description: 'Arrange child widgets as vertical tabs',
        settingSchema: [],
      },
      {
        type: 'backlinks',
        defaultTitle: t('type-backlinks'),
        description: 'Show backlinks for the active file',
        settingSchema: [],
      },
      {
        type: 'random-note',
        defaultTitle: t('type-random-note'),
        description: 'Open a random note',
        settingSchema: [],
      },
      {
        type: 'button',
        defaultTitle: t('type-button'),
        description: 'A clickable button that executes a command or opens a note',
        settingSchema: [
          {
            key: 'buttonText',
            labelKey: 'config-button-text',
            type: 'text',
            defaultValue: 'Button',
            placeholder: 'Button',
          },
          {
            key: 'buttonStyle',
            labelKey: 'config-button-style',
            type: 'select',
            defaultValue: 'default',
            options: [
              { label: t('btn-style-default'), value: 'default' },
              { label: t('btn-style-primary'), value: 'primary' },
              { label: t('btn-style-outline'), value: 'outline' },
              { label: t('btn-style-ghost'), value: 'ghost' },
              { label: t('btn-style-danger'), value: 'danger' },
              { label: t('btn-style-custom'), value: 'custom' },
            ],
          },
          {
            key: 'cssClass',
            labelKey: 'config-css-class',
            type: 'textarea',
            defaultValue: '',
            placeholder: 'my-btn my-style',
            dependsOn: { field: 'buttonStyle', values: ['custom'] },
          },
          {
            key: 'icon',
            labelKey: 'config-icon',
            type: 'select',
            defaultValue: '',
            options: [
              { label: t('icon-none'), value: '' },
              ...COMMON_ICONS.map(v => ({ label: v, value: v })),
              { label: t('icon-custom'), value: '__custom__' },
            ],
          },
          {
            key: 'customIcon',
            labelKey: 'config-custom-icon',
            type: 'text',
            defaultValue: '',
            placeholder: 'custom lucide icon name',
            dependsOn: { field: 'icon', values: ['__custom__'] },
          },
          {
            key: 'actionType',
            labelKey: 'config-action-type',
            type: 'select',
            defaultValue: 'command',
            options: [
              { label: t('action-command'), value: 'command' },
              { label: t('action-open-note'), value: 'open-note' },
            ],
          },
          {
            key: 'command',
            labelKey: 'config-command-id',
            type: 'text',
            defaultValue: '',
            placeholder: 'app:open-vault',
            dependsOn: { field: 'actionType', values: ['command'] },
          },
          {
            key: 'notePath',
            labelKey: 'config-note-path',
            type: 'text',
            defaultValue: '',
            placeholder: 'folder/note.md',
            dependsOn: { field: 'actionType', values: ['open-note'] },
          },
        ],
      },
      {
        type: 'label',
        defaultTitle: t('type-label'),
        description: 'A text label that can execute a command or open a note on click',
        settingSchema: [
          {
            key: 'text',
            labelKey: 'config-label-text',
            type: 'textarea',
            defaultValue: 'Label',
            placeholder: 'Label text',
          },
          {
            key: 'labelStyle',
            labelKey: 'config-label-style',
            type: 'select',
            defaultValue: 'default',
            options: [
              { label: t('label-style-default'), value: 'default' },
              { label: t('label-style-heading'), value: 'heading' },
              { label: t('label-style-tag'), value: 'tag' },
              { label: t('label-style-link'), value: 'link' },
              { label: t('label-style-custom'), value: 'custom' },
            ],
          },
          {
            key: 'cssClass',
            labelKey: 'config-css-class',
            type: 'textarea',
            defaultValue: '',
            placeholder: 'my-label my-style',
            dependsOn: { field: 'labelStyle', values: ['custom'] },
          },
          {
            key: 'icon',
            labelKey: 'config-icon',
            type: 'select',
            defaultValue: '',
            options: [
              { label: t('icon-none'), value: '' },
              ...COMMON_ICONS.map(v => ({ label: v, value: v })),
              { label: t('icon-custom'), value: '__custom__' },
            ],
          },
          {
            key: 'customIcon',
            labelKey: 'config-custom-icon',
            type: 'text',
            defaultValue: '',
            placeholder: 'custom lucide icon name',
            dependsOn: { field: 'icon', values: ['__custom__'] },
          },
          {
            key: 'actionType',
            labelKey: 'config-action-type',
            type: 'select',
            defaultValue: 'command',
            options: [
              { label: t('action-command'), value: 'command' },
              { label: t('action-open-note'), value: 'open-note' },
            ],
          },
          {
            key: 'command',
            labelKey: 'config-command-id',
            type: 'text',
            defaultValue: '',
            placeholder: 'app:open-vault',
            dependsOn: { field: 'actionType', values: ['command'] },
          },
          {
            key: 'notePath',
            labelKey: 'config-note-path',
            type: 'text',
            defaultValue: '',
            placeholder: 'folder/note.md',
            dependsOn: { field: 'actionType', values: ['open-note'] },
          },
        ],
      },
    ];

    const widgets = [
      { ctor: StatsCardWidget, meta: metas[0] },
      { ctor: RecentFilesWidget, meta: metas[1] },
      { ctor: TagCloudWidget, meta: metas[2] },
      { ctor: DataviewWidget, meta: metas[3] },
      { ctor: DataviewJSWidget, meta: metas[4] },
      { ctor: ContainerRowWidget, meta: metas[5] },
      { ctor: ContainerColWidget, meta: metas[6] },
      { ctor: ContainerTabHWidget, meta: metas[7] },
      { ctor: ContainerTabVWidget, meta: metas[8] },
      { ctor: BacklinksWidget, meta: metas[9] },
      { ctor: RandomNoteWidget, meta: metas[10] },
      { ctor: ButtonWidget, meta: metas[11] },
      { ctor: LabelWidget, meta: metas[12] },
    ];

    for (const { ctor, meta } of widgets) {
      registerWidgetType(ctor, meta);
    }
  }

  private async migrateLegacyData(): Promise<void> {
    const widgets = this.store.getWidgets();
    let changed = false;
    for (const w of widgets) {
      if (w.children && w.children.length > 0 && typeof w.children[0] === 'object') {
        const oldChildren = w.children as any as { name: string; type: string; settings: Record<string, unknown>; style?: any; filters?: any[] }[];
        const newIds: string[] = [];
        for (const child of oldChildren) {
          const saved = await this.store.addWidget({
            name: child.name,
            type: child.type as any,
            settings: child.settings || {},
            children: [],
            style: child.style,
            filters: child.filters,
          });
          newIds.push(saved.id);
        }
        w.children = newIds;
        await this.store.updateWidget(w.id, { children: newIds });
        changed = true;
      }
    }
    if (changed) new Notice('已迁移旧数据，子部件已提升为独立部件');
  }

  private migrateLegacyTypes(): void {
    const typeMap: Record<string, string> = {
      'dv-table': 'dataview',
      'dv-list': 'dataview',
    };
    for (const w of this.store.getWidgets()) {
      const newType = typeMap[w.type];
      if (newType) {
        w.type = newType as any;
        w.updatedAt = Date.now();
      }
    }
  }

  private registerCodeBlockProcessor(): void {
    this.registerMarkdownCodeBlockProcessor('xiaoyuanwidget', async (source, el, ctx) => {
      const filePath = ctx.sourcePath ?? this.app.workspace.getActiveFile()?.path ?? '';
      await this.renderer.render(source, el, filePath);
    });
  }

  private registerContextMenu(): void {
    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
        menu.addItem((item: any) => {
          item.setTitle(t('context-insert-widget'));
          item.setIcon('boxes');
          item.onClick(() => {
            new WidgetPickerModal(this.app, this, this.store, (id) => {
              this.insertCodeBlock(editor, id);
            }).open();
          });
        });
      })
    );
  }

  private insertCodeBlock(editor: Editor, id: string): void {
    const code = `\`\`\`xiaoyuanwidget\nid: ${id}\n\`\`\``;
    const cursor = editor.getCursor();
    editor.replaceRange(code, cursor);
    editor.setCursor({
      line: cursor.line + 3,
      ch: 0,
    });
  }

  private registerCommands(): void {
    this.addCommand({
      id: 'insert-widget',
      name: 'Insert widget at cursor',
      editorCallback: (editor, view) => {
        new WidgetPickerModal(this.app, this, this.store, (id) => {
          this.insertCodeBlock(editor, id);
        }).open();
      },
    });
  }

  private registerSettingTab(): void {
    this.addSettingTab(new WidgetSettingTab(this.app, this, this.store));
  }
}