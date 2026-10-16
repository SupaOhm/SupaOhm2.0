import { describe, expect, it } from 'vitest';
import { POSITION_SPRING, SWELL_SPRING, createSpring } from './springs';

const run = (stiffness: number, damping: number, seconds: number, dt: number) => {
  const s = createSpring(0, stiffness, damping);
  let peak = 0;
  for (let t = 0; t < seconds; t += dt) peak = Math.max(peak, s.step(1, dt));
  return { x: s.x, peak };
};

describe('createSpring', () => {
  it('settles on the target', () => {
    expect(run(POSITION_SPRING.stiffness, POSITION_SPRING.damping, 3, 1 / 60).x).toBeCloseTo(1, 3);
  });

  it('overshoots before settling (the liquid bounce)', () => {
    expect(run(SWELL_SPRING.stiffness, SWELL_SPRING.damping, 1, 1 / 60).peak).toBeGreaterThan(1.05);
  });

  it('behaves the same at 30 and 144 frames per second', () => {
    const slow = run(POSITION_SPRING.stiffness, POSITION_SPRING.damping, 0.5, 1 / 30).x;
    const fast = run(POSITION_SPRING.stiffness, POSITION_SPRING.damping, 0.5, 1 / 144).x;
    expect(Math.abs(slow - fast)).toBeLessThan(0.03);
  });

  it('survives a long pause without exploding', () => {
    const s = createSpring(0, POSITION_SPRING.stiffness, POSITION_SPRING.damping);
    s.step(1, 5);
    expect(Number.isFinite(s.x)).toBe(true);
    expect(Math.abs(s.x)).toBeLessThan(2);
  });

  it('set() jumps and stops', () => {
    const s = createSpring(0, 100, 10);
    s.step(1, 0.05);
    s.set(3);
    expect(s.x).toBe(3);
    expect(s.v).toBe(0);
  });
});
