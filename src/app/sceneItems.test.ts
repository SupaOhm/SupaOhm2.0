import { expect, it } from 'vitest';
import { SCENE_ITEMS } from './sceneItems';

it('lists the eight object states in page order, ending with the contact phone', () => {
  expect(SCENE_ITEMS.map((i) => i.kind)).toEqual(['pebble', 'frame', 'laptop', 'frame', 'reader', 'phone', 'tablet', 'phone']);
  expect(SCENE_ITEMS[1].label).toBe('Best Paper');
  expect(SCENE_ITEMS[2].label).toBe('Mizuhada Group');
  expect(SCENE_ITEMS.map((i) => Boolean(i.slot))).toEqual([false, false, false, false, false, false, false, true]);
});
