import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SceneHandle, SceneOptions } from '../scene/types';
import { mockMatchMedia } from '../test/matchMedia';
import { detectSceneMode } from './capability';
import { SceneLayer } from './SceneLayer';
import { SCENE_ITEMS } from './sceneItems';

const { createScene } = vi.hoisted(() => ({ createScene: vi.fn() }));
vi.mock('../scene/createScene', () => ({ createScene }));
vi.mock('./capability', () => ({ detectSceneMode: vi.fn(() => 'full') }));

const handle = (): SceneHandle => ({ setProgress: vi.fn(), setTheme: vi.fn(), setActive: vi.fn(), dispose: vi.fn() });

describe('SceneLayer', () => {
  beforeEach(() => {
    vi.mocked(detectSceneMode).mockReturnValue('full');
    createScene.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

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
});
