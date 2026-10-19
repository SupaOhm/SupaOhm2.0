import type { SceneItem } from '../scene/types';
import { stageCentre } from '../scroll/progress';

/**
 * Viewport y (CSS px) where state i's object sits on narrow screens: the centre of its section's empty top band,
 * or the centre of the page's phone slot for a slot state. Null when the page has no such element.
 */
export function stageY(i: number, items: SceneItem[]): number | null {
  if (items[i]?.slot) {
    const slot = document.querySelector('[data-phone-slot]');
    if (!slot) return null;
    const r = slot.getBoundingClientRect();
    return r.top + r.height / 2;
  }
  const section = document.querySelector(`[data-anchor="${i}"]`);
  return section ? stageCentre(section.getBoundingClientRect().top, window.innerHeight) : null;
}
