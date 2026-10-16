import { describe, expect, it } from 'vitest';
import { nextPixelRatio } from './watchdog';

describe('nextPixelRatio', () => {
  it('lowers the ratio by 0.5 when frames are slow', () => {
    expect(nextPixelRatio(2, 0.03)).toBe(1.5);
    expect(nextPixelRatio(1.5, 0.03)).toBe(1);
  });
  it('never goes below 1', () => {
    expect(nextPixelRatio(1, 0.05)).toBe(1);
  });
  it('keeps the ratio when frames are fast enough', () => {
    expect(nextPixelRatio(2, 0.016)).toBe(2);
  });
});
