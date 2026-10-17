import { expect, it } from 'vitest';
import { SCENE_ITEMS } from './sceneItems';

it('lists the seven object states in page order', () => {
  expect(SCENE_ITEMS.map((i) => i.kind)).toEqual(['pebble', 'laptop', 'frame', 'reader', 'phone', 'tablet', 'sphere']);
  expect(SCENE_ITEMS[1].label).toBe('Mizuhada Group');
});
