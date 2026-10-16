import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScene } from './createScene';
import type { ObjectKind, SceneItem, SceneOptions } from './types';

const kinds: ObjectKind[] = ['pebble', 'reader', 'phone', 'laptop', 'frame', 'tablet', 'sphere'];
const items: SceneItem[] = kinds.map((kind) => ({ kind, pics: [], label: kind }));
const opts: SceneOptions = { lite: false, reducedMotion: false, snap: false, centered: false };

describe('createScene', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects an item list that does not match the palette', () => {
    expect(() => createScene(document.createElement('canvas'), items.slice(0, 3), opts)).toThrow(/expects 7 items/);
  });

  it('throws when WebGL is unavailable, so the caller can show still images', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => createScene(document.createElement('canvas'), items, opts)).toThrow();
  });
});
