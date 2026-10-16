import { describe, expect, it } from 'vitest';
import { anchorPoint, exitFade, progressFromAnchors, scrollYForProgress } from './progress';

describe('progressFromAnchors', () => {
  const c = [100, 300, 700];

  it('clamps before the first anchor', () => {
    expect(progressFromAnchors(50, c)).toBe(0);
  });

  it('is exactly k at anchor k', () => {
    expect(progressFromAnchors(300, c)).toBe(1);
  });

  it('interpolates between uneven anchors', () => {
    expect(progressFromAnchors(200, c)).toBeCloseTo(0.5);
    expect(progressFromAnchors(400, c)).toBeCloseTo(1.25);
  });

  it('clamps after the last anchor', () => {
    expect(progressFromAnchors(900, c)).toBe(2);
  });

  it('copes with duplicate anchors', () => {
    expect(Number.isFinite(progressFromAnchors(300, [100, 300, 300, 500]))).toBe(true);
  });
});

describe('scrollYForProgress', () => {
  const c = [1000, 2000, 4000];

  it('inverts progressFromAnchors', () => {
    for (const p of [0, 0.3, 1, 1.7, 2]) {
      const y = scrollYForProgress(p, c, 800) + 400;
      expect(progressFromAnchors(y, c)).toBeCloseTo(p);
    }
  });

  it('never scrolls above the top of the page', () => {
    expect(scrollYForProgress(0, [100, 300], 800)).toBe(0);
  });
});

describe('anchorPoint', () => {
  it('uses the element centre on wide layouts', () => {
    expect(anchorPoint(1000, 1200, 900, false)).toBe(1600);
  });

  it('uses top + half a viewport on narrow layouts, so the top 55vh is clear when reached', () => {
    expect(anchorPoint(1000, 1200, 800, true)).toBe(1400);
  });
});

describe('exitFade', () => {
  it('fades over half a viewport around the exit element’s top', () => {
    expect(exitFade(5000 - 200, 5000, 800)).toBe(0);
    expect(exitFade(5000, 5000, 800)).toBeCloseTo(0.5);
    expect(exitFade(5000 + 200, 5000, 800)).toBe(1);
  });

  it('stays 0 when there is no exit element', () => {
    expect(exitFade(5000, Infinity, 800)).toBe(0);
  });
});
