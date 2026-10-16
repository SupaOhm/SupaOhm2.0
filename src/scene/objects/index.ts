import type { ObjectKind } from '../types';
import { blob } from './blob';
import { book } from './book';
import { frame } from './frame';
import { laptop } from './laptop';
import { pebble } from './pebble';
import { phone } from './phone';
import { reader } from './reader';
import { sphere } from './sphere';
import { tablet } from './tablet';
import type { SceneObject } from './types';

export const OBJECTS: Record<ObjectKind, SceneObject> = { pebble, reader, phone, laptop, frame, tablet, sphere };

export { blob, book };

/** Book rule: an item with exactly two pictures becomes an open book, one picture per page. */
export function resolveObject(kind: ObjectKind, picCount: number): SceneObject {
  return picCount === 2 ? book : OBJECTS[kind];
}
