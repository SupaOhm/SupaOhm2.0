import { box } from './box';
import { SCREEN_GAP, type SceneObject } from './types';

export const TAB = { W: 1.8, H: 1.25, D: 0.07 };

export const tablet: SceneObject = {
  shape: (x, y, z) => box(x, y, z, TAB.W, TAB.H, TAB.D, 12),
  planes: [{ pos: [0, 0, TAB.D + SCREEN_GAP], rot: [0, 0, 0], size: [TAB.W * 2 * 0.92, TAB.H * 2 * 0.9], pic: 0 }],
  rest: [0.1, -0.3],
};
