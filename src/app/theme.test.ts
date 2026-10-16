import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockMatchMedia } from '../test/matchMedia';
import { initialTheme, readStoredTheme, useTheme } from './theme';

describe('initialTheme', () => {
  it('uses the system preference when nothing is stored', () => {
    expect(initialTheme('', null, true)).toBe('dark');
    expect(initialTheme('', null, false)).toBe('light');
  });

  it('prefers a stored choice over the system', () => {
    expect(initialTheme('', 'light', true)).toBe('light');
  });

  it('lets ?theme= override everything', () => {
    expect(initialTheme('?theme=dark', 'light', false)).toBe('dark');
  });

  it('ignores unknown ?theme= values', () => {
    expect(initialTheme('?theme=blue', null, false)).toBe('light');
  });
});

describe('useTheme', () => {
  afterEach(() => vi.restoreAllMocks());

  it('defaults to the system theme and writes it to the root element', () => {
    mockMatchMedia(['(prefers-color-scheme: dark)']);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('toggles and remembers the choice', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('still works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredTheme()).toBeNull();
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
  });
});
