import { expect, it, vi } from 'vitest';
import { createPictures, isPlaceholder } from './pictures';

it('recognises placeholder screenshots by name', () => {
  expect(isPlaceholder('/shots/acklab.placeholder.webp')).toBe(true);
  expect(isPlaceholder('/shots/baka.webp')).toBe(false);
});

it('makes no planes for an object without screens', () => {
  const set = createPictures([], [], 'Hero', 1);
  expect(set.group.children).toHaveLength(0);
  set.setAmount(1);
  expect(set.group.visible).toBe(true);
  set.setAmount(0);
  expect(set.group.visible).toBe(false);
  set.dispose();
});

it('draws pictures after the object so the screen face never covers them', () => {
  const set = createPictures(
    [{ pos: [0, 0, -0.5], rot: [0, 0, 0], size: [1.6, 1], pic: 0 }],
    [{ src: '/shots/baka.webp' }],
    'Baka Co.',
    1,
  );
  expect(set.group.children).toHaveLength(1);
  expect(set.group.children[0].renderOrder).toBe(1);
  set.dispose();
});

it('sizes placeholder text from the shorter side so portrait screens are not squeezed', () => {
  const fonts: string[] = [];
  const ctx = { fillRect: vi.fn(), fillText: vi.fn(), set font(f: string) { fonts.push(f); } };
  const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  const set = createPictures(
    [{ pos: [0, 0, 0], rot: [0, 0, 0], size: [1, 2], pic: 0 }],
    [{ src: '/shots/phone.placeholder.webp' }],
    'MA-ZeroPhish',
    1,
  );
  // portrait: 256 x 512 tile, so the headline is 7.5% of 256, not of 512
  expect(fonts[0]).toContain(`${Math.round(256 * 0.075)}px`);
  set.dispose();
  spy.mockRestore();
});
