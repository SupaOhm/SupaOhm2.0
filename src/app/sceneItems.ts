import { bestPaper } from '../content/award';
import { featured } from '../content/featured';
import type { SceneItem } from '../scene/types';

/** Object states in page order: hero pebble, the Best Paper frame, the five featured items, the contact phone. */
export const SCENE_ITEMS: SceneItem[] = [
  { kind: 'pebble', pics: [], label: 'Supakorn Prayongyam' },
  { kind: bestPaper.object, pics: bestPaper.pics, label: bestPaper.title },
  ...featured.map((f): SceneItem => ({ kind: f.object, pics: f.pics, label: f.title })),
  { kind: 'phone', pics: [], label: 'Say hello.', slot: true },
];
