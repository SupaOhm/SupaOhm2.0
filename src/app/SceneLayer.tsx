import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SceneHandle, SceneItem, Theme } from '../scene/types';
import { usePrefersReducedMotion } from '../scroll/usePrefersReducedMotion';
import { useScrollProgress, type ScrollSample } from '../scroll/useScrollProgress';
import { detectSceneMode } from './capability';
import { StaticFallback } from './StaticFallback';

type Status = 'loading' | 'ready' | 'static';

const RESTORE_WAIT_MS = 3000;

function readForcedProgress(search: string): number | null {
  const raw = new URLSearchParams(search).get('p');
  if (raw === null || raw.trim() === '') return null;
  const p = Number(raw);
  return Number.isFinite(p) ? p : null;
}

const clampState = (p: number, count: number) => Math.min(Math.max(Math.round(p), 0), count - 1);

export function SceneLayer({ items, theme, capture = false }: { items: SceneItem[]; theme: Theme; capture?: boolean }) {
  const mode = useMemo(detectSceneMode, []);
  const reduced = usePrefersReducedMotion();
  const forcedP = useMemo(() => readForcedProgress(window.location.search), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const progressRef = useRef(forcedP ?? 0);
  const activeRef = useRef(true);
  const themeRef = useRef(theme);
  const [status, setStatus] = useState<Status>(mode === 'static' ? 'static' : 'loading');
  const [generation, setGeneration] = useState(0);
  const [fallbackState, setFallbackState] = useState(clampState(forcedP ?? 0, items.length));

  useEffect(() => {
    themeRef.current = theme;
    handleRef.current?.setTheme(theme);
  }, [theme]);

  // load the scene chunk after first paint; rebuild on context restore, fall back to stills on failure
  useEffect(() => {
    if (mode === 'static') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    let restoreTimer = 0;

    const toStatic = (reason: unknown) => {
      if (!alive) return;
      console.warn('3D scene unavailable; showing still images instead.', reason);
      setStatus('static');
    };
    const onLost = (e: Event) => {
      // Must happen here: our listener runs before three.js's, and dispose() removes three's,
      // so without this the browser never restores the context.
      e.preventDefault();
      handleRef.current?.dispose();
      handleRef.current = null;
      setStatus('loading');
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(() => toStatic('WebGL context lost'), RESTORE_WAIT_MS);
    };
    const onRestored = () => {
      window.clearTimeout(restoreTimer);
      setGeneration((g) => g + 1);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    import('../scene/createScene').then(({ createScene }) => {
      if (!alive) return;
      try {
        const handle = createScene(canvas, items, {
          lite: mode === 'lite',
          reducedMotion: reduced,
          snap: capture || forcedP !== null,
          centered: capture,
          onReady: () => {
            if (alive) setStatus('ready');
          },
        });
        handle.setTheme(themeRef.current);
        handle.setProgress(progressRef.current);
        handle.setActive(activeRef.current); // the page may open already scrolled past the scene
        handleRef.current = handle;
      } catch (err) {
        toStatic(err);
      }
    }, toStatic);

    return () => {
      alive = false;
      window.clearTimeout(restoreTimer);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [mode, reduced, generation, items, capture, forcedP]);

  const onSample = useCallback(
    (s: ScrollSample) => {
      if (capture) return;
      progressRef.current = s.p;
      activeRef.current = s.exit < 1;
      handleRef.current?.setProgress(s.p);
      handleRef.current?.setActive(activeRef.current);
      if (layerRef.current) layerRef.current.style.opacity = String(1 - s.exit);
      setFallbackState(clampState(s.p, items.length));
    },
    [capture, items.length],
  );
  useScrollProgress(onSample, capture ? null : forcedP);

  return (
    <div className="scene" ref={layerRef} aria-hidden="true" data-status={status}>
      {status !== 'static' && <canvas key={generation} ref={canvasRef} />}
      {status !== 'ready' && <StaticFallback state={fallbackState} theme={theme} />}
    </div>
  );
}
