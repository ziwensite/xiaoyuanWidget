import { WidgetConfig, WidgetStyle, FilterRule } from '../types';

export function applyWidgetStyle(container: HTMLElement, config: WidgetConfig, leaf?: boolean): void {
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
  if (leaf) {
    if (style.height) {
      container.style.height = style.height;
    } else {
      container.style.minHeight = '10px';
    }
    container.style.overflowY = 'auto';
    container.style.overflowX = 'hidden';
  } else if (style.height) {
    container.style.height = style.height;
  }
  container.style.paddingTop = style.paddingTop || '';
  container.style.paddingBottom = style.paddingBottom || '';
  container.style.paddingLeft = style.paddingLeft || '';
  container.style.paddingRight = style.paddingRight || '';

}

function getFieldValue(item: any, source: 'yaml' | 'fileprop', field: string): string {
  if (source === 'fileprop') {
    const app = (window as any).app;
    const cache = app?.metadataCache?.getFileCache?.(item);
    switch (field) {
      case 'name':      return item.name ?? '';
      case 'basename':  return item.basename ?? item.name?.replace(/\.[^.]+$/, '') ?? '';
      case 'ext':       return item.extension ?? item.name?.split('.').pop() ?? '';
      case 'path':      return item.path ?? '';
      case 'folder':    return item.parent?.path ?? item.path?.replace(/\/[^/]+$/, '') ?? '';
      case 'link':      return `[[${item.basename ?? item.name?.replace(/\.[^.]+$/, '')}]]`;
      case 'ctime':     return String(item.stat?.ctime ?? '');
      case 'cday':      return item.stat?.ctime ? new Date(item.stat.ctime).toISOString().slice(0, 10) : '';
      case 'mtime':     return String(item.stat?.mtime ?? '');
      case 'mday':      return item.stat?.mtime ? new Date(item.stat.mtime).toISOString().slice(0, 10) : '';
      case 'size':      return String(item.stat?.size ?? '');
      case 'starred': {
        const starred = cache?.frontmatter?.starred;
        return starred != null ? String(starred) : '';
      }
      case 'tags': {
        if (!cache) return '';
        const tags: string[] = [];
        if (cache.frontmatter?.tags) {
          const arr = Array.isArray(cache.frontmatter.tags) ? cache.frontmatter.tags : [cache.frontmatter.tags];
          tags.push(...arr.map(String));
        }
        if (cache.tags) {
          tags.push(...cache.tags.map((t: any) => t.tag.replace(/^#/, '')));
        }
        return [...new Set(tags)].join(', ');
      }
      case 'etags': {
        if (!cache?.tags) return '';
        return cache.tags.map((t: any) => t.tag).join(', ');
      }
      case 'aliases': {
        if (!cache?.frontmatter?.aliases) return '';
        const arr = Array.isArray(cache.frontmatter.aliases) ? cache.frontmatter.aliases : [cache.frontmatter.aliases];
        return arr.map(String).join(', ');
      }
      case 'inlinks': {
        if (!app?.metadataCache?.resolvedLinks) return '';
        const links = app.metadataCache.resolvedLinks;
        const incoming: string[] = [];
        for (const [src, dst] of Object.entries(links)) {
          if ((dst as Record<string, number>)[item.path]) incoming.push(src);
        }
        return incoming.join(', ');
      }
      case 'outlinks': {
        if (!app?.metadataCache?.resolvedLinks) return '';
        const links = app.metadataCache.resolvedLinks[item.path];
        return links ? Object.keys(links).join(', ') : '';
      }
      case 'lists': {
        if (!cache?.lists) return '';
        return cache.lists.map((l: any) => l.text ?? '').join(', ');
      }
      case 'tasks': {
        if (!cache?.listItems) return '';
        return cache.listItems.filter((l: any) => l.task).map((l: any) => l.text ?? '').join(', ');
      }
      case 'text': {
        if (!cache?.sections) return '';
        return cache.sections.map((s: any) => s.text ?? '').join(' ');
      }
      case 'frontmatter': {
        if (!cache?.frontmatter) return '';
        return JSON.stringify(cache.frontmatter);
      }
      case 'day':      return item.stat?.ctime ? new Date(item.stat.ctime).toISOString().slice(0, 10) : '';
      case 'isFolder': return 'false';
      default:         return '';
    }
  }
  if (source === 'yaml') {
    const metadata = item.frontmatter ?? {};
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
