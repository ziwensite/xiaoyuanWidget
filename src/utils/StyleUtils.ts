import { WidgetConfig, WidgetStyle, FilterRule } from '../types';

export function applyWidgetStyle(container: HTMLElement, config: WidgetConfig): void {
  const style = config.style;
  if (!style) return;

  if (style.borderColor) {
    container.style.borderColor = style.borderColor;
  }
  if (style.width || style.height) {
    container.style.flex = 'none';
  }
  if (style.width) {
    container.style.width = style.width;
  }
  if (style.height) {
    container.style.height = style.height;
  }

  const titleEl = container.querySelector('.xyw-card-title') as HTMLElement | null;
  if (titleEl && style.title) {
    if (style.title.align) titleEl.style.textAlign = style.title.align;
    if (style.title.color) titleEl.style.color = style.title.color;
    if (style.title.bgColor) titleEl.style.backgroundColor = style.title.bgColor;
    if (style.title.fontSize) titleEl.style.fontSize = style.title.fontSize;
    if (style.title.fontWeight) titleEl.style.fontWeight = style.title.fontWeight;
  }

  if (style.content) {
    if (style.content.align) container.style.textAlign = style.content.align;
    if (style.content.color) container.style.color = style.content.color;
    if (style.content.fontSize) container.style.fontSize = style.content.fontSize;
    if (style.content.fontWeight) container.style.fontWeight = style.content.fontWeight;
  }
}

function getFieldValue(item: any, source: 'yaml' | 'fileprop', field: string): string {
  if (source === 'fileprop') {
    switch (field) {
      case 'path': return item.path ?? '';
      case 'name': return item.name ?? '';
      case 'ctime': return String(item.stat?.ctime ?? '');
      case 'mtime': return String(item.stat?.mtime ?? '');
      case 'size': return String(item.stat?.size ?? '');
      default: return '';
    }
  }
  if (source === 'yaml') {
    const metadata = item.metadataCache ?? item.frontmatter ?? {};
    const val = metadata[field];
    if (val == null) return '';
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  }
  return '';
}

function compareValue(val: string, operator: FilterRule['operator'], target: string): boolean {
  switch (operator) {
    case 'contains': return val.toLowerCase().includes(target.toLowerCase());
    case 'not_contains': return !val.toLowerCase().includes(target.toLowerCase());
    case 'equals': return val.toLowerCase() === target.toLowerCase();
    case 'not_equals': return val.toLowerCase() !== target.toLowerCase();
    case 'gt': return Number(val) > Number(target);
    case 'lt': return Number(val) < Number(target);
    default: return true;
  }
}

export function applyFilters<T>(items: T[], filters?: FilterRule[]): T[] {
  if (!filters || filters.length === 0) return items;
  return items.filter(item => {
    let result = true;
    for (let i = 0; i < filters.length; i++) {
      const rule = filters[i];
      const val = getFieldValue(item, rule.source, rule.field);
      const matched = compareValue(val, rule.operator, rule.value);
      if (i === 0) { result = matched; continue; }
      if (rule.logic === 'and') result = result && matched;
      else result = result || matched;
    }
    return result;
  });
}
