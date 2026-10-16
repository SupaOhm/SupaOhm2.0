import { BufferAttribute, BufferGeometry, IcosahedronGeometry, Vector3 } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShapeFn } from './objects/types';

/**
 * One welded sphere with a morph target per shape. Every shape maps the same unit directions,
 * so any two targets blend smoothly. Targets hold absolute positions: with influences summing
 * to 1 the base sphere contributes nothing.
 */
export function buildMorphGeometry(shapes: ShapeFn[], detail: number): BufferGeometry {
  const ico = new IcosahedronGeometry(1, detail);
  ico.deleteAttribute('normal');
  ico.deleteAttribute('uv'); // uv seams would stop vertices from welding
  const geo = mergeVertices(ico);
  ico.dispose();

  const pos = geo.getAttribute('position');
  const count = pos.count;
  const dirs = new Float32Array(count * 3);
  const v = new Vector3();
  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    dirs[i * 3] = v.x;
    dirs[i * 3 + 1] = v.y;
    dirs[i * 3 + 2] = v.z;
  }

  geo.morphAttributes.position = [];
  geo.morphAttributes.normal = [];
  for (const shape of shapes) {
    const target = new BufferGeometry();
    target.setIndex(geo.getIndex());
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) arr.set(shape(dirs[i * 3], dirs[i * 3 + 1], dirs[i * 3 + 2]), i * 3);
    target.setAttribute('position', new BufferAttribute(arr, 3));
    target.computeVertexNormals();
    geo.morphAttributes.position.push(target.getAttribute('position') as BufferAttribute);
    geo.morphAttributes.normal.push(target.getAttribute('normal') as BufferAttribute);
  }
  geo.computeVertexNormals();
  return geo;
}
