/** A damped spring integrated in real time; stiffness and damping are per second, so frame rate does not matter. */
export interface Spring {
  x: number;
  v: number;
  step(target: number, dt: number): number;
  set(x: number): void;
}

export function createSpring(x0: number, stiffness: number, damping: number): Spring {
  const s: Spring = {
    x: x0,
    v: 0,
    step(target, dt) {
      let left = Math.min(dt, 0.1); // after a paused tab, take at most a tenth of a second
      while (left > 0) {
        const h = Math.min(left, 1 / 120);
        s.v += (target - s.x) * stiffness * h;
        s.v *= Math.exp(-damping * h);
        s.x += s.v * h;
        left -= h;
      }
      return s.x;
    },
    set(x) {
      s.x = x;
      s.v = 0;
    },
  };
  return s;
}

// The prototype's per-frame springs at 60 fps, converted to per-second constants:
// stiffness = k·60², damping = -ln(d)·60.
export const POSITION_SPRING = { stiffness: 108, damping: 10.5 } as const; // k 0.03, d 0.84
export const SWELL_SPRING = { stiffness: 324, damping: 13.4 } as const; // k 0.09, d 0.8
