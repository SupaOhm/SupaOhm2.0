import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SceneHandle, SceneOptions } from '../scene/types';
import { mockMatchMedia } from '../test/matchMedia';
import { detectSceneMode } from './capability';
import { SceneLayer } from './SceneLayer';
import { SCENE_ITEMS } from './sceneItems';

const { createScene, scroll } = vi.hoisted(() => ({
  createScene: vi.fn(),
  scroll: { sample: null as null | ((s: { p: number; exit: number }) => void) },
}));
vi.mock('../scroll/useScrollProgress', () => ({
  useScrollProgress: (onSample: (s: { p: number; exit: number }) => void) => {
    scroll.sample = onSample;
  },
}));
vi.mock('../scene/createScene', () => ({ createScene }));
vi.mock('./capability', () => ({ detectSceneMode: vi.fn(() => 'full') }));

const handle = (): SceneHandle => ({ setProgress: vi.fn(), setTheme: vi.fn(), setActive: vi.fn(), dispose: vi.fn() });

describe('SceneLayer', () => {
  beforeEach(() => {
    vi.mocked(detectSceneMode).mockReturnValue('full');
    createScene.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  it('passes the reduced-motion preference to the scene', async () => {
    mockMatchMedia(['(prefers-reduced-motion: reduce)']);
    createScene.mockReturnValue(handle());
    render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    await waitFor(() => expect(createScene).toHaveBeenCalled());
    const opts = createScene.mock.calls.at(-1)![2] as SceneOptions;
    expect(opts).toMatchObject({ reducedMotion: true, lite: false, snap: false, centered: false });
  });

  it('shows the still image when WebGL creation throws', async () => {
    createScene.mockImplementation(() => {
      throw new Error('Error creating WebGL context.');
    });
    const { container } = render(<SceneLayer items={SCENE_ITEMS} theme="dark" />);
    await waitFor(() => expect(container.querySelector('.scene')).toHaveAttribute('data-status', 'static'));
    expect(container.querySelector('canvas')).toBeNull();
    expect(screen.getByTestId('scene-fallback')).toHaveAttribute('src', '/fallback/0-dark.webp');
  });

  it('hides the still image once the scene has drawn its first frame', async () => {
    createScene.mockImplementation((_c: HTMLCanvasElement, _i: unknown, o: SceneOptions) => {
      o.onReady?.();
      return handle();
    });
    const { container } = render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    await waitFor(() => expect(container.querySelector('.scene')).toHaveAttribute('data-status', 'ready'));
    expect(screen.queryByTestId('scene-fallback')).toBeNull();
  });

  it('never loads the scene when the device cannot run it', () => {
    vi.mocked(detectSceneMode).mockReturnValue('static');
    const { container } = render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    expect(container.querySelector('.scene')).toHaveAttribute('data-status', 'static');
    expect(createScene).not.toHaveBeenCalled();
    expect(screen.getByTestId('scene-fallback')).toBeInTheDocument();
  });

  it('forwards theme changes to a running scene', async () => {
    const h = handle();
    createScene.mockReturnValue(h);
    const { rerender } = render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    await waitFor(() => expect(h.setTheme).toHaveBeenCalledWith('light'));
    rerender(<SceneLayer items={SCENE_ITEMS} theme="dark" />);
    expect(h.setTheme).toHaveBeenLastCalledWith('dark');
  });

  it('clamps a forced progress beyond the last state to the last still', () => {
    vi.mocked(detectSceneMode).mockReturnValue('static');
    window.history.replaceState(null, '', '/?p=9');
    render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    expect(screen.getByTestId('scene-fallback')).toHaveAttribute('src', '/fallback/6-light.webp');
  });

  it('clamps scroll progress to the available stills', () => {
    vi.mocked(detectSceneMode).mockReturnValue('static');
    render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    act(() => scroll.sample!({ p: 6.4, exit: 0 }));
    expect(screen.getByTestId('scene-fallback')).toHaveAttribute('src', '/fallback/6-light.webp');
    act(() => scroll.sample!({ p: -0.8, exit: 0 }));
    expect(screen.getByTestId('scene-fallback')).toHaveAttribute('src', '/fallback/0-light.webp');
  });

  describe('WebGL context loss', () => {
    async function mountReady() {
      const h = handle();
      createScene.mockReturnValue(h);
      const view = render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
      await waitFor(() => expect(createScene).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(h.setActive).toHaveBeenCalled());
      const canvas = view.container.querySelector('canvas')!;
      return { h, canvas, scene: view.container.querySelector('.scene')! };
    }

    it('disposes the scene, then falls back to stills if the context is not restored in time', async () => {
      const { h, canvas, scene } = await mountReady();
      vi.useFakeTimers();
      const lost = new Event('webglcontextlost', { cancelable: true });
      act(() => {
        canvas.dispatchEvent(lost);
      });
      expect(lost.defaultPrevented).toBe(true);
      expect(h.dispose).toHaveBeenCalled();
      expect(scene).toHaveAttribute('data-status', 'loading');
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(scene).toHaveAttribute('data-status', 'static');
    });

    it('rebuilds the scene on a fresh canvas when the context is restored in time', async () => {
      const { canvas, scene } = await mountReady();
      vi.useFakeTimers();
      act(() => {
        canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      });
      act(() => {
        canvas.dispatchEvent(new Event('webglcontextrestored'));
      });
      expect(scene.querySelector('canvas')).not.toBe(canvas);
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(scene).not.toHaveAttribute('data-status', 'static');
      vi.useRealTimers();
      await waitFor(() => expect(createScene).toHaveBeenCalledTimes(2));
      expect(scene).not.toHaveAttribute('data-status', 'static');
    });

    it('keeps no stray fallback timer after repeated losses followed by a restore', async () => {
      const { canvas, scene } = await mountReady();
      vi.useFakeTimers();
      act(() => {
        canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
        canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      });
      act(() => {
        canvas.dispatchEvent(new Event('webglcontextrestored'));
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(scene).not.toHaveAttribute('data-status', 'static');
      vi.useRealTimers();
      await waitFor(() => expect(createScene).toHaveBeenCalledTimes(2));
    });
  });
});
