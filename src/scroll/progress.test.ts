import { describe, expect, it } from 'vitest';
import { anchorPoint, arriveAmount, dipAmount, exitFade, phoneStage, progressFromAnchors, sceneFade, scrollYForProgress } from './progress';

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

describe('dipAmount', () => {
  it('is 1 with a heading centred, 0 from 0.45 of a viewport away', () => {
    expect(dipAmount(2000, [2000], 800)).toBe(1);
    expect(dipAmount(2000 + 180, [2000], 800)).toBeCloseTo(0.5);
    expect(dipAmount(2000 + 360, [2000], 800)).toBe(0);
    expect(dipAmount(2000 - 500, [2000], 800)).toBe(0);
  });

  it('follows the nearest heading', () => {
    expect(dipAmount(5000, [2000, 5000], 800)).toBe(1);
  });

  it('is 0 without headings', () => {
    expect(dipAmount(100, [], 800)).toBe(0);
  });
});

describe('sceneFade', () => {
  it('is 0 before the exit, 1 between exit and return, 0 again once the return arrives', () => {
    expect(sceneFade(1000, 3000, 9000, 800)).toBe(0);
    expect(sceneFade(5000, 3000, 9000, 800)).toBe(1);
    expect(sceneFade(9400, 3000, 9000, 800)).toBe(0);
  });

  it('never comes back without a return element', () => {
    expect(sceneFade(20000, 3000, Infinity, 800)).toBe(1);
  });
});

describe('arriveAmount', () => {
  it('runs from 0 to 1 over one viewport, ending with the return element at the top of the screen', () => {
    expect(arriveAmount(9000 - 400, 9000, 800)).toBe(0);
    expect(arriveAmount(9000, 9000, 800)).toBeCloseTo(0.5);
    expect(arriveAmount(9000 + 400, 9000, 800)).toBe(1);
  });

  it('is 0 without a return element', () => {
    expect(arriveAmount(20000, Infinity, 800)).toBe(0);
  });
});

describe('phoneStage', () => {
  it('is dark, then locked from halfway, then open once the phone has landed', () => {
    expect(phoneStage(0.2)).toBe('off');
    expect(phoneStage(0.5)).toBe('lock');
    expect(phoneStage(0.96)).toBe('lock');
    expect(phoneStage(0.97)).toBe('open');
  });
});
