export const CAMERA_Z = 9;
export const FOV = 35;

// bounds of the largest formed object (tablet across, laptop up), with room for the swell
const OBJECT_W = 3.7;
const OBJECT_H = 3.3;

/** World-space width and height visible at z = 0 from a camera at distance z. */
export function viewSize(aspect: number, z = CAMERA_Z): { w: number; h: number } {
  const h = 2 * z * Math.tan((FOV * Math.PI) / 360);
  return { w: h * aspect, h };
}

export interface Placement {
  /** Horizontal offset; the object sits at dir * side. */
  side: number;
  y: number;
  /** Uniform scale so the object fits short or narrow viewports. */
  fit: number;
}

export function placement(aspect: number, mode: 'wide' | 'narrow' | 'centered'): Placement {
  const { w, h } = viewSize(aspect);
  if (mode === 'wide') {
    return { side: w * 0.25, y: 0.05, fit: Math.min(1, (w * 0.42) / OBJECT_W, (h * 0.8) / OBJECT_H) };
  }
  if (mode === 'narrow') {
    // centre of the top 55% of the screen: 22.5% of the height above the middle
    return { side: 0, y: h * 0.225, fit: Math.min(1, (w * 0.86) / OBJECT_W, (h * 0.5) / OBJECT_H) };
  }
  return { side: 0, y: 0, fit: Math.min(1, (w * 0.8) / OBJECT_W, (h * 0.8) / OBJECT_H) };
}
