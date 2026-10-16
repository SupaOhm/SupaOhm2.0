import { smoothstep } from '../math';
import { box } from './box';
import { SCREEN_GAP, type SceneObject } from './types';

export const FRAME = { W: 1.62, H: 1.28, D: 0.13, R: 0.1 };

/** Picture frame: the front face is recessed inside a raised border. */
export const frame: SceneObject = {
  shape: (x, y, z) => {
    const [X, Y, Z] = box(x, y, z, FRAME.W, FRAME.H, FRAME.D, 14);
    if (Z <= 0) return [X, Y, Z];
    const t = Math.max(Math.abs(X) / FRAME.W, Math.abs(Y) / FRAME.H);
    return [X, Y, Z - FRAME.R * (1 - smoothstep(t, 0.8, 0.86))];
  },
  planes: [{ pos: [0, 0, FRAME.D - FRAME.R + SCREEN_GAP], rot: [0, 0, 0], size: [FRAME.W * 2 * 0.78, FRAME.H * 2 * 0.76], pic: 0 }],
  rest: [0.06, -0.28],
};
