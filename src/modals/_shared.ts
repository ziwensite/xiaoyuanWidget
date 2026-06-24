import { CONTAINER_TYPES, LEAF_TYPES } from '../types';

export const CONTAINER_TYPES_SET = new Set<string>(CONTAINER_TYPES as unknown as string[]);
export const LEAF_TYPES_SET = new Set<string>(LEAF_TYPES as unknown as string[]);

export function isContainerType(type: string): boolean {
  return CONTAINER_TYPES_SET.has(type);
}

export function isLeafType(type: string): boolean {
  return LEAF_TYPES_SET.has(type);
}
