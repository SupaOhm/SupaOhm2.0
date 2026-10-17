import { useEffect, useRef } from 'react';
import { drawLockScreen, lockClock } from './lockScreen';

/** The lock screen for the CSS phone (no WebGL); the 3D phone paints the same picture on its screen. */
export function LockCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let alive = true;
    const paint = () => {
      if (!alive) return;
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      drawLockScreen(ctx, canvas.width, canvas.height, { ...lockClock(new Date()), faceId: 1 });
    };
    paint();
    document.fonts?.ready.then(paint); // the clock is set in Inter Tight
    return () => {
      alive = false;
    };
  }, []);

  return <canvas className="phone-lock" ref={ref} aria-hidden="true" />;
}
