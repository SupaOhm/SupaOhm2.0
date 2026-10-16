import { expect, it } from 'vitest';
import { buildMorphGeometry } from './geometry';
import { OBJECTS, blob } from './objects';

it('builds one morph target per shape on a shared, welded sphere', () => {
  const geo = buildMorphGeometry([OBJECTS.phone.shape, blob], 4);
  // an icosahedron with each edge split into 5 has 10·5²+2 unique vertices
  expect(geo.getAttribute('position').count).toBe(252);
  expect(geo.getIndex()).not.toBeNull();
  expect(geo.morphAttributes.position).toHaveLength(2);
  expect(geo.morphAttributes.normal).toHaveLength(2);
  expect(Array.from(geo.morphAttributes.position[0].array).every(Number.isFinite)).toBe(true);
  expect(Array.from(geo.morphAttributes.normal[1].array).every(Number.isFinite)).toBe(true);
});
