import { clamp01, ease, smoothstep } from './math';

export interface StepState {
  /** First object of the current step (0..n-2). */
  k: number;
  /** Melt phase within the step, 0..1. */
  g: number;
  /** The state the object belongs to: k for the first half of the melt, k+1 from the middle on. */
  near: number;
  wA: number;
  wBlob: number;
  wB: number;
  /** Overall opacity; below 1 only while reduced motion swaps objects. */
  fade: number;
  /** +1: object on the right of the page, -1: on the left. */
  dir: 1 | -1;
}

/**
 * Within each step from object k to k+1: the first 20% holds k, the middle 60% melts
 * (k → liquid blob → k+1), the last 20% holds k+1.
 */
export function stepState(p: number, n: number, reducedMotion: boolean): StepState {
  const q = Math.min(Math.max(p, 0), n - 1);
  const k = Math.min(Math.floor(q), n - 2);
  const g = clamp01((q - k - 0.2) / 0.6);
  const near = g < 0.5 ? k : k + 1;
  const dir = near % 2 === 0 ? 1 : -1;

  if (reducedMotion) {
    const after = g >= 0.5;
    return { k, g, near, wA: after ? 0 : 1, wBlob: 0, wB: after ? 1 : 0, fade: smoothstep(Math.abs(2 * g - 1), 0, 1), dir };
  }
  if (g < 0.5) {
    const e = ease(g / 0.5);
    return { k, g, near, wA: 1 - e, wBlob: e, wB: 0, fade: 1, dir };
  }
  const e = ease((g - 0.5) / 0.5);
  return { k, g, near, wA: 0, wBlob: 1 - e, wB: e, fade: 1, dir };
}
