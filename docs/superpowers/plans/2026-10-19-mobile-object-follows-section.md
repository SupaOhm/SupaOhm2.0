# Mobile Object Follows Its Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Below 800px wide, the 3D object (and its still-image fallback) sits in its section's empty top band and scrolls with the page, so section copy never runs over it.

**Architecture:** A pure helper converts a viewport y to world y, and `stepState` names the state the object belongs to (`near`). A small DOM helper (`stageY`) reports the viewport y of a state's stage: the centre of its section's top 55vh, or the phone slot's centre for the slot state. `createScene` gets it as `getStage` and, in narrow mode only, sets the object's y from it without a spring and without the part-heading dip. `SceneLayer` also writes it to a CSS variable for the static still. Desktop code paths do not change.

**Tech Stack:** React 19, three.js 0.170, TypeScript, Vitest + Testing Library (jsdom), headless Chrome capture script (`scripts/capture.mjs`).

**Spec:** `docs/superpowers/specs/2026-10-19-mobile-object-follows-section-design.md`

## Global Constraints

- Desktop (`innerWidth >= 800`) and `centered` (captures) behaviour must not change.
- Narrow is `innerWidth < 800` in JS and `@media (max-width: 799px)` in CSS, as everywhere else in the codebase.
- The stage is the top 55vh of an object section; `STAGE = 0.55` is the single JS source, and the CSS `55vh` carries a comment pointing at it.
- Never add the internal product name or a phone number anywhere: code, content, docs, commits, file names (`tests/content.test.ts` checks this by hash).
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Work on branch `fix/mobile-object-scroll` (already created; the spec is committed there).

## File Map

| File | Change | Responsibility |
|---|---|---|
| `scripts/capture.mjs` | modify | new `strip` mode: 390×844 screenshots a half screen apart, plus contact sheets |
| `src/scene/layout.ts` | modify | `screenToWorldY` |
| `src/scroll/progress.ts` | modify | `STAGE`, `stageCentre` |
| `src/scene/step.ts` | modify | `near` on `StepState` |
| `src/app/stage.ts` | create | `stageY(i, items)`: DOM lookup of a state's stage |
| `src/scene/types.ts` | modify | `SceneOptions.getStage` |
| `src/scene/createScene.ts` | modify | narrow branch: follow the stage, no spring, no dip |
| `src/app/SceneLayer.tsx` | modify | pass `getStage`; set `--stage-y`; pass `slot` to the still |
| `src/app/StaticFallback.tsx` | modify | `slot` prop → `data-slot` |
| `src/styles.css` | modify | still image uses `--stage-y`; hidden for slot on narrow; comment on 55vh |

Run all commands from `/Users/supa/projects/active/supa-port`.

---

### Task 1: Strip capture mode and the "before" baseline

**Files:**
- Modify: `scripts/capture.mjs` (header comment, the `mode` check near line 158, a new `else if` branch before the final `else`)

**Interfaces:**
- Produces: `node scripts/capture.mjs strip` → `review/strip-mobile-<theme>-NN.png` and `review/strip-mobile-<theme>-sheet-N.png` (8 frames per sheet). Needs `npm run preview` running.

- [ ] **Step 1: Document the mode in the header comment**

In the header comment block at the top of `scripts/capture.mjs`, after the `sections` line, add:

```js
//   node scripts/capture.mjs strip     → review/strip-mobile-<theme>-NN.png and -sheet-N.png (the narrow page a half
//                                        screen at a time, to check that no copy runs over the object)
```

- [ ] **Step 2: Accept the mode**

Replace:

```js
if (!['fallback', 'review', 'meta', 'sections'].includes(mode)) {
  console.error('Usage: node scripts/capture.mjs <fallback|review|meta|sections>');
```

with:

```js
if (!['fallback', 'review', 'meta', 'sections', 'strip'].includes(mode)) {
  console.error('Usage: node scripts/capture.mjs <fallback|review|meta|sections|strip>');
```

- [ ] **Step 3: Add the branch**

Insert this branch directly before the final `} else {` (the `review` branch) inside the `try`:

```js
  } else if (mode === 'strip') {
    const outDir = path('../review/');
    mkdirSync(outDir, { recursive: true });
    const [width, height] = [390, 844];
    for (const theme of THEMES) {
      await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
      await page.send('Page.navigate', { url: `${BASE}?theme=${theme}` });
      await sleep(SETTLE_MS);
      const { result } = await page.send('Runtime.evaluate', {
        expression: 'document.documentElement.scrollHeight - innerHeight',
        returnByValue: true,
      });
      const frames = [];
      for (let y = 0; y <= result.value; y += height / 2) {
        await scrollTo(page, y);
        await sleep(1300); // the scroll smoothing and the melt settling
        const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
        const name = `strip-mobile-${theme}-${String(frames.length).padStart(2, '0')}.png`;
        writeFileSync(`${outDir}${name}`, Buffer.from(data, 'base64'));
        frames.push(`${outDir}${name}`);
        console.log(`review/${name}`);
      }
      // contact sheets, 4 × 2 frames each, for reviewing at a glance
      for (let s = 0; s * 8 < frames.length; s++) {
        const set = frames.slice(s * 8, s * 8 + 8);
        await sharp({ create: { width: 4 * (width + 10), height: 2 * (height + 10), channels: 3, background: '#ff0000' } })
          .composite(set.map((input, i) => ({ input, left: (i % 4) * (width + 10), top: Math.floor(i / 4) * (height + 10) })))
          .png()
          .toFile(`${outDir}strip-mobile-${theme}-sheet-${s}.png`);
        console.log(`review/strip-mobile-${theme}-sheet-${s}.png`);
      }
    }
```

- [ ] **Step 4: Build, preview and take the baseline**

```bash
npm run build
npm run preview &   # serves dist on http://127.0.0.1:4173 (leave it running for later tasks; rebuild after code changes)
node scripts/capture.mjs strip
npm run capture:review
mkdir -p review/before-strip && cp review/strip-mobile-* review/mobile-*-p*.png review/desktop-*-p*.png review/before-strip/
```

Expected: about 24 `strip-mobile-<theme>-NN.png` per theme, 3 sheets per theme, and 32 `?p=` stills, all copied into `review/before-strip/` (git-ignored). Open `review/before-strip/strip-mobile-dark-sheet-0.png`: the hero bio should show through the glass blob in frame 2. That is the bug, now on record.

- [ ] **Step 5: Commit**

```bash
git add scripts/capture.mjs
git commit -m "chore(capture): a strip mode that shoots the narrow page a half screen at a time

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Pure helpers: `STAGE`, `stageCentre`, `screenToWorldY`, `near`

**Files:**
- Modify: `src/scroll/progress.ts`, `src/scroll/progress.test.ts`
- Modify: `src/scene/layout.ts`, `src/scene/layout.test.ts`
- Modify: `src/scene/step.ts`, `src/scene/step.test.ts`

**Interfaces:**
- Produces:
  - `export const STAGE = 0.55` and `export function stageCentre(top: number, vh: number): number` from `src/scroll/progress.ts`
  - `export function screenToWorldY(sy: number, vh: number, z = CAMERA_Z): number` from `src/scene/layout.ts`
  - `StepState.near: number` from `src/scene/step.ts`: `k` while `g < 0.5`, else `k + 1`

- [ ] **Step 1: Write the failing tests**

In `src/scroll/progress.test.ts`, extend the import to include `STAGE, stageCentre` and add:

```ts
describe('stageCentre', () => {
  it('is the middle of the top 55% of the viewport below a section top', () => {
    expect(STAGE).toBe(0.55);
    expect(stageCentre(0, 844)).toBeCloseTo(232.1, 6);
    expect(stageCentre(-100, 844)).toBeCloseTo(132.1, 6);
  });
});
```

In `src/scene/layout.test.ts`, change the import to:

```ts
import { stageCentre } from '../scroll/progress';
import { CAMERA_Z, FOV, fitToSlot, placement, screenToWorldY, viewSize } from './layout';
```

and add:

```ts
describe('screenToWorldY', () => {
  const vh = 844;
  const half = viewSize(1).h / 2;

  it('maps the top, middle and bottom of the viewport onto the object plane', () => {
    expect(screenToWorldY(0, vh)).toBeCloseTo(half, 6);
    expect(screenToWorldY(vh / 2, vh)).toBeCloseTo(0, 6);
    expect(screenToWorldY(vh, vh)).toBeCloseTo(-half, 6);
  });

  it('scales with the camera distance', () => {
    expect(screenToWorldY(0, vh, CAMERA_Z - 1.1)).toBeCloseTo((half * (CAMERA_Z - 1.1)) / CAMERA_Z, 6);
  });

  it('puts a section at the viewport top where the narrow placement already sits', () => {
    expect(screenToWorldY(stageCentre(0, vh), vh)).toBeCloseTo(placement(390 / vh, 'narrow').y, 6);
  });
});
```

In `src/scene/step.test.ts`, inside `describe('stepState', …)`, add:

```ts
  it('names the state the object belongs to, switching mid-melt', () => {
    expect(stepState(2.3, N, false).near).toBe(2);
    expect(stepState(2.5, N, false).near).toBe(3);
    expect(stepState(2.7, N, false).near).toBe(3);
    expect(stepState(6, N, false).near).toBe(6);
    expect(stepState(2.3, N, true).near).toBe(2);
    expect(stepState(2.7, N, true).near).toBe(3);
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/scroll/progress.test.ts src/scene/layout.test.ts src/scene/step.test.ts`
Expected: FAIL. `stageCentre`/`STAGE`/`screenToWorldY` are not exported (`is not a function` / `undefined`), and `near` is `undefined`.

- [ ] **Step 3: Implement**

In `src/scroll/progress.ts`, directly after `anchorPoint`:

```ts
/** Narrow screens keep this fraction of the viewport height empty at the top of each object section: its stage. */
export const STAGE = 0.55;

/** Viewport y of the centre of a section's stage, for a section whose top is at viewport y `top`. */
export function stageCentre(top: number, vh: number): number {
  return top + (vh * STAGE) / 2;
}
```

In `src/scene/layout.ts`, directly after `viewSize`:

```ts
/** World y on the object plane (z = 0) of a viewport y (CSS px from the top), for a camera at distance z. */
export function screenToWorldY(sy: number, vh: number, z = CAMERA_Z): number {
  return (1 - (2 * sy) / vh) * (viewSize(1, z).h / 2);
}
```

In `src/scene/step.ts`, add to the `StepState` interface after `g`:

```ts
  /** The state the object belongs to: k for the first half of the melt, k+1 from the middle on. */
  near: number;
```

and in `stepState`, add `near` to all three returned objects, so they read:

```ts
    return { k, g, near, wA: after ? 0 : 1, wBlob: 0, wB: after ? 1 : 0, fade: smoothstep(Math.abs(2 * g - 1), 0, 1), dir };
```

```ts
    return { k, g, near, wA: 1 - e, wBlob: e, wB: 0, fade: 1, dir };
```

```ts
  return { k, g, near, wA: 0, wBlob: 1 - e, wB: e, fade: 1, dir };
```

(`near` is already computed there as `const near = g < 0.5 ? k : k + 1;`.)

- [ ] **Step 4: Run them to see them pass**

Run: `npx vitest run src/scroll/progress.test.ts src/scene/layout.test.ts src/scene/step.test.ts`
Expected: PASS, with all existing tests in those files still passing.

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck
git add src/scroll/progress.ts src/scroll/progress.test.ts src/scene/layout.ts src/scene/layout.test.ts src/scene/step.ts src/scene/step.test.ts
git commit -m "feat: helpers for the narrow stage: its centre, screen-to-world y, and the state the object belongs to

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `stageY`: where a state's stage is on the page

**Files:**
- Create: `src/app/stage.ts`
- Test: `src/app/stage.test.ts`

**Interfaces:**
- Consumes: `stageCentre(top, vh)` from `src/scroll/progress.ts` (Task 2); `SceneItem` (`{ kind, pics, label, slot? }`) from `src/scene/types.ts`.
- Produces: `export function stageY(i: number, items: SceneItem[]): number | null` from `src/app/stage.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/stage.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/app/stage.test.ts`
Expected: FAIL with `Failed to resolve import "./stage"`.

- [ ] **Step 3: Implement**

Create `src/app/stage.ts`:

```ts
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
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/app/stage.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/stage.ts src/app/stage.test.ts
git commit -m "feat: stageY finds where a state's object belongs on a narrow page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The 3D object follows its stage on narrow screens

**Files:**
- Modify: `src/scene/types.ts` (`SceneOptions`)
- Modify: `src/scene/createScene.ts` (imports; `render`: the destructure near line 104, position block near lines 122–137, dip/size near lines 175–178, camera z near line 179)
- Modify: `src/app/SceneLayer.tsx` (the `createScene(…)` options)
- Test: `src/app/SceneLayer.test.tsx`

**Interfaces:**
- Consumes: `screenToWorldY` (Task 2), `StepState.near` (Task 2), `stageY` (Task 3).
- Produces: `SceneOptions.getStage?: (i: number) => number | null`

- [ ] **Step 1: Write the failing tests**

In `src/app/SceneLayer.test.tsx`, add `import { stageCentre } from '../scroll/progress';` to the imports. In `describe('SceneLayer', …)`, add `document.body.querySelectorAll('[data-anchor]').forEach((el) => el.remove());` at the start of the existing `afterEach`, then add:

```ts
  it("gives the scene each state's stage, read from the page", async () => {
    createScene.mockReturnValue(handle());
    render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    await waitFor(() => expect(createScene).toHaveBeenCalled());
    const opts = createScene.mock.calls.at(-1)![2] as SceneOptions;
    const section = document.createElement('section');
    section.dataset.anchor = '3';
    vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({ top: 120 } as DOMRect);
    document.body.append(section);
    expect(opts.getStage?.(3)).toBe(stageCentre(120, window.innerHeight));
    expect(opts.getStage?.(4)).toBeNull();
  });

  it('gives a capture no stages: captures keep the object centred', async () => {
    createScene.mockReturnValue(handle());
    render(<SceneLayer items={SCENE_ITEMS} theme="light" capture />);
    await waitFor(() => expect(createScene).toHaveBeenCalled());
    expect((createScene.mock.calls.at(-1)![2] as SceneOptions).getStage).toBeUndefined();
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/app/SceneLayer.test.tsx`
Expected: the first new test FAILS (`expected undefined to be …`); the capture test passes already.

- [ ] **Step 3: Add the option type**

In `src/scene/types.ts`, inside `SceneOptions`, after `getSlot`:

```ts
  /** Narrow screens: the viewport y (CSS px) of state i's stage, where its object sits; null when the page has none. */
  getStage?: (i: number) => number | null;
```

- [ ] **Step 4: Pass it from SceneLayer**

In `src/app/SceneLayer.tsx`, add `import { stageY } from './stage';` with the other local imports, and in the `createScene(canvas, items, { … })` options add, after the `getSlot` entry:

```ts
          getStage: capture ? undefined : (i) => stageY(i, items),
```

- [ ] **Step 5: Run the SceneLayer tests to see them pass**

Run: `npx vitest run src/app/SceneLayer.test.tsx`
Expected: PASS.

- [ ] **Step 6: Use it in the scene**

In `src/scene/createScene.ts`:

Change the layout import to:

```ts
import { CAMERA_Z, FOV, fitToSlot, placement, screenToWorldY } from './layout';
```

Change the destructure in `render` to:

```ts
    const { k, wA, wBlob, wB, fade, dir, near } = s;
```

Replace the position block, from `// position: opposite the text…` through the closing `}` of the `else` that steps the springs, with:

```ts
    // position: opposite the text, following on a springy, liquid path. Narrow screens instead keep the object in
    // its section's empty top band, moving with the page (a spring would trail the copy and drift over it)
    const mode = opts.centered ? 'centered' : window.innerWidth >= 800 ? 'wide' : 'narrow';
    const place = placement(camera.aspect, mode);
    const camZ = CAMERA_Z - wBlob * 1.1;
    const stageAt = mode === 'narrow' ? (opts.getStage?.(near) ?? null) : null;
    const tx = dir * place.side;
    const ty = stageAt === null ? place.y : screenToWorldY(stageAt, canvas.clientHeight || window.innerHeight, camZ);
    const swellTarget = 1 + 0.2 * wBlob;
    if (!primed || still) {
      posX.set(tx);
      posY.set(ty);
      swell.set(swellTarget);
    } else {
      posX.step(tx, dt);
      if (stageAt === null) posY.step(ty, dt);
      else posY.set(ty);
      swell.step(swellTarget, dt);
    }
```

Replace the dip/size lines:

```ts
    // part headings passing the middle of the screen melt the object down to a droplet
    dipNow = still ? dip : dipNow + (dip - dipNow) * (1 - Math.exp(-dt * 10));
    const size = lerp(swell.x * place.fit, fit?.scale ?? 0, settle) * (1 - 0.82 * dipNow);
    group.scale.set(size * (1 + stretch), size * (1 - stretch * 0.6), size);
    camera.position.z = CAMERA_Z - wBlob * 1.1;
```

with:

```ts
    // part headings passing the middle of the screen melt the object down to a droplet; on narrow screens the
    // headings sit between sections, clear of every stage, so there is nothing to make room for
    dipNow = still ? dip : dipNow + (dip - dipNow) * (1 - Math.exp(-dt * 10));
    const melt = mode === 'narrow' ? 0 : dipNow;
    const size = lerp(swell.x * place.fit, fit?.scale ?? 0, settle) * (1 - 0.82 * melt);
    group.scale.set(size * (1 + stretch), size * (1 - stretch * 0.6), size);
    camera.position.z = camZ;
```

- [ ] **Step 7: Run the whole suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: all tests PASS, no type errors.

- [ ] **Step 8: Check it on the page**

```bash
npm run build && node scripts/capture.mjs strip
```

(The preview server from Task 1 serves the new `dist`; restart it with `npm run preview &` if it was stopped.) Open `review/strip-mobile-dark-sheet-0.png` … `-sheet-2.png`. In every frame, the formed object and the blob must sit in empty space above or below the copy and never behind a line of text. Each object should rise into view as its section's top band arrives and leave upward with it. If a frame still shows copy over the object, stop and report the frame and what is under it before changing anything.

- [ ] **Step 9: Commit**

```bash
git add src/scene/types.ts src/scene/createScene.ts src/app/SceneLayer.tsx src/app/SceneLayer.test.tsx
git commit -m "fix(mobile): the object scrolls with its section instead of sitting over the copy

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The still image follows the stage too

**Files:**
- Modify: `src/app/SceneLayer.tsx` (`onSample`, the `StaticFallback` element)
- Modify: `src/app/StaticFallback.tsx`
- Modify: `src/styles.css` (narrow `.scene-fallback` block near line 618; the comment near line 547)
- Test: `src/app/SceneLayer.test.tsx`

**Interfaces:**
- Consumes: `stageY` (Task 3), `stageCentre` (Task 2).
- Produces: CSS custom property `--stage-y` on `.scene` (px); `StaticFallback` prop `slot?: boolean` → attribute `data-slot`.

- [ ] **Step 1: Write the failing tests**

In `src/app/SceneLayer.test.tsx`, add:

```ts
  it('moves the still image with the current state’s stage', () => {
    vi.mocked(detectSceneMode).mockReturnValue('static');
    const section = document.createElement('section');
    section.dataset.anchor = '1';
    vi.spyOn(section, 'getBoundingClientRect').mockReturnValue({ top: -200 } as DOMRect);
    document.body.append(section);
    const { container } = render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    act(() => scroll.sample?.({ p: 1.2, exit: 0, dip: 0, arrive: 0 }));
    const layer = container.querySelector<HTMLElement>('.scene')!;
    expect(layer.style.getPropertyValue('--stage-y')).toBe(`${stageCentre(-200, window.innerHeight)}px`);
  });

  it('marks the slot state’s still, which narrow screens hide behind the page’s own phone', () => {
    vi.mocked(detectSceneMode).mockReturnValue('static');
    render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    act(() => scroll.sample?.({ p: SCENE_ITEMS.length - 1, exit: 0, dip: 0, arrive: 0 }));
    expect(screen.getByTestId('scene-fallback')).toHaveAttribute('data-slot');
  });
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/app/SceneLayer.test.tsx`
Expected: both new tests FAIL (`--stage-y` is `''`; there is no `data-slot` attribute).

- [ ] **Step 3: Implement the prop**

Replace the body of `src/app/StaticFallback.tsx` with:

```tsx
import { useState } from 'react';
import type { Theme } from '../scene/types';

/**
 * Pre-rendered still of the formed object, shown while the scene loads or when it cannot run.
 * `side` overrides the side the still sits on (the slot state's glow goes on the phone's side);
 * `slot` marks the slot state, whose still narrow screens hide (styles.css).
 */
export function StaticFallback({ state, theme, side, slot }: { state: number; theme: Theme; side?: 'left' | 'right'; slot?: boolean }) {
  const src = `/fallback/${state}-${theme}.webp`;
  const [missing, setMissing] = useState<string | null>(null);
  if (missing === src) return null;
  return (
    <img
      className="scene-fallback"
      data-testid="scene-fallback"
      data-side={side ?? (state % 2 === 0 ? 'right' : 'left')}
      data-slot={slot ? '' : undefined}
      src={src}
      alt=""
      onError={() => setMissing(src)}
    />
  );
}
```

- [ ] **Step 4: Set the variable and pass the prop in SceneLayer**

In `src/app/SceneLayer.tsx`, in `onSample`, replace:

```ts
      setFallbackState(clampState(s.p, items.length));
```

with:

```ts
      // the still (shown while loading or without WebGL) sits on its state's stage on narrow screens (styles.css)
      const state = clampState(s.p, items.length);
      const y = statusRef.current === 'ready' ? null : stageY(state, items);
      if (layerRef.current && y !== null) layerRef.current.style.setProperty('--stage-y', `${y}px`);
      setFallbackState(state);
```

and change the dependency list of that `useCallback` from `[capture, items.length]` to `[capture, items]`.

In the JSX, replace the `StaticFallback` element with:

```tsx
        <StaticFallback
          state={fallbackState}
          theme={theme}
          side={items[fallbackState]?.slot ? 'right' : undefined}
          slot={items[fallbackState]?.slot}
        />
```

- [ ] **Step 5: Update the CSS**

In `src/styles.css`, replace the narrow fallback block:

```css
@media (max-width: 799px) {
  .scene-fallback,
  .scene-fallback[data-side] {
    top: 27.5vh;
```

with:

```css
/* narrow: the still sits on its state's stage and scrolls with it (--stage-y, set by SceneLayer); the slot state's
   still is hidden, since the page draws its own phone in the slot */
@media (max-width: 799px) {
  .scene-fallback[data-slot] {
    display: none;
  }
  .scene-fallback,
  .scene-fallback[data-side] {
    top: var(--stage-y, 27.5vh);
```

(The rest of that block, `right`, `left`, `width` and `transform`, stays.) Then change the comment above the narrow `.panel` rules:

```css
/* narrow: the top 55vh of each object section stays empty for the object */
```

to:

```css
/* narrow: the top 55vh of each object section (its stage, STAGE in src/scroll/progress.ts) stays empty for the object */
```

- [ ] **Step 6: Run the suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: all PASS.

- [ ] **Step 7: Check the still on the page**

```bash
npm run build
```

Then open `http://127.0.0.1:4173/?scene=static&theme=dark` in a 390×844 viewport (Chrome DevTools device mode). Scroll through Best Paper and AckLab: the still image sits in each section's empty top band and leaves upward with it, never behind the copy. At Contact, no still image appears over the page's phone.

- [ ] **Step 8: Commit**

```bash
git add src/app/SceneLayer.tsx src/app/SceneLayer.test.tsx src/app/StaticFallback.tsx src/styles.css
git commit -m "fix(mobile): the still image scrolls with its section too

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Verify against the baseline

**Files:**
- No code changes, unless a check fails. In that case, fix the change in the task that introduced it and commit it there.

- [ ] **Step 1: Full build (typecheck, size budget, placeholder report) and tests**

Run: `npm run build && npm test`
Expected: build succeeds (including `check-size`), all tests pass.

- [ ] **Step 2: Fresh captures**

```bash
node scripts/capture.mjs strip
npm run capture:review
```

- [ ] **Step 3: Compare narrow strips, light and dark**

Open each `review/strip-mobile-<theme>-sheet-N.png` beside `review/before-strip/strip-mobile-<theme>-sheet-N.png`. Pass if:
- no frame shows copy over the formed object or the blob;
- "Experience" and "Research" headings are clear of any object or droplet;
- each object is formed while its section's top band is on screen;
- the contact phone still lands in its slot.

- [ ] **Step 4: Compare `?p=` stills**

For each `review/mobile-<theme>-p<n>.png` and `review/desktop-<theme>-p<n>.png`, compare against the same file in `review/before-strip/`. Desktop must look the same: object position, size and side. The background shimmer is animated, so tiny differences there are expected. Mobile `p0`–`p6` must show the object in the same place as before, because `?p=` puts the section top at the viewport top, which is the stage's rest position.

- [ ] **Step 5: Report**

Report the result: which sheets were checked, any frame that failed, and a pointer to the iOS check from the spec's risk section. That check (whether the object trails the copy by a frame during a fling) has to be done by the user on a real phone. Do not merge; hand the branch back for review.
