# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Single-page portfolio (Vite + React 19 + TypeScript + three.js r170, Node ≥ 20.19). As you scroll, one 3D object morphs into a device for each CV item and melts into liquid glass between items. Design specs and implementation plans are in `docs/superpowers/specs/` and `docs/superpowers/plans/`. Read the relevant spec before you change behaviour.

## Commands

```bash
npm run dev                         # dev server
npm test                            # vitest run: unit, component and content checks (jsdom)
npx vitest run src/scene/step.test.ts      # a single file
npx vitest run -t "lists all ten projects" # a single test, by name
npm run typecheck                   # tsc --noEmit
npm run build                       # typecheck + vite build + scene size budget + placeholder report
npm run preview                     # serve dist/ at http://127.0.0.1:4173 (the capture scripts need this running)
npm run capture:fallback            # regenerate public/fallback/<state>-<theme>.webp stills (commit them)
npm run capture:review              # screenshots of every state into review/ (git-ignored)
npm run capture:sections            # scrolled shots of the project wall, About and Contact into review/
npm run capture:meta                # after capture:fallback: og.png and the icons in public/
node scripts/capture.mjs strip      # narrow page, half a screen at a time: checks that no copy runs over the object
```

`scripts/capture.mjs` drives headless Chrome over the DevTools protocol. It reads `CHROME` (default: the macOS Chrome path) and `BASE_URL` (default `http://127.0.0.1:4173/`).

URL parameters for previews:
- `?p=3` snaps to a state.
- `&theme=dark` sets the theme.
- `&scene=full|lite|static` forces a renderer.
- `?capture=1` renders only the centred object. Fallback captures use it.

## Build gates

- `scripts/check-size.mjs` fails the build in two cases:
  - three.js turns up in the entry chunk.
  - The lazily loaded scene chunk is over 220 KB gzipped.

  The scene must only ever be loaded with `import('../scene/createScene')`. Never import three.js or `src/scene/*` statically from `src/app` or `src/ui`; type-only imports are fine.
- `tests/content.test.ts` scans every file in the repo, including docs and scripts. It fails if:
  - The internal product name at Mizuhada appears. It is matched by SHA-256, so never write it anywhere, not even in comments or docs. Call it "an enterprise multi-agent RAG assistant".
  - The owner's phone number appears.
  - A link is not https, or points somewhere other than the owner's public profiles.
  - A screenshot path points at a missing file.

  Content order and counts are also asserted: five featured items, ten projects, and the grouping of the parts.

## Architecture

**Page and scene are separate layers.** `src/app/App.tsx` renders a fixed `SceneLayer` (the canvas, `aria-hidden`) behind the normal DOM sections in `<main>`. All copy lives in `src/content/*.ts`. The UI components in `src/ui/` only present it.

**Scroll → progress → scene.**
- `src/scroll/useScrollProgress.ts` measures every `[data-anchor="i"]` element.
- `src/scroll/progress.ts` turns the scroll position into a `ScrollSample`:
  - `p`: state progress, 0..n-1.
  - `dip`: a part heading is near the centre, so the object melts down to stay clear of it.
  - `exit`: the scene fades out over the project wall and About.
  - `arrive`: the contact phone rolls in.
- `SceneLayer` pushes the sample into the `SceneHandle` imperatively, with no re-render per frame.

The anchor numbering is load-bearing, and `App.tsx` assigns it:

| Anchor | Section |
|---|---|
| 0 | Hero |
| 1 | Best Paper |
| 2..6 | the featured items |
| 7 | Contact |

`src/app/sceneItems.ts` lists the object states in the same order. The count of 8 is hard-coded as `STATE_COUNT` in `src/scene/palette.ts` and as `STATES` in `scripts/capture.mjs`, so adding or removing a state means updating all of these, plus the fallback stills.

**The scene** (`src/scene/createScene.ts`) is one mesh. Every object state is a morph target, built from a shape function that maps the unit sphere onto the object's surface (`src/scene/objects/*.ts`, `geometry.ts`), and a liquid blob is the last target. `step.ts` maps `p` to a step: hold 20%, melt k → blob → k+1 over 60%, hold 20%. Objects alternate sides of the page (`dir`), and springs (`springs.ts`) smooth the motion. Screenshots are planes floating just in front of each object's screen face (`pictures.ts`). An item with exactly two pictures becomes an open book (`resolveObject`).

**Render modes** (`src/app/capability.ts`):
- `full`.
- `lite`: used under 800px wide or on a software or low-end GPU. Less geometry detail, no transmission.
- `static`: no WebGL2. The page shows `StaticFallback`, the pre-captured webp stills from `public/fallback/`.

If the WebGL context is lost and not restored within 3s, the page also drops to the stills. Reduced motion swaps objects with a fade instead of a melt.

**Narrow screens (<800px)** reserve the top 55vh of each object section as the object's "stage" (`STAGE` in `progress.ts`). `stageY` in `src/app/stage.ts` feeds the scene, through `getStage`, the viewport y where each object should sit. It also sets the `--stage-y` CSS variable for the fallback still. The JS breakpoint (`innerWidth < 800`) and the CSS one (`@media (max-width: 799px)`) must stay in sync.

**The contact phone is a "slot" state.** The scene settles the 3D phone face-on behind the DOM element `[data-phone-slot]` in `src/ui/Contact.tsx`. The DOM draws the lock screen and chat (`PhoneChat`, `lockScreen.ts`) on top of it. `SceneLayer` mirrors the scene's state onto that element as `data-scene="on|arriving"` and `data-stage`, and `styles.css` keys off those. The chat script is in `src/content/chat.ts`.

## Testing notes

- `src/test/setup.ts` stubs `matchMedia` and makes `HTMLCanvasElement.getContext` return null, so jsdom never builds a real scene.
- The scene is tested through its pure helpers: `step`, `layout`, `math`, `springs`, `geometry` and friends.

## Content and screenshots

Placeholder screenshots use `*.placeholder.*` filenames. `npm run build` lists the ones still in use.

To replace one:
1. Add the image under `public/shots/`.
2. Point the item's `pics` at it in `src/content/featured.ts`, with an optional `focus: [x, y]` crop centre.
3. Run `npm test`.
4. Rebuild, then re-run `capture:fallback` and commit the stills.

The Mizuhada screen must show only a mock, a blurred UI or the company logo, never real company data.

## Deploy

On Vercel with the Vite preset (`npm run build`, output `dist`). `VITE_SITE_URL` in `.env` is the live address. `index.html` uses it for the canonical link and the absolute og:image URL.
