export const LEAF_TYPES = [
  'stats-card',
  'recent-files',
  'tag-cloud',
  'dataview',
  'dv-js',
  'backlinks',
  'random-note',
  'button',
  'label',
] as const;

export type WidgetType = typeof LEAF_TYPES[number];

export const CONTAINER_TYPES = [
  'container',
] as const;

export type ContainerType = typeof CONTAINER_TYPES[number];

export type LayoutMode = 'freeform' | 'row' | 'col' | 'tab';

export type TabPosition = 'top' | 'left' | 'right' | 'bottom';

export const DEFAULT_CHILD_X = 10;
export const DEFAULT_CHILD_Y = 10;
export const DEFAULT_CHILD_W = 100;
export const DEFAULT_CHILD_H = 200;

export interface TabPage {
  name: string;
  children: string[];
  childPositions: Record<string, { x: number; y: number; w: number; h: number }>;
}

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
  containerPaddingRight?: string;
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