import type { SlotRect } from './types';

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

/** World y on the object plane (z = 0) of a viewport y (CSS px from the top), for a camera at distance z. */
export function screenToWorldY(sy: number, vh: number, z = CAMERA_Z): number {
  return (1 - (2 * sy) / vh) * (viewSize(1, z).h / 2);
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

/**
 * Where to put an object, and how big, so that its front-facing screen (screenH tall, zFront in
 * front of the object's centre, both in object units) covers `rect` exactly in a vw × vh viewport.
 * Assumes the camera at CAMERA_Z on the z axis and an unrotated object.
 */
export function fitToSlot(
  rect: SlotRect,
  vw: number,
  vh: number,
  screenH: number,
  zFront: number,
): { x: number; y: number; scale: number } {
  const t = Math.tan((FOV * Math.PI) / 360);
  const r = rect.height / vh;
  // the screen spans r of the view height at its own depth: screenH * scale = r * 2t * (CAMERA_Z - zFront * scale)
  const scale = (r * 2 * t * CAMERA_Z) / (screenH + r * 2 * t * zFront);
  const depth = CAMERA_Z - zFront * scale;
  const ndcX = ((rect.left + rect.width / 2) / vw) * 2 - 1;
  const ndcY = 1 - ((rect.top + rect.height / 2) / vh) * 2;
  return { x: ndcX * t * (vw / vh) * depth, y: ndcY * t * depth, scale };
}
