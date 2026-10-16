import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { mockMatchMedia } from './matchMedia';

beforeEach(() => mockMatchMedia());

afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    // a test stubbed storage to throw
  }
  delete document.documentElement.dataset.theme;
});
