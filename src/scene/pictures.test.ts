import { expect, it } from 'vitest';
import { createPictures, isPlaceholder } from './pictures';

it('recognises placeholder screenshots by name', () => {
  expect(isPlaceholder('/shots/acklab.placeholder.webp')).toBe(true);
  expect(isPlaceholder('/shots/baka.webp')).toBe(false);
});

it('makes no planes for an object without screens', () => {
  const set = createPictures([], [], 'Hero', 1);
  expect(set.group.children).toHaveLength(0);
  set.setAmount(1);
  expect(set.group.visible).toBe(true);
  set.setAmount(0);
  expect(set.group.visible).toBe(false);
  set.dispose();
});
