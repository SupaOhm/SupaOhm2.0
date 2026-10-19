import { describe, expect, it } from 'vitest';
import { stepState } from './step';

const N = 7;

describe('stepState', () => {
  it('holds object k for the first 20% of a step', () => {
    expect(stepState(1.15, N, false)).toMatchObject({ k: 1, wA: 1, wBlob: 0, wB: 0 });
  });

  it('is fully liquid in the middle of a step', () => {
    const s = stepState(1.5, N, false);
    expect(s.wBlob).toBeCloseTo(1);
    expect(s.wA).toBeCloseTo(0);
    expect(s.wB).toBeCloseTo(0);
  });

  it('holds object k+1 for the last 20%', () => {
    expect(stepState(1.85, N, false)).toMatchObject({ k: 1, wA: 0, wBlob: 0, wB: 1 });
  });

  it('keeps the weights summing to one', () => {
    for (let p = 0; p <= N - 1; p += 0.01) {
      const s = stepState(p, N, false);
      expect(s.wA + s.wBlob + s.wB).toBeCloseTo(1, 6);
    }
  });

  it('ends on the last object and clamps out-of-range progress', () => {
    expect(stepState(6, N, false)).toMatchObject({ k: 5, wB: 1 });
    expect(stepState(-1, N, false)).toMatchObject({ k: 0, wA: 1 });
    expect(stepState(99, N, false)).toMatchObject({ k: 5, wB: 1 });
  });

  it('puts the object on alternating sides, switching mid-melt', () => {
    expect(stepState(0, N, false).dir).toBe(1);
    expect(stepState(1, N, false).dir).toBe(-1);
    expect(stepState(2.3, N, false).dir).toBe(1);
    expect(stepState(2.7, N, false).dir).toBe(-1);
  });

  it('under reduced motion, swaps objects behind a fade with no liquid', () => {
    expect(stepState(1.1, N, true)).toMatchObject({ wA: 1, wBlob: 0, wB: 0, fade: 1 });
    const early = stepState(1.3, N, true);
    expect(early.wA).toBe(1);
    expect(early.fade).toBeGreaterThan(0);
    expect(early.fade).toBeLessThan(1);
    const mid = stepState(1.5, N, true);
    expect(mid.fade).toBeCloseTo(0);
    expect(mid.wB).toBe(1);
  });

  it('names the state the object belongs to, switching mid-melt', () => {
    expect(stepState(2.3, N, false).near).toBe(2);
    expect(stepState(2.5, N, false).near).toBe(3);
    expect(stepState(2.7, N, false).near).toBe(3);
    expect(stepState(6, N, false).near).toBe(6);
    expect(stepState(2.3, N, true).near).toBe(2);
    expect(stepState(2.7, N, true).near).toBe(3);
  });
});
