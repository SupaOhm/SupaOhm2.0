export type Theme = 'light' | 'dark';

export type ObjectKind = 'pebble' | 'reader' | 'phone' | 'laptop' | 'frame' | 'tablet' | 'sphere';

/** A page element's box in viewport CSS pixels (from getBoundingClientRect). */
export interface SlotRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ScenePic {
  src: string;
  /** Crop centre in image coordinates (0..1, top-left origin). */
  focus?: [number, number];
}

/** One object state: what the object becomes and the pictures shown on it. */
export interface SceneItem {
  kind: ObjectKind;
  pics: ScenePic[];
  label: string;
  /** The page draws this state's screen: the object settles face-on behind the page's slot (SceneOptions.getSlot). */
  slot?: boolean;
}

export interface SceneOptions {
  /** Lower geometry detail, no transmission, no light-bars. */
  lite: boolean;
  /** No melt, spin, sway or springs; objects fade out and in. */
  reducedMotion: boolean;
  /** Jump straight to the target progress (used for ?p= previews and captures). */
  snap: boolean;
  /** Keep the object in the middle of the canvas (used for fallback captures). */
  centered: boolean;
  /** Called once, after the first frame is drawn. */
  onReady?: () => void;
  /** The page's slot rect for a `slot` state, in viewport CSS pixels; null when there is none. */
  getSlot?: () => SlotRect | null;
  /** Narrow screens: the viewport y (CSS px) of state i's stage, where its object sits; null when the page has none. */
  getStage?: (i: number) => number | null;
  /** Called when a `slot` state settles over its slot (true) or leaves it (false). */
  onSlotChange?: (on: boolean) => void;
}

export interface SceneHandle {
  setProgress(p: number): void;
  setTheme(theme: Theme): void;
  /** 0..1: a part heading is passing the middle of the screen; the object melts down to a droplet. */
  setDip(d: number): void;
  /** 0..1: the slot state's arrival; it rolls in edge-on from the right and lands face-on at 1. */
  setArrive(a: number): void;
  /** Pause rendering while the canvas is faded out. */
  setActive(active: boolean): void;
  dispose(): void;
}
