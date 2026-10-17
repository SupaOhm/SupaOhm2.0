import { describe, expect, it } from 'vitest';
import { CAMERA_Z, FOV, fitToSlot, placement, viewSize } from './layout';

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

describe('fitToSlot', () => {
  const vw = 1440;
  const vh = 900;
  const screenH = 3;
  const zFront = 0.1;
  const rect = { left: 1000, top: 200, width: 240, height: 500 };

  it('places a front-facing screen so it projects exactly onto the rect', () => {
    const { x, y, scale } = fitToSlot(rect, vw, vh, screenH, zFront);
    const t = Math.tan((FOV * Math.PI) / 360);
    const depth = CAMERA_Z - zFront * scale;
    const toPxY = (wy: number) => ((1 - wy / (t * depth)) / 2) * vh;
    const toPxX = (wx: number) => ((wx / (t * (vw / vh) * depth) + 1) / 2) * vw;
    expect(toPxY(y + (screenH * scale) / 2)).toBeCloseTo(200, 3);
    expect(toPxY(y - (screenH * scale) / 2)).toBeCloseTo(700, 3);
    expect(toPxX(x)).toBeCloseTo(1120, 3);
  });

  it('puts a centred rect on the axis', () => {
    const { x, y } = fitToSlot({ left: 620, top: 200, width: 200, height: 500 }, vw, vh, screenH, zFront);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
  });
});
