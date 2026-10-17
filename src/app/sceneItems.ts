import { bestPaper } from '../content/award';
import { featured } from '../content/featured';
import type { SceneItem } from '../scene/types';

/** Object states in page order: hero pebble, the Best Paper e-reader, the featured items that have an object, the projects sphere. */
export const SCENE_ITEMS: SceneItem[] = [
  { kind: 'pebble', pics: [], label: 'Supakorn Prayongyam' },
  { kind: bestPaper.object, pics: bestPaper.pics, label: bestPaper.title },
  ...featured.flatMap((f): SceneItem[] => (f.object ? [{ kind: f.object, pics: f.pics, label: f.title }] : [])),
  { kind: 'sphere', pics: [], label: 'Projects' },
];
