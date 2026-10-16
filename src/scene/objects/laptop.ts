import { lerp, smoothstep } from '../math';
import { box } from './box';
import { SCREEN_GAP, type SceneObject } from './types';

/** W half-width, S screen height, D half-thickness, T screen tilt (rad), Y/Z offsets of the hinge. */
export const LAP = { W: 1.62, S: 1.9, D: 0.045, T: 0.2, Y: -0.75, Z: -0.55 };

const screenPlane = () => {
  const h = LAP.S / 2;
  const c = Math.cos(LAP.T);
  const s = Math.sin(LAP.T);
  const z = LAP.D + SCREEN_GAP;
  return {
    pos: [0, h * c + z * s + LAP.Y, -h * s + z * c + LAP.Z] as [number, number, number],
    rot: [-LAP.T, 0, 0] as [number, number, number],
    size: [LAP.W * 2 * 0.92, LAP.S * 0.88] as [number, number],
    pic: 0,
  };
};

/** Half-width of the band (in box Y) over which screen and base blend into a rounded hinge. */
const HINGE = 0.18;

const mapScreen = (X: number, Y: number, Z: number): [number, number, number] => {
  const h = Y * LAP.S;
  return [X, h * Math.cos(LAP.T) + LAP.Y, -h * Math.sin(LAP.T) + Z + LAP.Z];
};

const mapBase = (X: number, Y: number, Z: number): [number, number, number] => [X, -Z + LAP.Y, -Y * LAP.S * 0.85 + LAP.Z];

/** Upper half of the sphere becomes the screen (tilted back), lower half folds forward into the base. */
export const laptop: SceneObject = {
  shape: (x, y, z) => {
    const [X, Y, Z] = box(x, y, z, LAP.W, 1, LAP.D);
    // the two halves disagree about Y = 0, so blend them across a narrow band instead of cutting
    const screen = mapScreen(X, Math.max(Y, 0), Z);
    const base = mapBase(X, Math.min(Y, 0), Z);
    const t = smoothstep(Y, -HINGE, HINGE);
    return [lerp(base[0], screen[0], t), lerp(base[1], screen[1], t), lerp(base[2], screen[2], t)];
  },
  planes: [screenPlane()],
  rest: [0.22, -0.38],
};
