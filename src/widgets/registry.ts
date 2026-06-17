import { WidgetMeta, AnyWidgetType, IWidget } from '../types';
import { BaseWidget } from './base';
import { t } from '../i18n';

const widgetMap = new Map<string, new () => BaseWidget>();
const metaMap = new Map<string, WidgetMeta>();

export function registerWidgetType(ctor: new () => BaseWidget, meta: WidgetMeta): void {
  widgetMap.set(meta.type, ctor);
  metaMap.set(meta.type, meta);
}

export function createWidget(type: AnyWidgetType): IWidget | null {
  const Ctor = widgetMap.get(type);
  if (!Ctor) return null;
  return new Ctor();
}

export function getWidgetMeta(type: AnyWidgetType): WidgetMeta | undefined {
  return metaMap.get(type);
}

export function getAllWidgetMetas(): WidgetMeta[] {
  return Array.from(metaMap.values());
}

export function getAllWidgetTypes(): AnyWidgetType[] {
  return Array.from(metaMap.keys()) as AnyWidgetType[];
}