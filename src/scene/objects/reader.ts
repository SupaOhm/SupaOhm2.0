import { box } from './box';
import { SCREEN_GAP, type SceneObject } from './types';

export const READER = { W: 1.02, H: 1.42, D: 0.07 };

/** Portrait e-reader. */
export const reader: SceneObject = {
  shape: (x, y, z) => box(x, y, z, READER.W, READER.H, READER.D, 10),
  planes: [{ pos: [0, 0, READER.D + SCREEN_GAP], rot: [0, 0, 0], size: [READER.W * 2 * 0.88, READER.H * 2 * 0.9], pic: 0 }],
  rest: [0.06, -0.3],
};
