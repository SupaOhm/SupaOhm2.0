const SLOW_FRAME_SECONDS = 0.022;

/** Lower the pixel ratio by 0.5 (never below 1) when frames average slower than ~45 fps. */
export function nextPixelRatio(current: number, meanFrameSeconds: number): number {
  if (meanFrameSeconds <= SLOW_FRAME_SECONDS) return current;
  return Math.max(1, current - 0.5);
}
