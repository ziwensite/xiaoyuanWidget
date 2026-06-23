export type WidgetType =
  | 'stats-card'
  | 'recent-files'
  | 'tag-cloud'
  | 'dataview'
  | 'dv-js'
  | 'backlinks'
  | 'random-note'
  | 'button'
  | 'label';

export type ContainerType =
  | 'container-row'
  | 'container-col'
  | 'container-tab-h'
  | 'container-tab-v'
  | 'container-freeform';

export type AnyWidgetType = WidgetType | ContainerType;

export interface WidgetStyle {
  title?: {
    align?: 'left' | 'center' | 'right';
    color?: string;
    bgColor?: string;
    fontSize?: string;
    fontWeight?: string;
  };
  content?: {
    align?: 'left' | 'center' | 'right';
    valign?: 'top' | 'middle' | 'bottom';
    color?: string;
    fontSize?: string;
    fontWeight?: string;
  };
  borderColor?: string;
  width?: string;
  height?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  cardStyle?: string;
  contentStyle?: string;
}

export interface FilterRule {
  source: 'yaml' | 'fileprop';
  field: string;
  operator: 'contains' | 'not_contains' | 'equals' | 'not_equals' | 'gt' | 'lt';
  value: string;
  logic: 'and' | 'or';
}

export interface ChildWidgetConfig {
  name: string;
  id?: string;
  title?: string;
  type: AnyWidgetType;
  settings: Record<string, unknown>;
  children?: ChildWidgetConfig[];
  style?: WidgetStyle;
  filters?: FilterRule[];
}

export interface WidgetDefinition {
  id: string;
  name: string;
  title?: string;
  type: AnyWidgetType;
  settings: Record<string, unknown>;
  children?: string[];
  createdAt: number;
  updatedAt: number;
  style?: WidgetStyle;
  filters?: FilterRule[];
}

export interface WidgetCodeBlockData {
  id: string;
  title?: string;
  settings?: Record<string, string>;
}

export interface WidgetConfig {
  type: AnyWidgetType;
  title: string;
  settings: Record<string, unknown>;
  children?: ChildWidgetConfig[];
  style?: WidgetStyle;
  filters?: FilterRule[];
  sourcePath?: string;
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
  dependsOn?: {
    field: string;
    values: unknown[];
  };
}

export interface IWidget {
  render(container: HTMLElement, config: WidgetConfig): Promise<void>;
  refresh(): Promise<void>;
  destroy(): void;
}

export interface WidgetStoreData {
  widgets: WidgetDefinition[];
}