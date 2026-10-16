export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Cubic ease-in-out. */
export const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Hermite smoothstep of x between e0 and e1 (value first, like THREE.MathUtils.smoothstep). */
export const smoothstep = (x: number, e0: number, e1: number): number => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
