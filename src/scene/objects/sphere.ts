import { DEFAULT_REST, type SceneObject } from './types';

export const sphere: SceneObject = {
  shape: (x, y, z) => [x * 1.35, y * 1.35, z * 1.35],
  planes: [],
  rest: DEFAULT_REST,
};
