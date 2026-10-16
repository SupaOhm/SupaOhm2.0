import { expect, it } from 'vitest';
import { BASE, PALETTE, STATE_COUNT } from './palette';

it('has one swatch per object state in both themes', () => {
  expect(PALETTE.light).toHaveLength(STATE_COUNT);
  expect(PALETTE.dark).toHaveLength(STATE_COUNT);
});

it('stores the light page background as raw output values so the canvas matches the CSS', () => {
  expect(BASE.light.r).toBeCloseTo(245 / 255);
  expect(BASE.light.b).toBeCloseTo(247 / 255);
  expect(BASE.dark.r).toBe(0);
});
