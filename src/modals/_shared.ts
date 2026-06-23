export const CONTAINER_TYPES = new Set(['container-row', 'container-col', 'container-tab-h', 'container-tab-v', 'container-freeform']);
export const LEAF_TYPES = new Set(['stats-card', 'recent-files', 'tag-cloud', 'dataview', 'dv-js', 'backlinks', 'random-note', 'button', 'label']);

export function isContainerType(type: string): boolean {
  return CONTAINER_TYPES.has(type);
}

export function isLeafType(type: string): boolean {
  return LEAF_TYPES.has(type);
}
