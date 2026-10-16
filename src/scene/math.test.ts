import { describe, expect, it } from 'vitest';
import { clamp01, ease, lerp, smoothstep } from './math';

describe('math', () => {
  it('clamps to [0, 1]', () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(3)).toBe(1);
  });

  it('lerps', () => {
    expect(lerp(2, 4, 0.25)).toBe(2.5);
  });

  it('eases from 0 to 1 through the midpoint', () => {
    expect(ease(0)).toBe(0);
    expect(ease(0.5)).toBe(0.5);
    expect(ease(1)).toBe(1);
  });

  it('smoothsteps with the value first', () => {
    expect(smoothstep(0.5, 0.6, 1)).toBe(0);
    expect(smoothstep(0.8, 0.6, 1)).toBeCloseTo(0.5);
    expect(smoothstep(1.2, 0.6, 1)).toBe(1);
  });
});
