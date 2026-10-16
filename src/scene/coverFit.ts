export interface UvWindow {
  scale: [number, number];
  offset: [number, number];
}

/**
 * The part of an image (aspect imgAsp) that covers a plane (aspect planeAsp) without distortion.
 * The crop is centred on `focus` (image coordinates, top-left origin) as far as the image edges allow.
 * Sample the texture at uv * scale + offset (uv y points up, as in three.js).
 */
export function coverFit(planeAsp: number, imgAsp: number, focus: [number, number] = [0.5, 0.5]): UvWindow {
  const wider = imgAsp > planeAsp;
  const sx = wider ? planeAsp / imgAsp : 1;
  const sy = wider ? 1 : imgAsp / planeAsp;
  const ox = Math.min(Math.max(focus[0] - sx / 2, 0), 1 - sx);
  const oy = Math.min(Math.max(1 - focus[1] - sy / 2, 0), 1 - sy);
  return { scale: [sx, sy], offset: [ox, oy] };
}
