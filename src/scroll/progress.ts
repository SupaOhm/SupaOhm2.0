import { clamp01 } from '../scene/math';

/**
 * Page-space y that marks an anchor. Wide layouts use the element's centre. Narrow layouts
 * reserve the top 55vh of each section for the object, so the anchor is reached when the
 * section's top meets the top of the viewport.
 */
export function anchorPoint(top: number, height: number, vh: number, narrow: boolean): number {
  return narrow ? top + vh / 2 : top + height / 2;
}

/** p = k + (y - c_k) / (c_{k+1} - c_k) for c_k ≤ y < c_{k+1}, clamped to [0, n-1]. */
export function progressFromAnchors(y: number, anchors: number[]): number {
  const n = anchors.length;
  if (n < 2 || y <= anchors[0]) return 0;
  if (y >= anchors[n - 1]) return n - 1;
  let k = 0;
  while (k < n - 2 && y >= anchors[k + 1]) k++;
  const span = anchors[k + 1] - anchors[k];
  return k + (span > 0 ? (y - anchors[k]) / span : 1);
}

/** The scrollY at which progressFromAnchors returns p (used by ?p= previews). */
export function scrollYForProgress(p: number, anchors: number[], vh: number): number {
  const n = anchors.length;
  if (n === 0) return 0;
  if (n === 1) return Math.max(0, anchors[0] - vh / 2);
  const q = Math.min(Math.max(p, 0), n - 1);
  const k = Math.min(Math.floor(q), n - 2);
  const y = anchors[k] + (q - k) * (anchors[k + 1] - anchors[k]);
  return Math.max(0, y - vh / 2);
}

/** 0 while the exit element's top is in the lower quarter or further down, 1 once it is in the upper quarter. */
export function exitFade(y: number, exitTop: number, vh: number): number {
  return clamp01((y - (exitTop - vh * 0.25)) / (vh * 0.5));
}
