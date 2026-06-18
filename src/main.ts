import { Plugin, Notice, Editor, Menu } from 'obsidian';
import { WidgetStore } from './store/WidgetStore';
import { registerWidgetType } from './widgets/registry';
import { StatsCardWidget } from './widgets/built-in/StatsCard';
import { RecentFilesWidget } from './widgets/built-in/RecentFiles';
import { TagCloudWidget } from './widgets/built-in/TagCloud';
import { DataviewTableWidget } from './widgets/built-in/DataviewTable';
import { DataviewListWidget } from './widgets/built-in/DataviewList';
import { ContainerRowWidget } from './widgets/built-in/ContainerRow';
import { ContainerColWidget } from './widgets/built-in/ContainerCol';
import { ContainerTabHWidget, ContainerTabVWidget } from './widgets/built-in/ContainerTab';
import { BacklinksWidget } from './widgets/built-in/Backlinks';
import { RandomNoteWidget } from './widgets/built-in/RandomNote';
import { CodeBlockRenderer } from './renderer/CodeBlockRenderer';
import { WidgetPickerModal } from './ui/WidgetPickerModal';
import { WidgetEditorModal } from './modals';
import { WidgetSettingTab } from './settings';
import { t, getLang, setLang } from './i18n';
import { WidgetMeta } from './types';

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
          {
            key: 'excludeFolders',
            labelKey: 'config-exclude-folders',
            type: 'textarea',
            defaultValue: '',
            placeholder: 'folder1/, folder2/',
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
        type: 'dv-table',
        defaultTitle: t('type-dv-table'),
        description: 'Execute a Dataview query and display as table',
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
        type: 'dv-list',
        defaultTitle: t('type-dv-list'),
        description: 'Execute a Dataview query and display as list',
        settingSchema: [
          {
            key: 'query',
            labelKey: 'config-query',
            type: 'textarea',
            defaultValue: '',
            placeholder: 'FROM "projects"',
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
    ];

    const widgets = [
      { ctor: StatsCardWidget, meta: metas[0] },
      { ctor: RecentFilesWidget, meta: metas[1] },
      { ctor: TagCloudWidget, meta: metas[2] },
      { ctor: DataviewTableWidget, meta: metas[3] },
      { ctor: DataviewListWidget, meta: metas[4] },
      { ctor: ContainerRowWidget, meta: metas[5] },
      { ctor: ContainerColWidget, meta: metas[6] },
      { ctor: ContainerTabHWidget, meta: metas[7] },
      { ctor: ContainerTabVWidget, meta: metas[8] },
      { ctor: BacklinksWidget, meta: metas[9] },
      { ctor: RandomNoteWidget, meta: metas[10] },
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

  private registerCodeBlockProcessor(): void {
    this.registerMarkdownCodeBlockProcessor('xiaoyuanwidget', async (source, el, ctx) => {
      await this.renderer.render(source, el);
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