import { useCallback, useEffect, useState } from 'react';
import type { Theme } from '../scene/types';

export type { Theme };

const KEY = 'theme';
const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark';

export function readStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return isTheme(v) ? v : null;
  } catch {
    return null;
  }
}

function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // storage blocked: the choice lasts for this visit only
  }
}

/** ?theme= wins, then a stored choice, then the system preference. */
export function initialTheme(search: string, stored: Theme | null, systemDark: boolean): Theme {
  const forced = new URLSearchParams(search).get('theme');
  if (isTheme(forced)) return forced;
  return stored ?? (systemDark ? 'dark' : 'light');
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() =>
    initialTheme(
      window.location.search,
      readStoredTheme(),
      window.matchMedia('(prefers-color-scheme: dark)').matches,
    ),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      storeTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
