# Mobile: the object scrolls with its section

Date: 2026-10-19. Builds on `2026-10-16-portfolio-liquid-objects-design.md` and `2026-10-18-lower-parts-design.md`.

## 1. Problem

Below 800px wide, each object section keeps its top 55vh empty for the object (`styles.css`, the narrow `.panel` rule), and `placement(…, 'narrow')` puts the object at the centre of the top 55% of the **screen**. The object is fixed there while the copy scrolls normally, so as soon as a section's body text scrolls up it runs under the object or the melt blob. A 390×844 scroll strip, taken a half screen at a time, shows:

- The hero bio, the Group internship copy and the ESNIDSaaS copy are read through the glass blob.
- "Research" and its line sit on the formed tablet, because the part-heading dip leaves a droplet in place.
- The AckLab copy runs across the tablet's screen, and the MA-ZeroPhish copy runs under the phone.

Each section reads cleanly only at its top.

## 2. Goal

On narrow screens the object belongs to its section: it sits in that section's empty top band and scrolls away with it, as on Apple's mobile product pages. Text and object never share screen space. Desktop is unchanged.

Chosen in brainstorming: **scrolls with its section** (over "text on a frosted panel over a pinned object" and "pinned object that fades as text rises").

## 3. Terms

- **Stage**: the top 55vh of an object section (`[data-anchor]` elements for states 0–6: the hero, Best Paper, the five featured items). It is the section's top padding on narrow screens; no new DOM.
- **Stage centre**: the viewport y of `sectionRect.top + 0.275 × innerHeight`.
- **Near state**: `k` while the melt phase `g < 0.5`, else `k + 1`. `stepState` already uses this to pick `dir`.

## 4. Behaviour (narrow only: `innerWidth < 800`, not `centered`)

1. **Follow the stage.** Each frame, the object's y is the world-space y of the near state's stage centre. x stays 0 and the scale stays `placement(…, 'narrow').fit`. The object moves 1:1 with the page, so its stage's empty band always contains it.
2. **Hand-over in the melt.** The outgoing object follows its own stage as it melts and scrolls up. At `g = 0.5`, where it is entirely blob, the object switches to the next state's stage and sets from blob into the next object as that stage rises into view. Narrow anchors stay as they are (`anchorPoint`: `p = k` when section k's top meets the viewport top), so `g = 0.5` falls at least 50vh of scroll past section k's top. By then the outgoing blob's centre is above the screen, and the jump to the stage below isn't noticeable.
3. **No springs for y on narrow.** `posY` is set directly, not stepped, while following a stage. A spring would trail behind the page and drift over the copy. x has no motion on narrow anyway.
4. **No dip on narrow.** The part-heading dip (`setDip`) scales the object by 1 on narrow. Headings sit between sections, outside any stage, and the stage rule keeps them clear.
5. **The slot state (contact phone, state 7)** uses the centre of the page's phone slot (`[data-phone-slot]`) as its stage, not the Contact section's top band, which holds the "Say hello." copy on narrow screens. The blob forms at the slot, and `fitToSlot` takes over as it settles, as it does today. Between state 6 and 7 the scene is faded out anyway (project wall and About).
6. **Reduced motion** keeps its fade swap. The stage rule applies unchanged: the object fades out on stage k and fades in on stage k+1.
7. **`?p=` previews and captures** snap the scroll so section k's top is at the viewport top, which is the stage's rest position, so stills look as they do now.

Wide (`≥ 800`) and `centered` keep the current `placement` path exactly.

## 5. Units

### 5.1 `src/scene/layout.ts`: `screenToWorldY`

```ts
/** World y at z = 0 of a viewport y (CSS px from the top), for a camera at distance z on the z axis. */
export function screenToWorldY(sy: number, vh: number, z = CAMERA_Z): number
```

It returns `(1 - 2 * sy / vh) * viewSize(1, z).h / 2`; the visible height does not depend on the aspect ratio. The caller passes the live camera z (`CAMERA_Z - wBlob * 1.1`) so the blob stays on its stage as the camera dollies in.

### 5.2 `src/scene/types.ts`: `SceneOptions.getStage`

```ts
/** Viewport y (CSS px) of state i's stage centre on narrow screens; null when the state has no section. */
getStage?: (i: number) => number | null;
```

### 5.3 `src/scene/createScene.ts`: the narrow branch

In `render`, when the mode is `'narrow'` and `opts.getStage` returns a number for the near state:

- `ty = screenToWorldY(stageY, h, CAMERA_Z - wBlob * 1.1)`, and `posY.set(ty)` (no spring).
- The dip factor in `size` uses `dipNow * (mode === 'narrow' ? 0 : 1)`.

When `getStage` returns null, the current `place.y` path is used. The near state comes from the same `g < 0.5` rule as `dir`, which `stepState` already computes. Expose it as `near` on `StepState` so there is one definition.

### 5.4 `src/app/stage.ts` and `SceneLayer.tsx`: providing stages

Add `export const STAGE = 0.55` and `stageCentre(top, vh) = top + vh * STAGE / 2` in `src/scroll/progress.ts`, next to `anchorPoint`, whose comment already describes the 55vh band. CSS keeps `55vh` with a comment pointing at `STAGE`.

In `src/app/stage.ts`, `stageY(i, items)` returns:

- for a slot item, the centre of `[data-phone-slot]`'s rect;
- otherwise, `stageCentre([data-anchor="i"].top, innerHeight)`;
- null when the element is missing.

When not capturing, `SceneLayer` passes `getStage: (i) => stageY(i, items)`.

### 5.5 Static fallback on narrow

`StaticFallback` is `position: fixed` at `top: 27.5vh` on narrow, so it overlaps the copy the same way. On narrow, `SceneLayer` sets `--stage-y` on the fallback image from the same stage centre on every scroll sample (it already gets one per frame through `useScrollProgress`). The variable is set on the `.scene` layer and inherited by the image. The narrow CSS uses `top: var(--stage-y, 27.5vh)`. The state shown is `round(p)`; that rounds at `g = 0.5` like the near state, so the still swaps stages at the same point the 3D object does. On narrow screens the still is hidden for the slot state (`data-slot`), because the page's CSS phone already draws itself in the slot.

## 6. Out of scope

- Desktop layout, object choice, the melt timing (`stepState` hold/melt split) and the narrow anchors.
- The About rail and the project wall. The strip shows About's swipe panels scrolled out of view in one frame; that is a separate issue.
- Making the text panel or copy layout different on phones.

## 7. Testing

- `layout.test.ts`: `screenToWorldY` maps the top, middle and bottom of the viewport to `+h/2`, `0` and `-h/2`, and scales with z.
- `step.test.ts`: `near` is `k` below `g = 0.5` and `k + 1` from it, including under reduced motion.
- `progress.test.ts`: `stageCentre`. `layout.test.ts`: the stage centre of a section at the viewport top lands on today's `placement(…, 'narrow').y`.
- `stage.test.ts`: `stageY` gives the anchor's top plus 27.5% of the viewport, the slot's centre for a slot item, and null for a missing element.
- `SceneLayer.test.tsx`: the scene gets `getStage` (none when capturing), and the still's `--stage-y` follows the current state; a slot state's still has `data-slot`.
- `createScene`'s `render` needs WebGL, which jsdom lacks, so its narrow branch is a few lines over the tested helpers, and the strip below checks it.
- Visual, required before calling it done: the half-screen scroll strip at 390×844, light and dark. No frame may have copy over the formed object or the blob. Take the same strip on `main` first and compare against it. Repeat `npm run capture:review` at mobile to check the `?p=` stills are unchanged.
- Desktop regression: `npm run capture:review` desktop stills match the current ones.

## 8. Risk

On iOS, momentum scrolling runs on the compositor. The canvas is redrawn in rAF from `getBoundingClientRect`, so the object may trail the copy by a frame (a few pixels) during a fling. Headless Chrome can't show this, so check it once on a real phone. If it is visible, a mitigation (not in scope unless needed) is a small CSS `translateY` on the canvas from the same scroll sample, so the canvas moves with the compositor.
