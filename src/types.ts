export type WidgetType =
  | 'stats-card'
  | 'recent-files'
  | 'tag-cloud'
  | 'dv-table'
  | 'dv-list';

export type ContainerType =
  | 'container-row'
  | 'container-col'
  | 'container-tab-h'
  | 'container-tab-v';

export type AnyWidgetType = WidgetType | ContainerType;

export interface ChildWidgetConfig {
  name: string;
  type: AnyWidgetType;
  settings: Record<string, unknown>;
  children?: ChildWidgetConfig[];
}

export interface WidgetDefinition {
  id: string;
  name: string;
  type: AnyWidgetType;
  settings: Record<string, unknown>;
  children?: ChildWidgetConfig[];
  createdAt: number;
  updatedAt: number;
}

export interface WidgetCodeBlockData {
  id: string;
}

export interface WidgetConfig {
  type: AnyWidgetType;
  title: string;
  settings: Record<string, unknown>;
  children?: ChildWidgetConfig[];
}

export interface WidgetMeta {
  type: AnyWidgetType;
  defaultTitle: string;
  description: string;
  settingSchema: SettingField[];
}

export interface SettingField {
  key: string;
  labelKey: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  defaultValue: unknown;
  options?: { label: string; value: string }[];
  placeholder?: string;
}

export interface IWidget {
  render(container: HTMLElement, config: WidgetConfig): Promise<void>;
  refresh(): Promise<void>;
  destroy(): void;
}

export interface WidgetStoreData {
  widgets: WidgetDefinition[];
}