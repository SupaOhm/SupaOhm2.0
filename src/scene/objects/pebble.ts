import { DEFAULT_REST, type SceneObject } from './types';

export const pebble: SceneObject = {
  shape: (x, y, z) => {
    const r = 1.3 + 0.07 * Math.sin(3 * x + 1) * Math.cos(2.5 * y) + 0.05 * Math.sin(4 * z);
    return [x * r * 1.08, y * r, z * r];
  },
  planes: [],
  rest: DEFAULT_REST,
};
