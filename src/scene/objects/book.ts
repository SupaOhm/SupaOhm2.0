import { box } from './box';
import { SCREEN_GAP, type SceneObject } from './types';

/** Open book: two pages in a shallow V, opened by angle A. */
export const BOOK = { W: 1.62, H: 1.12, D: 0.05, A: 0.26 };

const page = (side: -1 | 1, pic: number) => {
  const hw = BOOK.W / 2;
  const z = BOOK.D + SCREEN_GAP;
  return {
    pos: [side * hw * Math.cos(BOOK.A), 0, hw * Math.sin(BOOK.A) + z - 0.2] as [number, number, number],
    rot: [0, -side * BOOK.A, 0] as [number, number, number],
    size: [BOOK.W * 0.9, BOOK.H * 2 * 0.9] as [number, number],
    pic,
  };
};

export const book: SceneObject = {
  shape: (x, y, z) => {
    const [X, Y, Z] = box(x, y, z, BOOK.W, BOOK.H, BOOK.D);
    return [X * Math.cos(BOOK.A), Y, Math.abs(X) * Math.sin(BOOK.A) + Z - 0.2];
  },
  planes: [page(-1, 0), page(1, 1)],
  rest: [0.12, -0.32],
};
