import { clamp01, smoothstep } from '../scene/math';

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

/**
 * 0..1 for part headings: 1 while a heading's centre is at y (the middle of the viewport), easing to 0
 * at 0.45 of a viewport away. The scene melts the object down by this much so headings stay clear.
 */
export function dipAmount(y: number, centres: number[], vh: number): number {
  let d = 0;
  for (const c of centres) d = Math.max(d, clamp01(1 - Math.abs(y - c) / (vh * 0.45)));
  return smoothstep(d, 0, 1);
}

/** How far the scene has faded out: in as the exit element arrives, back out as the return element arrives. */
export function sceneFade(y: number, exitTop: number, returnTop: number, vh: number): number {
  return exitFade(y, exitTop, vh) * (1 - exitFade(y, returnTop, vh));
}

/**
 * The contact phone's arrival, 0..1 over one viewport of scrolling: it starts with the return element's top
 * half a screen below the middle and ends with it at the top of the screen (the bottom of the page).
 */
export function arriveAmount(y: number, returnTop: number, vh: number): number {
  return clamp01((y - (returnTop - vh / 2)) / vh);
}

export type PhoneStage = 'off' | 'lock' | 'open';

/** The contact phone's screen along its arrival: dark, the lock screen from halfway, unlocked once landed. */
export function phoneStage(arrive: number): PhoneStage {
  return arrive < 0.5 ? 'off' : arrive < 0.97 ? 'lock' : 'open';
}
