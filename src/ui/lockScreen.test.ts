import { describe, expect, it } from 'vitest';
import { LOCK_NOTE, drawLockScreen, lockClock } from './lockScreen';

/** A 2D context that records the text it draws and the names of the other calls. */
function fakeContext() {
  const texts: string[] = [];
  const calls: string[] = [];
  const state: Record<string, unknown> = {};
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === 'fillText') return (text: string) => texts.push(text);
      if (prop === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (prop === 'measureText') return (text: string) => ({ width: text.length * 10 });
      return () => calls.push(prop);
    },
    set(target, prop: string, value) {
      target[prop] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts, calls };
}

const clock = { time: '9:41', date: 'Sunday 18 October' };

describe('lockClock', () => {
  it('shows the visitor’s time and date the way a lock screen does', () => {
    expect(lockClock(new Date(2026, 9, 18, 9, 41))).toEqual({ time: '9:41', date: 'Sunday 18 October' });
    expect(lockClock(new Date(2026, 9, 18, 21, 5)).time).toBe('21:05');
  });
});

describe('drawLockScreen', () => {
  it('draws the date, the clock and the notification', () => {
    const { ctx, texts } = fakeContext();
    drawLockScreen(ctx, 360, 752, { ...clock, faceId: 0 });
    expect(texts).toEqual(expect.arrayContaining([clock.date, clock.time, LOCK_NOTE.from, LOCK_NOTE.when, LOCK_NOTE.text]));
  });

  it('adds the Face ID ring only once it has started', () => {
    const idle = fakeContext();
    drawLockScreen(idle.ctx, 360, 752, { ...clock, faceId: 0 });
    const scanning = fakeContext();
    drawLockScreen(scanning.ctx, 360, 752, { ...clock, faceId: 0.5 });
    const arcs = (calls: string[]) => calls.filter((c) => c === 'arc').length;
    expect(arcs(idle.calls)).toBe(0);
    expect(arcs(scanning.calls)).toBeGreaterThan(0);
  });
});
