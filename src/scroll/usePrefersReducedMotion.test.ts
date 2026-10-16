import { renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { mockMatchMedia } from '../test/matchMedia';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

it('is false by default', () => {
  const { result } = renderHook(() => usePrefersReducedMotion());
  expect(result.current).toBe(false);
});

it('reports the reduced-motion preference', () => {
  mockMatchMedia(['(prefers-reduced-motion: reduce)']);
  const { result } = renderHook(() => usePrefersReducedMotion());
  expect(result.current).toBe(true);
});
