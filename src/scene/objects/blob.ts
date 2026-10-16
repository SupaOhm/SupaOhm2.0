import type { ShapeFn } from './types';

/** The liquid between two objects. */
export const blob: ShapeFn = (x, y, z) => [x * 1.25, y * 1.25, z * 1.25];
