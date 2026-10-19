import { useState } from 'react';
import type { Theme } from '../scene/types';

/**
 * Pre-rendered still of the formed object, shown while the scene loads or when it cannot run.
 * `side` overrides the side the still sits on (the slot state's glow goes on the phone's side);
 * `slot` marks the slot state, whose still narrow screens hide (styles.css).
 */
export function StaticFallback({ state, theme, side, slot }: { state: number; theme: Theme; side?: 'left' | 'right'; slot?: boolean }) {
  const src = `/fallback/${state}-${theme}.webp`;
  const [missing, setMissing] = useState<string | null>(null);
  if (missing === src) return null;
  return (
    <img
      className="scene-fallback"
      data-testid="scene-fallback"
      data-side={side ?? (state % 2 === 0 ? 'right' : 'left')}
      data-slot={slot ? '' : undefined}
      src={src}
      alt=""
      onError={() => setMissing(src)}
    />
  );
}
