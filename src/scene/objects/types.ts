export type Vec3 = [number, number, number];

/** Maps a unit direction on the base sphere to a point on the object's surface. */
export type ShapeFn = (x: number, y: number, z: number) => Vec3;

/** Where a picture sits on the formed object, in object space. `pic` indexes the item's pictures. */
export interface PlaneSpec {
  pos: Vec3;
  rot: Vec3;
  size: [number, number];
  pic: number;
}

export interface SceneObject {
  shape: ShapeFn;
  planes: PlaneSpec[];
  /** Resting rotation [x, y] while formed; y is mirrored when the object sits on the left. */
  rest: [number, number];
}

/** Pictures float this far in front of the screen face, so the glass never distorts them. */
export const SCREEN_GAP = 0.012;

export const DEFAULT_REST: [number, number] = [0.15, 0];
