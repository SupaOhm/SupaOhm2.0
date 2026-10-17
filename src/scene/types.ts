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
}

export interface SceneHandle {
  setProgress(p: number): void;
  setTheme(theme: Theme): void;
  /** Pause rendering while the canvas is faded out. */
  setActive(active: boolean): void;
  dispose(): void;
}
