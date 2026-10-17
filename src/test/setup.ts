import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { mockMatchMedia } from './matchMedia';

beforeEach(() => {
  mockMatchMedia();
  // jsdom has no canvas: return no context quietly instead of logging "not implemented"
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    // a test stubbed storage to throw
  }
  delete document.documentElement.dataset.theme;
});
