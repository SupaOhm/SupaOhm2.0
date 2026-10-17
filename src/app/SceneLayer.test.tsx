import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SceneHandle, SceneOptions } from '../scene/types';
import { mockMatchMedia } from '../test/matchMedia';
import { detectSceneMode } from './capability';
import { SceneLayer } from './SceneLayer';
import { SCENE_ITEMS } from './sceneItems';

const { createScene, scroll } = vi.hoisted(() => ({
  createScene: vi.fn(),
  scroll: { sample: null as null | ((s: { p: number; exit: number; dip: number; arrive: number }) => void) },
}));
vi.mock('../scroll/useScrollProgress', () => ({
  useScrollProgress: (onSample: (s: { p: number; exit: number; dip: number; arrive: number }) => void) => {
    scroll.sample = onSample;
  },
}));
vi.mock('../scene/createScene', () => ({ createScene }));
vi.mock('./capability', () => ({ detectSceneMode: vi.fn(() => 'full') }));

const handle = (): SceneHandle => ({ setProgress: vi.fn(), setTheme: vi.fn(), setActive: vi.fn(), setDip: vi.fn(), setArrive: vi.fn(), dispose: vi.fn() });

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

  it('forwards the heading dip to a running scene', async () => {
    const h = handle();
    createScene.mockReturnValue(h);
    render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    await waitFor(() => expect(createScene).toHaveBeenCalled());
    act(() => scroll.sample!({ p: 2, exit: 0, dip: 0.7, arrive: 0 }));
    expect(h.setDip).toHaveBeenLastCalledWith(0.7);
  });

  it('clamps a forced progress beyond the last state to the last still', () => {
    vi.mocked(detectSceneMode).mockReturnValue('static');
    window.history.replaceState(null, '', '/?p=9');
    render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    expect(screen.getByTestId('scene-fallback')).toHaveAttribute('src', '/fallback/7-light.webp');
  });

  it("puts the slot state's still on the phone's side", () => {
    vi.mocked(detectSceneMode).mockReturnValue('static');
    window.history.replaceState(null, '', '/?p=7');
    render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    expect(screen.getByTestId('scene-fallback')).toHaveAttribute('data-side', 'right');
  });

  it('clamps scroll progress to the available stills', () => {
    vi.mocked(detectSceneMode).mockReturnValue('static');
    render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    act(() => scroll.sample!({ p: 7.4, exit: 0, dip: 0, arrive: 0 }));
    expect(screen.getByTestId('scene-fallback')).toHaveAttribute('src', '/fallback/7-light.webp');
    act(() => scroll.sample!({ p: -0.8, exit: 0, dip: 0, arrive: 0 }));
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

    it('falls back and warns once when the context is lost twice without a restore', async () => {
      const { canvas, scene } = await mountReady();
      vi.useFakeTimers();
      act(() => {
        canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
        canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      });
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(scene).toHaveAttribute('data-status', 'static');
      expect(console.warn).toHaveBeenCalledTimes(1);
    });
  });

  describe('contact phone slot', () => {
    const renderWithSlot = () =>
      render(
        <>
          <SceneLayer items={SCENE_ITEMS} theme="light" />
          <div data-testid="slot" data-phone-slot />
        </>,
      );

    it('lets the slot draw its own phone while there is no scene', () => {
      vi.mocked(detectSceneMode).mockReturnValue('static');
      renderWithSlot();
      expect(screen.getByTestId('slot')).not.toHaveAttribute('data-scene');
    });

    it('hides the slot until the scene has settled the phone behind it', async () => {
      createScene.mockImplementation((_c: HTMLCanvasElement, _i: unknown, o: SceneOptions) => {
        o.onReady?.();
        return handle();
      });
      renderWithSlot();
      const slot = screen.getByTestId('slot');
      await waitFor(() => expect(slot).toHaveAttribute('data-scene', 'arriving'));
      const opts = createScene.mock.calls.at(-1)![2] as SceneOptions;
      act(() => opts.onSlotChange!(true));
      expect(slot).toHaveAttribute('data-scene', 'on');
      act(() => opts.onSlotChange!(false));
      expect(slot).toHaveAttribute('data-scene', 'arriving');
      expect(opts.getSlot!()).toEqual({ left: 0, top: 0, width: 0, height: 0 });
    });

    it('marks the screen stage as the phone arrives, in every mode', () => {
      vi.mocked(detectSceneMode).mockReturnValue('static');
      renderWithSlot();
      const slot = screen.getByTestId('slot');
      act(() => scroll.sample!({ p: 7, exit: 0, dip: 0, arrive: 0.2 }));
      expect(slot).toHaveAttribute('data-stage', 'off');
      act(() => scroll.sample!({ p: 7, exit: 0, dip: 0, arrive: 0.6 }));
      expect(slot).toHaveAttribute('data-stage', 'lock');
      act(() => scroll.sample!({ p: 7, exit: 0, dip: 0, arrive: 1 }));
      expect(slot).toHaveAttribute('data-stage', 'open');
    });

    it('forwards the arrival to a running scene', async () => {
      const h = handle();
      createScene.mockReturnValue(h);
      renderWithSlot();
      await waitFor(() => expect(createScene).toHaveBeenCalled());
      act(() => scroll.sample!({ p: 7, exit: 0, dip: 0, arrive: 0.4 }));
      expect(h.setArrive).toHaveBeenLastCalledWith(0.4);
    });
  });
});
