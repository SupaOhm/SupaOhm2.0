import { describe, expect, it } from 'vitest';
import { placement, viewSize } from './layout';

describe('layout', () => {
  it('computes the visible world size at the object plane', () => {
    const { w, h } = viewSize(1.6);
    expect(h).toBeCloseTo(5.675, 2);
    expect(w).toBeCloseTo(9.08, 2);
  });

  it('wide: object a quarter-width off centre, full size', () => {
    const p = placement(1440 / 900, 'wide');
    expect(p.side).toBeCloseTo(2.27, 2);
    expect(p.fit).toBe(1);
  });

  it('narrow: object centred in the top 55% of the screen and scaled to fit', () => {
    const p = placement(390 / 844, 'narrow');
    expect(p.side).toBe(0);
    expect(p.y).toBeCloseTo(1.277, 2);
    expect(p.fit).toBeCloseTo(0.6095, 3);
  });

  it('centered: in the middle at full size on a square canvas', () => {
    expect(placement(1, 'centered')).toEqual({ side: 0, y: 0, fit: 1 });
  });

  it('wide: shrinks the object when the window is tall and narrow', () => {
    // 800×1000: 4.54 world units across, so 42% of that fits only about half the object
    expect(placement(800 / 1000, 'wide').fit).toBeCloseTo(0.515, 2);
  });
});
