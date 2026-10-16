import { expect, it } from 'vitest';
import { SCENE_ITEMS } from './sceneItems';

it('lists the seven object states in CV order', () => {
  expect(SCENE_ITEMS.map((i) => i.kind)).toEqual(['pebble', 'reader', 'phone', 'laptop', 'frame', 'tablet', 'sphere']);
  expect(SCENE_ITEMS[3].label).toBe('Mizuhada Group');
});
