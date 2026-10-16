import { featured } from '../content/featured';
import type { SceneItem } from '../scene/types';

/** Object states in page order: hero pebble, the five featured items, the projects sphere. */
export const SCENE_ITEMS: SceneItem[] = [
  { kind: 'pebble', pics: [], label: 'Supakorn Prayongyam' },
  ...featured.map((f): SceneItem => ({ kind: f.object, pics: f.pics, label: f.title })),
  { kind: 'sphere', pics: [], label: 'Projects' },
];
