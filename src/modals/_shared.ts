export const CONTAINER_TYPES = new Set(['container-row', 'container-col', 'container-tab-h', 'container-tab-v']);
export const LEAF_TYPES = new Set(['stats-card', 'recent-files', 'tag-cloud', 'dv-table', 'dv-list', 'backlinks', 'random-note']);

export function isContainerType(type: string): boolean {
  return CONTAINER_TYPES.has(type);
}

export function isLeafType(type: string): boolean {
  return LEAF_TYPES.has(type);
}
