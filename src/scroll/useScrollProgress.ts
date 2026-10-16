import { useEffect, useRef } from 'react';
import { anchorPoint, exitFade, progressFromAnchors, scrollYForProgress } from './progress';

export interface ScrollSample {
  /** Object-state progress, 0..n-1. */
  p: number;
  /** 0..1 as the More projects list arrives; the scene fades out by this much. */
  exit: number;
}

/**
 * Measures the [data-anchor] elements and reports progress on every scroll, resize and layout
 * change (fonts and images loading). With initialP, scrolls the page to that progress.
 */
export function useScrollProgress(onSample: (s: ScrollSample) => void, initialP: number | null = null): void {
  const callback = useRef(onSample);
  useEffect(() => {
    callback.current = onSample;
  }, [onSample]);

  useEffect(() => {
    let alive = true;
    let anchors: number[] = [];
    let exitTop = Infinity;
    let frame = 0;

    const measure = () => {
      const vh = window.innerHeight;
      const narrow = window.innerWidth < 800;
      anchors = [...document.querySelectorAll<HTMLElement>('[data-anchor]')]
        .sort((a, b) => Number(a.dataset.anchor) - Number(b.dataset.anchor))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return anchorPoint(r.top + window.scrollY, r.height, vh, narrow);
        });
      const exitEl = document.querySelector<HTMLElement>('[data-scene-exit]');
      exitTop = exitEl ? exitEl.getBoundingClientRect().top + window.scrollY : Infinity;
    };

    const sample = () => {
      frame = 0;
      const y = window.scrollY + window.innerHeight / 2;
      callback.current({ p: progressFromAnchors(y, anchors), exit: exitFade(y, exitTop, window.innerHeight) });
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sample);
    };

    const jumpToInitial = () => {
      if (initialP === null) return;
      window.scrollTo({ top: scrollYForProgress(initialP, anchors, window.innerHeight), behavior: 'instant' });
    };

    const remeasure = () => {
      if (!alive) return;
      measure();
      schedule();
    };

    const settle = () => {
      if (!alive) return;
      measure();
      jumpToInitial();
      schedule();
    };

    measure();
    jumpToInitial();
    sample();

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', remeasure);
    window.addEventListener('load', settle);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(settle);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(remeasure);
    observer?.observe(document.body);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('load', settle);
      observer?.disconnect();
    };
  }, [initialP]);
}
