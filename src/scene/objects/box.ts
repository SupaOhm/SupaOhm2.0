import type { Vec3 } from './types';

/** Projects a unit direction onto a rounded box (superellipse of exponent n) with half-sizes W, H, D. */
export function box(x: number, y: number, z: number, W: number, H: number, D: number, n = 12): Vec3 {
  const s = Math.pow(Math.abs(x) ** n + Math.abs(y) ** n + Math.abs(z) ** n, 1 / n);
  return [(x / s) * W, (y / s) * H, (z / s) * D];
}
