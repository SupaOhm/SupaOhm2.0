import { describe, expect, it } from 'vitest';
import { LAP } from './laptop';
import { OBJECTS, blob, book, resolveObject } from './index';
import { READER } from './reader';
import type { SceneObject, Vec3 } from './types';

/** Evenly spread unit directions (Fibonacci sphere). */
function directions(n: number): Vec3[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * i + 1) / n;
    const r = Math.sqrt(1 - y * y);
    return [Math.cos(golden * i) * r, y, Math.sin(golden * i) * r] as Vec3;
  });
}

const DIRS = directions(1500);
const ALL: Record<string, SceneObject> = { ...OBJECTS, book };
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const unit = (x: number, y: number, z: number): Vec3 => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
};

describe.each(Object.entries(ALL))('%s', (_name, obj) => {
  it('maps every direction to a finite point inside the scene bounds', () => {
    for (const d of DIRS) {
      const p = obj.shape(...d);
      for (const c of p) {
        expect(Number.isFinite(c)).toBe(true);
        expect(Math.abs(c)).toBeLessThan(2.2);
      }
    }
  });

  it('has finite picture planes inside the object and a finite rest angle', () => {
    for (const plane of obj.planes) {
      for (const c of [...plane.pos, ...plane.rot, ...plane.size]) expect(Number.isFinite(c)).toBe(true);
      expect(plane.size[0]).toBeGreaterThan(0);
      expect(plane.size[1]).toBeGreaterThan(0);
      for (const c of plane.pos) expect(Math.abs(c)).toBeLessThan(2.2);
    }
    expect(obj.rest.every(Number.isFinite)).toBe(true);
  });
});

describe('shapes', () => {
  it('blob is a sphere of radius 1.25', () => {
    for (const d of DIRS.slice(0, 50)) expect(Math.hypot(...blob(...d))).toBeCloseTo(1.25);
  });

  it('reader spans its declared half-sizes', () => {
    const xs = DIRS.map((d) => OBJECTS.reader.shape(...d)[0]);
    const ys = DIRS.map((d) => OBJECTS.reader.shape(...d)[1]);
    expect(Math.max(...xs)).toBeCloseTo(READER.W, 1);
    expect(Math.max(...ys)).toBeCloseTo(READER.H, 1);
  });

  // sample along the hinge/spine but never at its centre: (0, ±ε, 0) normalizes to a pole, not the hinge
  const ALONG = [-0.9, -0.5, -0.1, 0.3, 0.7];

  it('laptop: screen and base meet at the hinge', () => {
    for (const x of ALONG) {
      for (const z of [-0.4, 0, 0.4]) {
        const up = OBJECTS.laptop.shape(...unit(x, 1e-4, z));
        const down = OBJECTS.laptop.shape(...unit(x, -1e-4, z));
        expect(dist(up, down)).toBeLessThan(Math.SQRT2 * LAP.D + 0.01);
      }
    }
  });

  it('book: the two pages meet at the spine', () => {
    for (const y of ALONG) {
      for (const z of [-0.4, 0, 0.4]) {
        expect(dist(book.shape(...unit(1e-4, y, z)), book.shape(...unit(-1e-4, y, z)))).toBeLessThan(0.01);
      }
    }
  });

  it('book puts one picture on each page', () => {
    expect(book.planes.map((p) => p.pic)).toEqual([0, 1]);
  });
});

describe('resolveObject (book rule)', () => {
  it('turns an item with exactly two pictures into the open book', () => {
    expect(resolveObject('tablet', 2)).toBe(book);
  });

  it('keeps the declared object otherwise', () => {
    expect(resolveObject('tablet', 1)).toBe(OBJECTS.tablet);
    expect(resolveObject('phone', 0)).toBe(OBJECTS.phone);
    expect(resolveObject('laptop', 3)).toBe(OBJECTS.laptop);
  });
});
