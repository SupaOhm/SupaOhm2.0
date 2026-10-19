import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SceneItem } from '../scene/types';
import { stageCentre } from '../scroll/progress';
import { stageY } from './stage';

const items: SceneItem[] = [
  { kind: 'pebble', pics: [], label: 'hero' },
  { kind: 'frame', pics: [], label: 'award' },
  { kind: 'phone', pics: [], label: 'contact', slot: true },
];

function place(el: HTMLElement, top: number, height: number) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ top, height, left: 0, width: 100, right: 100, bottom: top + height, x: 0, y: top, toJSON: () => ({}) });
  document.body.append(el);
}

describe('stageY', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it("is the centre of the top band of the state's section", () => {
    const section = document.createElement('section');
    section.dataset.anchor = '1';
    place(section, -200, 1500);
    expect(stageY(1, items)).toBe(stageCentre(-200, window.innerHeight));
  });

  it("is the phone slot's centre for a slot state", () => {
    const contact = document.createElement('section');
    contact.dataset.anchor = '2';
    place(contact, 0, 900);
    const slot = document.createElement('div');
    slot.dataset.phoneSlot = '';
    place(slot, 500, 300);
    expect(stageY(2, items)).toBe(650);
  });

  it('is null when the page has no such element', () => {
    expect(stageY(0, items)).toBeNull();
    expect(stageY(2, items)).toBeNull();
    expect(stageY(9, items)).toBeNull();
  });
});
