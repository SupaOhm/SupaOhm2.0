import { describe, expect, it } from 'vitest';
import { coverFit } from './coverFit';

describe('coverFit', () => {
  it('uses the whole image when aspects match', () => {
    expect(coverFit(1.5, 1.5)).toEqual({ scale: [1, 1], offset: [0, 0] });
  });

  it('crops the sides of a wide image, centred by default', () => {
    const w = coverFit(1, 2);
    expect(w.scale).toEqual([0.5, 1]);
    expect(w.offset[0]).toBeCloseTo(0.25);
  });

  it('moves the crop toward the focus, but never past the image edge', () => {
    expect(coverFit(1, 2, [0, 0.5]).offset[0]).toBe(0);
    expect(coverFit(1, 2, [1, 0.5]).offset[0]).toBeCloseTo(0.5);
  });

  it('crops top and bottom of a tall image; focus y counts from the top', () => {
    const top = coverFit(1, 0.5, [0.5, 0]);
    expect(top.scale).toEqual([1, 0.5]);
    expect(top.offset[1]).toBeCloseTo(0.5); // uv y points up, so the top half starts at 0.5
    expect(coverFit(1, 0.5, [0.5, 1]).offset[1]).toBe(0);
  });

  it('always samples inside the image', () => {
    for (const img of [0.3, 0.8, 1, 2.2, 4]) {
      for (const fx of [0, 0.3, 1]) {
        const { scale, offset } = coverFit(0.7, img, [fx, fx]);
        expect(offset[0]).toBeGreaterThanOrEqual(0);
        expect(offset[1]).toBeGreaterThanOrEqual(0);
        expect(offset[0] + scale[0]).toBeLessThanOrEqual(1 + 1e-9);
        expect(offset[1] + scale[1]).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });
});
