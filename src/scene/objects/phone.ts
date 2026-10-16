import { box } from './box';
import { SCREEN_GAP, type SceneObject } from './types';

export const PHONE = { W: 0.8, H: 1.62, D: 0.085 };

export const phone: SceneObject = {
  shape: (x, y, z) => box(x, y, z, PHONE.W, PHONE.H, PHONE.D, 9),
  planes: [{ pos: [0, 0, PHONE.D + SCREEN_GAP], rot: [0, 0, 0], size: [PHONE.W * 2 * 0.9, PHONE.H * 2 * 0.93], pic: 0 }],
  rest: [0.08, -0.3],
};
