export type Lang = 'en' | 'zh';

let currentLang: Lang = 'zh';

const translations: Record<string, Record<Lang, string>> = {
  'plugin-name': { en: 'xiaoyuanWidget', zh: '小元部件' },
  'plugin-desc': { en: 'Modular widgets — stats, Dataview queries, tag cloud and more', zh: '模块化部件 — 统计、Dataview 查询、标签云等' },

  'settings-general': { en: 'General Settings', zh: '通用设置' },
  'settings-widget-mgr': { en: 'Widget Manager', zh: '部件管理' },
  'settings-dataview': { en: 'Dataview Integration', zh: 'Dataview 集成' },

  'btn-new-widget': { en: 'New Widget', zh: '新建部件' },
  'btn-edit': { en: 'Edit', zh: '编辑' },
  'btn-delete': { en: 'Delete', zh: '删除' },
  'btn-save': { en: 'Save', zh: '保存' },
  'btn-cancel': { en: 'Cancel', zh: '取消' },
  'btn-insert': { en: 'Insert', zh: '插入' },
  'btn-export': { en: 'Export', zh: '导出' },
  'btn-import': { en: 'Import', zh: '导入' },
  'btn-import-all': { en: 'Import All', zh: '全部导入' },

  'label-name': { en: 'Name', zh: '名称' },
  'label-id': { en: 'ID', zh: 'ID' },
  'label-type': { en: 'Type', zh: '类型' },
  'label-config': { en: 'Configuration', zh: '配置' },
  'label-usage-count': { en: 'Usage Count', zh: '使用次数' },
  'label-created': { en: 'Created', zh: '创建时间' },
  'label-updated': { en: 'Updated', zh: '更新时间' },
  'label-no-widgets': { en: 'No widgets yet. Click "New Widget" to create one.', zh: '暂无部件，点击"新建部件"创建第一个。' },
  'label-widget-id': { en: 'Widget ID', zh: '部件 ID' },
  'label-select-widget': { en: 'Select a widget', zh: '选择一个部件' },
  'label-find-references': { en: 'Find References', zh: '查找引用' },

  'title-edit-widget': { en: 'Edit Widget', zh: '编辑部件' },
  'title-new-widget': { en: 'New Widget', zh: '新建部件' },
  'title-pick-widget': { en: 'Select Widget', zh: '选择挂件' },
  'title-widget-preview': { en: 'Preview', zh: '预览' },
  'btn-new-container': { en: 'New Container', zh: '新建容器' },
  'btn-new-leaf': { en: 'New Leaf Widget', zh: '新建叶子' },
  'btn-insert-ref': { en: 'Insert', zh: '引用' },
  'btn-duplicate': { en: 'Duplicate', zh: '复制' },
  'label-filter': { en: 'Filter...', zh: '筛选...' },

  'msg-confirm-delete': { en: 'Are you sure you want to delete "{name}"?', zh: '确定删除部件"{name}"吗？' },
  'msg-widget-exists': { en: 'A widget with this ID already exists.', zh: '此 ID 已存在。' },
  'msg-require-dataview': { en: 'Dataview plugin is required. Install and enable it first.', zh: '需要 Dataview 插件，请先安装并启用。' },
  'msg-dataview-query-error': { en: 'Query error: {msg}', zh: '查询错误：{msg}' },
'msg-no-data': { en: 'No data.', zh: '暂无数据。' },
  'msg-import-success': { en: 'Imported {n} widget(s).', zh: '已导入 {n} 个挂件。' },
  'msg-copied': { en: 'Copied to clipboard!', zh: '已复制到剪贴板！' },
  'msg-no-references': { en: 'No references found.', zh: '未找到引用。' },

  'type-stats-card': { en: 'Stats Card', zh: '统计卡片' },
  'type-recent-files': { en: 'Recent Files', zh: '最近文件' },
  'type-tag-cloud': { en: 'Tag Cloud', zh: '标签云' },
  'type-dv-table': { en: 'Dataview Table', zh: 'Dataview 表格' },
  'type-dv-list': { en: 'Dataview List', zh: 'Dataview 列表' },
  'type-container-row': { en: 'Row', zh: '行排列' },
  'type-container-col': { en: 'Column', zh: '列排列' },
  'type-container-tab-h': { en: 'Horizontal Tabs', zh: '标签水平排列' },
  'type-container-tab-v': { en: 'Vertical Tabs', zh: '标签垂直排列' },
  'type-backlinks': { en: 'Backlinks', zh: '反向链接' },
  'type-random-note': { en: 'Random Note', zh: '随机笔记' },

  'stats-total-notes': { en: 'Total Notes', zh: '笔记总数' },
  'stats-today': { en: 'Created Today', zh: '今日新建' },
  'stats-week': { en: 'This Week', zh: '本周新建' },

  'config-dimension': { en: 'Dimension', zh: '统计维度' },
  'config-limit': { en: 'Max Items', zh: '最大条数' },
  'config-exclude-folders': { en: 'Exclude Folders', zh: '排除目录' },
  'config-min-count': { en: 'Min Count', zh: '最少出现次数' },
  'config-query': { en: 'DQL Query', zh: 'DQL 查询语句' },

  'label-children': { en: 'Children', zh: '子部件' },
  'label-layout-type': { en: 'Layout', zh: '子部件排列方式' },
  'label-widget-list': { en: 'Widgets', zh: '部件列表' },
  'label-child-list': { en: 'Widgets', zh: '子部件列表' },
  'btn-rename': { en: 'Rename', zh: '重命名' },
  'btn-add-child': { en: 'Add Child', zh: '添加子部件' },
  'btn-switch-type-warn': { en: 'Switching to a non-container type will clear all children. Continue?', zh: '切换为非容器类型将清除所有子部件，是否继续？' },
  'msg-no-children': { en: 'No children. Click "Add Child" to add one.', zh: '暂无子部件，点击"添加子部件"添加。' },

  'style-title': { en: 'Title Style', zh: '标题样式' },
  'style-title-align': { en: 'Title Align', zh: '标题对齐' },
  'style-title-color': { en: 'Title Color', zh: '标题文字颜色' },
  'style-title-bg': { en: 'Title Background', zh: '标题背景色' },
  'style-title-size': { en: 'Title Font Size', zh: '标题文字大小' },
  'style-title-weight': { en: 'Title Font Weight', zh: '标题文字粗细' },
  'style-content': { en: 'Content Style', zh: '内容样式' },
  'style-content-align': { en: 'Content Align', zh: '内容对齐' },
  'style-content-color': { en: 'Content Color', zh: '内容文字颜色' },
  'style-content-size': { en: 'Content Font Size', zh: '内容文字大小' },
  'style-content-weight': { en: 'Content Font Weight', zh: '内容文字粗细' },
  'style-border-color': { en: 'Border Color', zh: '边框颜色' },
  'style-width': { en: 'Width', zh: '宽度' },
  'style-height': { en: 'Height', zh: '高度' },
  'style-align-left': { en: 'Left', zh: '左对齐' },
  'style-align-center': { en: 'Center', zh: '居中' },
  'style-align-right': { en: 'Right', zh: '右对齐' },
  'weight-default': { en: 'Default', zh: '默认' },
  'weight-normal': { en: 'Normal', zh: '常规' },
  'weight-bold': { en: 'Bold', zh: '粗体' },

  'filter-title': { en: 'Filter', zh: '筛选' },
  'filter-add': { en: 'Add Filter', zh: '添加筛选条件' },
  'filter-source': { en: 'Source', zh: '来源' },
  'filter-source-yaml': { en: 'YAML Property', zh: 'YAML 属性' },
  'filter-source-fileprop': { en: 'File Property', zh: '文件属性' },
  'filter-field': { en: 'Field', zh: '字段' },
  'filter-operator': { en: 'Operator', zh: '操作符' },
  'filter-op-contains': { en: 'contains', zh: '包含' },
  'filter-op-not_contains': { en: 'not contains', zh: '不包含' },
  'filter-op-equals': { en: 'equals', zh: '等于' },
  'filter-op-not_equals': { en: 'not equals', zh: '不等于' },
  'filter-op-gt': { en: 'greater than', zh: '大于' },
  'filter-op-lt': { en: 'less than', zh: '小于' },
  'filter-value': { en: 'Value', zh: '值' },
  'filter-logic': { en: 'Logic', zh: '逻辑' },

  'context-insert-widget': { en: 'xiaoyuanWidget', zh: '小元部件' },
  'context-new-widget': { en: 'New Widget', zh: '新建' },
  'context-reference-wgt': { en: 'Reference', zh: '引用' },

  'label-container': { en: 'Container', zh: '容器' },
  'label-leaf': { en: 'Leaf', zh: '叶子' },
  'label-reference-count': { en: 'Referenced by {n} container(s)', zh: '被 {n} 个容器引用' },

  'msg-delete-referenced': { en: '"{name}" is referenced by {n} container(s). Delete anyway?', zh: '"{name}" 被 {n} 个容器引用，确认删除？' },

  'codeblock-hint': { en: 'Right-click to insert a widget, or manually write:\n```xiaoyuanwidget\nid: your-widget-id\n```', zh: '右键可插入部件，或手动编写：\n```xiaoyuanwidget\nid: your-widget-id\n```' },
};

export function getLang(): Lang {
  const locale = (window as any).moment?.locale?.() ?? 'en';
  return locale.startsWith('zh') ? 'zh' : 'en';
}

export function setLang(lang: Lang): void {
  currentLang = lang;
}

export function t(key: string, lang?: Lang): string {
  const l = lang ?? currentLang;
  return translations[key]?.[l] ?? key;
}

export function t2(key: string, vars: Record<string, string>, lang?: Lang): string {
  const l = lang ?? currentLang;
  const str = translations[key]?.[l] ?? key;
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}