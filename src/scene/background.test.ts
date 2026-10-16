import { Color } from 'three';
import { expect, it } from 'vitest';
import { backgroundCenter, createBackground } from './background';

it('projects the object position onto the background plane', () => {
  expect(backgroundCenter(0, 0, 9)).toEqual([0.9, 0.5]);
  const [u] = backgroundCenter(2.25, 0, 9);
  expect(u).toBeCloseTo((0.5 + (2.25 * 15) / 9 / 40) * 1.8);
});

it('writes frame values into its uniforms', () => {
  const bg = createBackground();
  bg.update({ base: new Color(0, 0, 0), a: new Color(1, 0, 0), b: new Color(0, 1, 0), bar: new Color(0, 0, 1), t: 2, center: [0.4, 0.6], bars: 0 });
  const u = (bg.mesh.material as unknown as { uniforms: Record<string, { value: unknown }> }).uniforms;
  expect((u.uA.value as Color).r).toBe(1);
  expect(u.uBars.value).toBe(0);
  expect(u.uT.value).toBe(2);
  bg.dispose();
});
