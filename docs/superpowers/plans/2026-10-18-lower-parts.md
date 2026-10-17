# Lower Parts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the plain project rows, More projects grid, About grid and Contact block with a wall of project names, a sideways-scrolling About, and a Contact finale. In that finale the 3D phone rolls in from the side, wakes to a liquid-glass lock screen, and unlocks to a chat. Also make the object melt down while part headings pass, so it stops running over them.

**Architecture:** DOM first. The new parts are React components with CSS. The scene gains three inputs:
- **A dip value:** the object shrinks to a droplet while a part heading is centred.
- **An exit window:** the scene fades out at the project wall and back in at Contact.
- **A slot:** the last state (the phone) fits its screen exactly behind the page's `[data-phone-slot]`, where the chat is real HTML.
- **An arrival value:** over the last screen of the page, the phone rolls in edge-on from the right, and its screen goes dark, then shows a lock screen, then unlocks.

The lock screen is one Canvas 2D drawing, used both as the 3D screen's texture and in the CSS phone.

Without WebGL, the slot draws a CSS phone around the same chat.

**Tech Stack:** Vite 7, React 19, TypeScript 5.9, three 0.170 (dynamic import only), Vitest 4 + jsdom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-18-lower-parts-design.md`

## Global Constraints

- **Internal product name:** the internal Mizuhada product name never appears anywhere: code, content, tests, docs, commits or file names. Describe it only as "an enterprise multi-agent RAG assistant". `tests/content.test.ts` matches it by SHA-256 hash only.
- **Phone number:** no phone number anywhere. It is matched by hash only.
- **Availability:** no availability or "open to work" claim in any copy.
- **three.js loading:** three is loaded only via the dynamic `import('../scene/createScene')`. The scene chunk stays under the existing budget in `scripts/check-size.mjs`.
- **Dependencies:** no new runtime dependencies.
- **WebGL independence:** text, links and the chat never depend on WebGL.
- **Face ID:** it is only an animation. Never request camera access.
- **Lock screen copy:** "Supakorn", "now", "made it to the bottom? say hi 👋", plus the visitor's local time (`H:MM`) and date ("Sunday 18 October").
- **State count:** `STATE_COUNT` stays 8.
- **Chat copy:** exact strings from the spec §5, with the email and profile links taken from `profile`. Six chips, in this order:
  1. What are you working on?
  2. What won Best Paper?
  3. What did you build as an intern?
  4. What do you like building?
  5. Where are you?
  6. How do I reach you?
- **Test output:** `npm test` passes with clean output: no React warnings and no jsdom "not implemented" errors.
- **Commit trailer:** every commit message ends with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01PVsCofSvenEXaFKqp3MYGN
  ```
- **Code style:** match the surrounding code. Short JSDoc on exported functions, a comment only where the why isn't obvious, and Prettier-style formatting (2 spaces, single quotes, trailing commas, width about 120).

## File map

| File | Change |
|---|---|
| `src/scroll/progress.ts` (+test) | add `dipAmount`, `sceneFade`, `arriveAmount`, `phoneStage` |
| `src/scene/types.ts` | add `SlotRect`, `SceneItem.slot`, `SceneOptions.getSlot/onSlotChange`, `SceneHandle.setDip` |
| `src/scene/layout.ts` (+test) | add `fitToSlot` |
| `src/scene/objects/objects.test.ts` | phone screen aspect test |
| `src/content/types.ts` | `Project`, `ChatTopic`; remove `ProjectRow`, `MoreProject` |
| `src/content/projects.ts` | one `projects` list of 10 |
| `src/content/chat.ts` | new: greeting and six topics |
| `src/ui/ProjectWall.tsx` (+test) | new; replaces `ProjectRows.tsx` and `MoreProjects.tsx` (deleted) |
| `src/ui/AboutRail.tsx` (+test) | new; replaces `AboutBlock.tsx` (deleted) |
| `src/ui/PhoneChat.tsx` (+test) | new |
| `src/ui/Contact.tsx` | anchor 7, return marker, phone slot with the chat |
| `src/ui/PartHeading.tsx` | `data-scene-dip` |
| `src/ui/lockScreen.ts` (+test) | new: `lockClock`, `drawLockScreen` (Canvas 2D) |
| `src/ui/LockCanvas.tsx` | new: the lock screen in the CSS phone |
| `src/scene/lockPlane.ts` | new: the lock screen as the 3D phone's screen texture |
| `src/scene/pictures.ts` | export `screenMaterial` |
| `src/test/setup.ts` | quiet `getContext` stub (jsdom has no canvas) |
| `src/scroll/useScrollProgress.ts` | measure dips and return; sample `{ p, exit, dip, arrive }` |
| `src/scene/createScene.ts` | dip scale, slot fit and arrival roll, lock screen plane, glow-only capture of slot states |
| `src/app/SceneLayer.tsx` (+test) | forward dip and arrive; slot rect, `data-scene` and `data-stage` on the slot |
| `src/app/sceneItems.ts` (+test) | last state is the slot phone |
| `src/app/App.tsx` (+test) | wire the new parts |
| `src/scene/palette.ts` | comment only |
| `src/styles.css` | `--faint`, `.sr-only`, wall, about rail, contact, phone slot, chat; remove rows, more and about-grid styles |
| `tests/content.test.ts` | merged projects and chat links |
| `scripts/capture.mjs`, `package.json`, `README.md` | `capture:sections` |
| `public/fallback/7-*.webp` | regenerated (glow only) |

---

### Task 1: Dip, exit-window and arrival math

**Files:**
- Modify: `src/scroll/progress.ts`
- Test: `src/scroll/progress.test.ts`

**Interfaces:**
- Produces:
  - `dipAmount(y: number, centres: number[], vh: number): number`, 0..1.
  - `sceneFade(y: number, exitTop: number, returnTop: number, vh: number): number`, 0..1.
  - `arriveAmount(y: number, returnTop: number, vh: number): number`, 0..1.
  - `type PhoneStage = 'off' | 'lock' | 'open'` and `phoneStage(arrive: number): PhoneStage`.
  - `useScrollProgress` (Task 6) uses the first three; `SceneLayer` (Task 7) uses `phoneStage`.

- [ ] **Step 1: Write the failing tests.** Append to `src/scroll/progress.test.ts` and extend its import to `import { anchorPoint, arriveAmount, dipAmount, exitFade, phoneStage, progressFromAnchors, sceneFade, scrollYForProgress } from './progress';`:

```ts
describe('dipAmount', () => {
  it('is 1 with a heading centred, 0 from 0.45 of a viewport away', () => {
    expect(dipAmount(2000, [2000], 800)).toBe(1);
    expect(dipAmount(2000 + 180, [2000], 800)).toBeCloseTo(0.5);
    expect(dipAmount(2000 + 360, [2000], 800)).toBe(0);
    expect(dipAmount(2000 - 500, [2000], 800)).toBe(0);
  });

  it('follows the nearest heading', () => {
    expect(dipAmount(5000, [2000, 5000], 800)).toBe(1);
  });

  it('is 0 without headings', () => {
    expect(dipAmount(100, [], 800)).toBe(0);
  });
});

describe('sceneFade', () => {
  it('is 0 before the exit, 1 between exit and return, 0 again once the return arrives', () => {
    expect(sceneFade(1000, 3000, 9000, 800)).toBe(0);
    expect(sceneFade(5000, 3000, 9000, 800)).toBe(1);
    expect(sceneFade(9400, 3000, 9000, 800)).toBe(0);
  });

  it('never comes back without a return element', () => {
    expect(sceneFade(20000, 3000, Infinity, 800)).toBe(1);
  });
});

describe('arriveAmount', () => {
  it('runs from 0 to 1 over one viewport, ending with the return element at the top of the screen', () => {
    expect(arriveAmount(9000 - 400, 9000, 800)).toBe(0);
    expect(arriveAmount(9000, 9000, 800)).toBeCloseTo(0.5);
    expect(arriveAmount(9000 + 400, 9000, 800)).toBe(1);
  });

  it('is 0 without a return element', () => {
    expect(arriveAmount(20000, Infinity, 800)).toBe(0);
  });
});

describe('phoneStage', () => {
  it('is dark, then locked from halfway, then open once the phone has landed', () => {
    expect(phoneStage(0.2)).toBe('off');
    expect(phoneStage(0.5)).toBe('lock');
    expect(phoneStage(0.96)).toBe('lock');
    expect(phoneStage(0.97)).toBe('open');
  });
});
```

- [ ] **Step 2: Run the tests and check they fail.**
  - Run: `npx vitest run src/scroll/progress.test.ts`
  - Expected: FAIL, because `dipAmount`, `sceneFade`, `arriveAmount` and `phoneStage` are not exported.

- [ ] **Step 3: Implement.** In `src/scroll/progress.ts`, change the import to `import { clamp01, smoothstep } from '../scene/math';` and append:

```ts
/**
 * 0..1 for part headings: 1 while a heading's centre is at y (the middle of the viewport), easing to 0
 * at 0.45 of a viewport away. The scene melts the object down by this much so headings stay clear.
 */
export function dipAmount(y: number, centres: number[], vh: number): number {
  let d = 0;
  for (const c of centres) d = Math.max(d, clamp01(1 - Math.abs(y - c) / (vh * 0.45)));
  return smoothstep(d, 0, 1);
}

/** How far the scene has faded out: in as the exit element arrives, back out as the return element arrives. */
export function sceneFade(y: number, exitTop: number, returnTop: number, vh: number): number {
  return exitFade(y, exitTop, vh) * (1 - exitFade(y, returnTop, vh));
}

/**
 * The contact phone's arrival, 0..1 over one viewport of scrolling: it starts with the return element's top
 * half a screen below the middle and ends with it at the top of the screen (the bottom of the page).
 */
export function arriveAmount(y: number, returnTop: number, vh: number): number {
  return clamp01((y - (returnTop - vh / 2)) / vh);
}

export type PhoneStage = 'off' | 'lock' | 'open';

/** The contact phone's screen along its arrival: dark, the lock screen from halfway, unlocked once landed. */
export function phoneStage(arrive: number): PhoneStage {
  return arrive < 0.5 ? 'off' : arrive < 0.97 ? 'lock' : 'open';
}
```

- [ ] **Step 4: Run the tests and check they pass.**
  - Run: `npx vitest run src/scroll/progress.test.ts`
  - Expected: PASS (all of `progress.test.ts`).

- [ ] **Step 5: Commit.**

```bash
git add src/scroll/progress.ts src/scroll/progress.test.ts
git commit -m "feat(scroll): heading dip, an exit window that can return, and the phone's arrival" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PVsCofSvenEXaFKqp3MYGN"
```

---

### Task 2: Fit an object's screen to a page rect

**Files:**
- Modify: `src/scene/types.ts`, `src/scene/layout.ts`
- Test: `src/scene/layout.test.ts`, `src/scene/objects/objects.test.ts`

**Interfaces:**
- Produces:
  - `SlotRect = { left: number; top: number; width: number; height: number }` in `src/scene/types.ts`, in CSS pixels relative to the viewport.
  - `fitToSlot(rect: SlotRect, vw: number, vh: number, screenH: number, zFront: number): { x: number; y: number; scale: number }` in `src/scene/layout.ts`.
  - Both are used by `createScene` in Task 7.

- [ ] **Step 1: Write the failing tests.** Append to `src/scene/layout.test.ts`, adding `fitToSlot`, `CAMERA_Z` and `FOV` to its import from `./layout`:

```ts
describe('fitToSlot', () => {
  const vw = 1440;
  const vh = 900;
  const screenH = 3;
  const zFront = 0.1;
  const rect = { left: 1000, top: 200, width: 240, height: 500 };

  it('places a front-facing screen so it projects exactly onto the rect', () => {
    const { x, y, scale } = fitToSlot(rect, vw, vh, screenH, zFront);
    const t = Math.tan((FOV * Math.PI) / 360);
    const depth = CAMERA_Z - zFront * scale;
    const toPxY = (wy: number) => ((1 - wy / (t * depth)) / 2) * vh;
    const toPxX = (wx: number) => ((wx / (t * (vw / vh) * depth) + 1) / 2) * vw;
    expect(toPxY(y + (screenH * scale) / 2)).toBeCloseTo(200, 3);
    expect(toPxY(y - (screenH * scale) / 2)).toBeCloseTo(700, 3);
    expect(toPxX(x)).toBeCloseTo(1120, 3);
  });

  it('puts a centred rect on the axis', () => {
    const { x, y } = fitToSlot({ left: 620, top: 200, width: 200, height: 500 }, vw, vh, screenH, zFront);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
  });
});
```

Append this to `src/scene/objects/objects.test.ts`, and add `import { phone } from './phone';` at the top:

```ts
it('gives the phone a screen with the aspect of the page’s phone slot (1440 / 3013 in styles.css)', () => {
  const [w, h] = phone.planes[0].size;
  expect(w / h).toBeCloseTo(1440 / 3013, 3);
});
```

- [ ] **Step 2: Run the tests and check they fail.**
  - Run: `npx vitest run src/scene/layout.test.ts src/scene/objects/objects.test.ts`
  - Expected: FAIL, because `fitToSlot` is not exported. The phone aspect test passes already, which is fine: it guards the CSS value added in Task 5.

- [ ] **Step 3: Implement.** In `src/scene/types.ts`, add:

```ts
/** A page element's box in viewport CSS pixels (from getBoundingClientRect). */
export interface SlotRect {
  left: number;
  top: number;
  width: number;
  height: number;
}
```

In `src/scene/layout.ts`, add `import type { SlotRect } from './types';` at the top, then append:

```ts
/**
 * Where to put an object, and how big, so that its front-facing screen (screenH tall, zFront in
 * front of the object's centre, both in object units) covers `rect` exactly in a vw × vh viewport.
 * Assumes the camera at CAMERA_Z on the z axis and an unrotated object.
 */
export function fitToSlot(
  rect: SlotRect,
  vw: number,
  vh: number,
  screenH: number,
  zFront: number,
): { x: number; y: number; scale: number } {
  const t = Math.tan((FOV * Math.PI) / 360);
  const r = rect.height / vh;
  // the screen spans r of the view height at its own depth: screenH * scale = r * 2t * (CAMERA_Z - zFront * scale)
  const scale = (r * 2 * t * CAMERA_Z) / (screenH + r * 2 * t * zFront);
  const depth = CAMERA_Z - zFront * scale;
  const ndcX = ((rect.left + rect.width / 2) / vw) * 2 - 1;
  const ndcY = 1 - ((rect.top + rect.height / 2) / vh) * 2;
  return { x: ndcX * t * (vw / vh) * depth, y: ndcY * t * depth, scale };
}
```

- [ ] **Step 4: Run the tests and check they pass.**
  - Run: `npx vitest run src/scene/layout.test.ts src/scene/objects/objects.test.ts`
  - Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/scene/types.ts src/scene/layout.ts src/scene/layout.test.ts src/scene/objects/objects.test.ts
git commit -m "feat(scene): fit an object's screen over a page rect" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PVsCofSvenEXaFKqp3MYGN"
```

---

### Task 3: One project list and the wall of names

**Files:**
- Modify: `src/content/types.ts`, `src/content/projects.ts`, `src/app/App.tsx`, `src/ui/Contact.tsx`, `src/styles.css`, `tests/content.test.ts`, `src/app/App.test.tsx`
- Create: `src/ui/ProjectWall.tsx`, `src/ui/ProjectWall.test.tsx`
- Delete: `src/ui/ProjectRows.tsx`, `src/ui/MoreProjects.tsx`

**Interfaces:**
- Consumes: `sideFor(anchor)` from `src/ui/side.ts`.
- Produces:
  - `Project { name: string; line: string; tech?: string; href?: string }`.
  - `projects: Project[]` (10 entries).
  - `<ProjectWall projects={projects} />`, rendering `section.wall#project-list[data-scene-exit]`.
  - `<Contact profile={profile} anchor={7} />` now carries `data-anchor` and `data-side`.

- [ ] **Step 1: Merge the content.** In `src/content/types.ts`, replace the `ProjectRow` and `MoreProject` interfaces with:

```ts
/** One name on the project wall. `tech` and `href` are shown on its card when present. */
export interface Project {
  name: string;
  line: string;
  tech?: string;
  href?: string;
}
```

Replace `src/content/projects.ts` with:

```ts
import type { Project } from './types';

// The wall lists these in order: the three with a stack and a repository first.
export const projects: Project[] = [
  {
    name: 'FastForm',
    line: 'Submits a Google Form with one direct HTTP request instead of a full browser.',
    tech: 'Python standard library, GitHub Actions',
    href: 'https://github.com/SupaOhm/fastform',
  },
  {
    name: 'Full-Stack Expense Tracker',
    line: 'Expense management with REST APIs and running totals.',
    tech: 'MongoDB, Express, React, Node.js',
    href: 'https://github.com/SupaOhm/Expense-Tracker',
  },
  {
    name: 'Lost and Found Management System',
    line: 'Report and manage lost items, with admin approval.',
    tech: 'PHP, MySQL, Bootstrap',
    href: 'https://github.com/SupaOhm/Lost-and-Found-Management-System',
  },
  { name: 'NoSleep CLI', line: 'Keeps a Windows machine awake through long tasks.', href: 'https://github.com/SupaOhm/NoSleep-CLI' },
  { name: 'RevRace', line: 'GPS performance tracking for the car you actually drive.' },
  { name: 'DressMe', line: 'Outfit suggestions from your own photos, a software engineering project.' },
  { name: 'Salary Trend Regression', line: 'Least-squares models of salary against age, education and experience.' },
  { name: 'Online Shop Database', line: 'A normalized MySQL schema for an e-commerce store.', href: 'https://github.com/SupaOhm/onlineshop-DB' },
  { name: 'HCI Bus Routing', line: 'A mobile bus routing prototype shaped by user research.' },
  {
    name: 'Binary Matching Arduino Game',
    line: 'Binary-to-decimal practice on an Arduino Uno.',
    href: 'https://github.com/SupaOhm/Binary-Matching-Arduino-Game',
  },
];
```

- [ ] **Step 2: Write the failing component test.** Create `src/ui/ProjectWall.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { projects } from '../content/projects';
import { mockMatchMedia } from '../test/matchMedia';
import { ProjectWall } from './ProjectWall';

const FINE = '(hover: hover) and (pointer: fine)';

describe('ProjectWall', () => {
  it('lists every project by name, in order', () => {
    render(<ProjectWall projects={projects} />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items.map((li) => li.firstElementChild!.textContent)).toEqual(projects.map((p) => p.name));
  });

  it('links only the projects that have a repository', () => {
    render(<ProjectWall projects={projects} />);
    const linked = projects.filter((p) => p.href);
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(linked.map((p) => p.href));
    expect(screen.getAllByRole('button')).toHaveLength(projects.length - linked.length);
  });

  it('describes each name with its line and tech', () => {
    render(<ProjectWall projects={projects} />);
    const name = screen.getByRole('link', { name: 'FastForm' });
    const card = document.getElementById(name.getAttribute('aria-describedby')!);
    expect(card).toHaveTextContent(/one direct HTTP request.*Python standard library/);
  });

  describe('on touch', () => {
    it('opens the card under a name on the first tap instead of following the link', () => {
      render(<ProjectWall projects={projects} />);
      expect(fireEvent.click(screen.getByRole('link', { name: 'FastForm' }))).toBe(false);
      const card = document.getElementById('wall-card-0')!;
      expect(card).toBeVisible();
      expect(within(card).getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', projects[0].href);
    });

    it('toggles the card of a project without a repository', () => {
      render(<ProjectWall projects={projects} />);
      const name = screen.getByRole('button', { name: 'RevRace' });
      fireEvent.click(name);
      expect(name).toHaveAttribute('aria-expanded', 'true');
      fireEvent.click(name);
      expect(name).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('with a fine pointer', () => {
    it('shows a floating card for the name under the pointer and drops it when the pointer leaves', () => {
      mockMatchMedia([FINE]);
      const { container } = render(<ProjectWall projects={projects} />);
      fireEvent.pointerEnter(screen.getByRole('link', { name: 'FastForm' }));
      expect(container.querySelector('.wall-card-float')).toHaveTextContent('Python standard library, GitHub Actions');
      fireEvent.pointerLeave(screen.getByRole('list'));
      expect(container.querySelector('.wall-card-float')).toBeNull();
    });

    it('shows the card for keyboard focus too', () => {
      mockMatchMedia([FINE]);
      const { container } = render(<ProjectWall projects={projects} />);
      screen.getByRole('button', { name: 'RevRace' }).focus();
      expect(container.querySelector('.wall-card-float')).toHaveTextContent('GPS performance tracking');
    });
  });
});
```

- [ ] **Step 3: Run the test and check it fails.**
  - Run: `npx vitest run src/ui/ProjectWall.test.tsx`
  - Expected: FAIL, because `./ProjectWall` does not exist.

- [ ] **Step 4: Implement `ProjectWall`.** Create `src/ui/ProjectWall.tsx`:

```tsx
import { useEffect, useRef, useState, type FocusEvent, type MouseEvent } from 'react';
import type { Project } from '../content/types';

const FINE = '(hover: hover) and (pointer: fine)';
const REDUCED = '(prefers-reduced-motion: reduce)';
const OFFSET = 18;

/** What a card says about a project. Touch cards get a real GitHub link; the floating card only names it. */
function CardBody({ project, link }: { project: Project; link: boolean }) {
  return (
    <>
      <p>{project.line}</p>
      {project.tech && <p className="wall-tech">{project.tech}</p>}
      {project.href &&
        (link ? (
          <a href={project.href} target="_blank" rel="noreferrer">
            GitHub
          </a>
        ) : (
          <p className="wall-tech">Opens GitHub</p>
        ))}
    </>
  );
}

/**
 * Every project as one wall of names. A fine pointer gets a card that trails it over the active
 * name (pinned beside the name for keyboard focus and reduced motion). On touch, the first tap
 * opens the card under the name and a second tap follows the link.
 */
export function ProjectWall({ projects }: { projects: Project[] }) {
  const [fine] = useState(() => window.matchMedia(FINE).matches);
  const [active, setActive] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!fine || active === null) return;
    const reduced = window.matchMedia(REDUCED).matches;
    let raf = 0;
    let last = 0;
    let x = NaN;
    let y = NaN;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const card = cardRef.current;
      const name = document.getElementById(`wall-name-${active}`);
      if (!card || !name) return;
      let tx: number;
      let ty: number;
      if (pointer.current && !reduced) {
        tx = pointer.current.x + OFFSET;
        ty = pointer.current.y + OFFSET;
      } else {
        const r = name.getBoundingClientRect();
        tx = r.right + OFFSET;
        ty = r.top + r.height / 2 - card.offsetHeight / 2;
      }
      // keep the card on screen
      tx = Math.min(tx, window.innerWidth - card.offsetWidth - 16);
      ty = Math.min(Math.max(ty, 16), window.innerHeight - card.offsetHeight - 16);
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      const follow = reduced || Number.isNaN(x) ? 1 : 1 - Math.exp(-dt * 16);
      x = Number.isNaN(x) ? tx : x + (tx - x) * follow;
      y = Number.isNaN(y) ? ty : y + (ty - y) * follow;
      card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      card.style.visibility = 'visible';
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fine, active]);

  const onTap = (e: MouseEvent, i: number, isLink: boolean) => {
    if (fine) return;
    if (active !== i) {
      e.preventDefault();
      setActive(i);
    } else if (!isLink) {
      setActive(null);
    }
  };

  return (
    <section className="wall" id="project-list" data-scene-exit aria-label="All projects">
      <ul
        className="wall-list"
        onPointerMove={(e) => {
          if (fine) pointer.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerLeave={() => {
          if (!fine) return;
          pointer.current = null;
          setActive(null);
        }}
      >
        {projects.map((project, i) => {
          const shared = {
            id: `wall-name-${i}`,
            className: 'wall-name',
            'aria-describedby': `wall-card-${i}`,
            'data-active': active === i ? '' : undefined,
            onPointerEnter: () => {
              if (fine) setActive(i);
            },
            onFocus: (e: FocusEvent<HTMLElement>) => {
              if (!fine) return;
              // keyboard focus pins the card beside the name; a click keeps it on the pointer
              if (!e.currentTarget.matches(':hover')) pointer.current = null;
              setActive(i);
            },
            onBlur: () => {
              if (fine) setActive((a) => (a === i ? null : a));
            },
            onClick: (e: MouseEvent) => onTap(e, i, Boolean(project.href)),
          };
          return (
            <li key={project.name}>
              {project.href ? (
                <a {...shared} href={project.href} target="_blank" rel="noreferrer">
                  {project.name}
                </a>
              ) : (
                <button {...shared} type="button" aria-expanded={fine ? undefined : active === i}>
                  {project.name}
                </button>
              )}
              <div id={`wall-card-${i}`} className="wall-card wall-card-inline" hidden={fine || active !== i}>
                <CardBody project={project} link />
              </div>
            </li>
          );
        })}
      </ul>
      {fine && active !== null && (
        <div className="wall-card wall-card-float" ref={cardRef} aria-hidden="true">
          <CardBody project={projects[active]} link={false} />
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 5: Run the component test and check it passes.**
  - Run: `npx vitest run src/ui/ProjectWall.test.tsx`
  - Expected: PASS (7 tests).

- [ ] **Step 6: Wire it into the page.**
  - Delete `src/ui/ProjectRows.tsx` and `src/ui/MoreProjects.tsx`.
  - In `src/app/App.tsx`:
    - Replace the `moreProjects, projectRows` import with `import { projects } from '../content/projects';`.
    - Remove the `MoreProjects` and `ProjectRows` imports, and add `import { ProjectWall } from '../ui/ProjectWall';`.
    - Replace the Projects fragment with `{part.group === 'Projects' && <ProjectWall projects={projects} />}`.
    - Change `<Contact profile={profile} />` to `<Contact profile={profile} anchor={featured.length + 2} />`.
    - Change the anchors comment to: `{/* anchors: 0 is the hero, 1 the Best Paper section, then the featured items; Contact is the last */}`.

Replace `src/ui/Contact.tsx` with:

```tsx
import type { Profile } from '../content/types';
import { sideFor } from './side';

export function Contact({ profile, anchor }: { profile: Profile; anchor: number }) {
  return (
    <section className="contact" id="contact" data-anchor={anchor} data-side={sideFor(anchor)} aria-labelledby="contact-title">
      <h2 className="part-title" id="contact-title">
        Say hello.
      </h2>
      <p>
        <a className="contact-email" href={`mailto:${profile.email}`}>
          {profile.email}
        </a>
      </p>
      <p className="links">
        <a href={profile.github.href} target="_blank" rel="noreferrer">
          {profile.github.label}
        </a>
        <a href={profile.linkedin.href} target="_blank" rel="noreferrer">
          {profile.linkedin.label}
        </a>
      </p>
    </section>
  );
}
```

- [ ] **Step 7: Styles.** In `src/styles.css`:
  - Add `--faint: #c7c7cc;` after `--line` in the light `:root` block, and `--faint: #3a3a3c;` after `--line` in both dark blocks.
  - Delete the whole `/* project rows */` block (`.rows`, `.rows li`, `.rows li:last-child`, `.row-name`, `.tech`) and the whole `/* more projects */` block (`.more`, `.subtitle`, `.more-list`, `.more-list a, .more-name`, `.more-list p`).
  - In the narrow media query, change `.copy, .rows {` to `.copy {`, and change `.more, .about {` to `.about {`.
  - Change the `.scene` comment to `/* 3D layer: fixed behind the text, faded out (and paused) from the project wall until Contact */`.
  - Add this in place of the deleted blocks:

```css
/* project wall: every project as one list of names; the active one turns solid */
.wall {
  position: relative;
  padding: 14vh 8vw 20vh;
}
.wall-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.wall-name {
  display: inline-block;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: clamp(40px, 6vw, 96px);
  font-weight: 800;
  line-height: 1.04;
  letter-spacing: -0.045em;
  text-align: left;
  text-decoration: none;
  color: var(--faint);
  cursor: pointer;
  transition: color 0.2s;
}
.wall-name:hover,
.wall-name:focus-visible,
.wall-name[data-active] {
  color: var(--ink);
}
/* inverted: dark on the light theme, light on the dark one */
.wall-card {
  max-width: 280px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--ink);
  color: var(--bg);
  font-size: 15px;
  line-height: 1.4;
}
.wall-card p {
  margin: 0 0 6px;
  color: inherit;
}
.wall-card p:last-child {
  margin-bottom: 0;
}
.wall-card a {
  color: inherit;
}
.wall-tech {
  font-size: 13px;
  opacity: 0.65;
}
.wall-card-float {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 5;
  pointer-events: none;
  visibility: hidden; /* until the first frame positions it */
}
.wall-card-inline {
  margin: 10px 0 18px;
}
@media (max-width: 799px) {
  .wall {
    padding: 12vh 24px 16vh;
  }
}
```

- [ ] **Step 8: Update the page and content tests.**
  - In `src/app/App.test.tsx`, replace the last line of the anchors test with:

```tsx
    expect(container.querySelector('[data-scene-exit]')).toHaveAttribute('id', 'project-list');
    expect(anchors.at(-1)).toHaveAttribute('id', 'contact');
```

  - In `tests/content.test.ts`:
    - Replace the `moreProjects, projectRows` import with `import { projects } from '../src/content/projects';`.
    - In `hrefs`, replace the two project lines with `...projects.flatMap((p) => (p.href ? [p.href] : [])),`.
    - Add this to `describe('content')`:

```ts
  it('lists all ten projects, the three with a stack and a repository first', () => {
    expect(projects).toHaveLength(10);
    expect(projects.slice(0, 3).every((p) => p.tech && p.href)).toBe(true);
  });
```

- [ ] **Step 9: Run the full suite and the typecheck.**
  - Run: `npm test && npx tsc --noEmit`
  - Expected: all tests pass, no type errors, clean output.

- [ ] **Step 10: Commit.**

```bash
git add -A src tests
git commit -m "feat: every project on one wall of names, with a card that follows the pointer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PVsCofSvenEXaFKqp3MYGN"
```

---

### Task 4: About scrolls sideways

**Files:**
- Create: `src/ui/AboutRail.tsx`, `src/ui/AboutRail.test.tsx`
- Delete: `src/ui/AboutBlock.tsx`
- Modify: `src/app/App.tsx`, `src/styles.css`

**Interfaces:**
- Consumes: `about` (`src/content/about.ts`, unchanged shape) and `usePrefersReducedMotion()`.
- Produces: `<AboutRail about={about} />`, rendering `section.about#about[data-mode="rail"|"stack"]`.

- [ ] **Step 1: Write the failing test.** Create `src/ui/AboutRail.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { about } from '../content/about';
import { mockMatchMedia } from '../test/matchMedia';
import { AboutRail } from './AboutRail';

describe('AboutRail', () => {
  it('shows four panels in order, with languages under education', () => {
    render(<AboutRail about={about} />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'Education',
      'Honors',
      'Skills',
      'Leadership and activities',
    ]);
    expect(screen.getByText(/TU-GET CBT 90/)).toBeInTheDocument();
  });

  it('is a focusable sideways group by default', () => {
    const { container } = render(<AboutRail about={about} />);
    expect(container.querySelector('#about')).toHaveAttribute('data-mode', 'rail');
    expect(screen.getByRole('group', { name: 'About, scroll sideways' })).toHaveAttribute('tabindex', '0');
  });

  it('stacks the panels when motion is reduced', () => {
    mockMatchMedia(['(prefers-reduced-motion: reduce)']);
    const { container } = render(<AboutRail about={about} />);
    expect(container.querySelector('#about')).toHaveAttribute('data-mode', 'stack');
    expect(screen.queryByRole('group')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and check it fails.**
  - Run: `npx vitest run src/ui/AboutRail.test.tsx`
  - Expected: FAIL, because `./AboutRail` does not exist.

- [ ] **Step 3: Implement.** Create `src/ui/AboutRail.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { About } from '../content/types';
import { usePrefersReducedMotion } from '../scroll/usePrefersReducedMotion';

const WIDE = '(min-width: 800px)';
const PANELS = 4;

/**
 * About as four panels. Wide screens pin the section and slide the panels sideways as the page
 * scrolls; narrow screens swipe through them (styles.css); reduced motion stacks them.
 */
export function AboutRail({ about }: { about: About }) {
  const reduced = usePrefersReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [dot, setDot] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (reduced || !section || !track) return;
    const wide = window.matchMedia(WIDE);
    let frame = 0;
    const update = () => {
      frame = 0;
      if (!wide.matches) {
        track.style.transform = '';
        return;
      }
      const r = section.getBoundingClientRect();
      const range = r.height - window.innerHeight;
      const t = range > 0 ? Math.min(Math.max(-r.top / range, 0), 1) : 0;
      track.style.transform = `translate3d(${-t * Math.max(0, track.scrollWidth - track.clientWidth)}px, 0, 0)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    wide.addEventListener('change', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      wide.removeEventListener('change', schedule);
    };
  }, [reduced]);

  // narrow screens swipe the track itself: light the dot of the panel in view
  const onTrackScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const travel = track.scrollWidth - track.clientWidth;
    setDot(travel > 0 ? Math.round((track.scrollLeft / travel) * (PANELS - 1)) : 0);
  };

  return (
    <section className="about" id="about" ref={sectionRef} data-mode={reduced ? 'stack' : 'rail'} aria-labelledby="about-title">
      <div className="about-sticky">
        <h2 className="part-title" id="about-title">
          About
        </h2>
        <div
          className="about-track"
          ref={trackRef}
          onScroll={onTrackScroll}
          tabIndex={reduced ? undefined : 0}
          role={reduced ? undefined : 'group'}
          aria-label={reduced ? undefined : 'About, scroll sideways'}
        >
          <article className="about-panel">
            <h3>Education</h3>
            <p className="about-strong">{about.education.school}</p>
            <p>{about.education.degree}</p>
            <p>{about.education.detail}</p>
            <p className="about-small">Coursework: {about.education.coursework.join(', ')}.</p>
            <p className="about-small">Languages: {about.languages.join('; ')}.</p>
          </article>
          <article className="about-panel">
            <h3>Honors</h3>
            <ul>
              {about.honors.map((h) => (
                <li key={h} className="about-honor">
                  {h}
                </li>
              ))}
            </ul>
          </article>
          <article className="about-panel">
            <h3>Skills</h3>
            <div className="about-columns">
              {about.skills.map((g) => (
                <p key={g.label}>
                  <span className="about-strong">{g.label}</span>
                  <br />
                  {g.items.join(', ')}
                </p>
              ))}
            </div>
          </article>
          <article className="about-panel">
            <h3>Leadership and activities</h3>
            <ul>
              {about.activities.map((a) => (
                <li key={a.name}>
                  <span className="about-strong">{a.name}</span>
                  <br />
                  {a.detail}
                </li>
              ))}
            </ul>
          </article>
        </div>
        {!reduced && (
          <div className="about-dots" aria-hidden="true">
            {Array.from({ length: PANELS }, (_, i) => (
              <span key={i} data-on={i === dot ? '' : undefined} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Wire it in.** Delete `src/ui/AboutBlock.tsx`. In `src/app/App.tsx`, replace the `AboutBlock` import with `import { AboutRail } from '../ui/AboutRail';`, and `<AboutBlock about={about} />` with `<AboutRail about={about} />`.

- [ ] **Step 5: Styles.** In `src/styles.css`, delete the `.about { padding: 16vh 8vw; }` rule and the `.about-grid` rule. Keep `.about h3`, `.about ul`, `.about li + li`, `.about-strong` and `.about-small`. In the narrow media query, delete the `.about { padding-left: 24px; padding-right: 24px; }` rule (it was `.more, .about` before Task 3). Add under `/* about */`:

```css
/* about: wide screens pin the section for four screens of scrolling and slide the panels sideways */
.about {
  position: relative;
}
.about-sticky {
  padding: 16vh 8vw;
}
.about-track {
  display: flex;
  gap: 4vw;
}
.about-panel {
  flex: none;
  width: min(72vw, 880px);
}
.about-columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 4px 40px;
}
.about-honor {
  font-size: clamp(28px, 3vw, 44px);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--ink);
}
.about-dots {
  display: none;
}
.about[data-mode='rail'] {
  height: 400vh;
}
.about[data-mode='rail'] .about-sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding-top: 10vh;
  padding-bottom: 6vh;
}
.about[data-mode='rail'] .about-track {
  will-change: transform;
}
.about[data-mode='stack'] .about-track {
  flex-direction: column;
  gap: 56px;
}
.about[data-mode='stack'] .about-panel {
  width: auto;
  max-width: 880px;
}
/* narrow: no pinning; the panels swipe sideways with snapping */
@media (max-width: 799px) {
  .about-sticky {
    padding: 16vh 24px;
  }
  .about[data-mode='rail'] {
    height: auto;
  }
  .about[data-mode='rail'] .about-sticky {
    position: static;
    height: auto;
    overflow: visible;
    display: block;
    padding: 16vh 24px;
  }
  .about[data-mode='rail'] .about-track {
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    margin: 0 -24px;
    padding: 0 24px;
    gap: 16px;
  }
  .about[data-mode='rail'] .about-panel {
    width: calc(100vw - 64px);
    scroll-snap-align: start;
  }
  .about[data-mode='rail'] .about-dots {
    display: flex;
    gap: 8px;
    margin-top: 20px;
  }
}
.about-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--line);
}
.about-dots span[data-on] {
  background: var(--ink);
}
```

- [ ] **Step 6: Run the tests and the typecheck.**
  - Run: `npm test && npx tsc --noEmit`
  - Expected: PASS. `App.test.tsx` still lists h2s ending 'About', 'Say hello.', and its first five h3s are unchanged.

- [ ] **Step 7: Commit.**

```bash
git add -A src
git commit -m "feat: About pins and scrolls sideways through four panels" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PVsCofSvenEXaFKqp3MYGN"
```

---

### Task 5: The contact phone's chat

**Files:**
- Modify: `src/content/types.ts`, `src/ui/Contact.tsx`, `src/styles.css`, `tests/content.test.ts`, `src/app/App.test.tsx`
- Create: `src/content/chat.ts`, `src/ui/PhoneChat.tsx`, `src/ui/PhoneChat.test.tsx`

**Interfaces:**
- Consumes: `profile` and `usePrefersReducedMotion()`.
- Produces:
  - `ChatTopic { ask: string; answer: string; links: Link[] }`.
  - `chatGreeting: string` and `chat: ChatTopic[]` (6 entries).
  - `<PhoneChat greeting topics />`.
  - Contact renders `div.phone-slot[data-phone-slot]` containing the chat. The scene layer (Task 7) sets `data-scene` on it.

- [ ] **Step 1: Content.** Add to `src/content/types.ts`:

```ts
/** One question chip in the contact phone's chat, with its answer written in advance. */
export interface ChatTopic {
  ask: string;
  answer: string;
  links: Link[];
}
```

Create `src/content/chat.ts`:

```ts
import { profile } from './profile';
import type { ChatTopic } from './types';

export const chatGreeting = 'Hi, I’m Supakorn. Tap a question 👇';

// Every answer is written in advance from what the page already says; keep them short enough for phone bubbles.
export const chat: ChatTopic[] = [
  {
    ask: 'What are you working on?',
    answer:
      'Phishing detection by a team of AI agents. Five specialists each read one part of a suspicious message, and a Judge makes the call.',
    links: [{ label: 'MA-ZeroPhish', href: '#ma-zerophish' }],
  },
  {
    ask: 'What won Best Paper?',
    answer: 'ESNIDSaaS, intrusion detection as a cloud service, built on Kafka and Spark. It won at IEEE IMC 2026 in Fukuoka.',
    links: [{ label: 'Read about the research', href: '#esnidsaas' }],
  },
  {
    ask: 'What did you build as an intern?',
    answer: 'An enterprise multi-agent RAG assistant. Document lookups went from about 55 seconds to under 5.',
    links: [{ label: 'Mizuhada', href: '#mizuhada' }],
  },
  {
    ask: 'What do you like building?',
    answer: 'AI systems, security tools, and the distributed plumbing under both. Mostly Python and TypeScript.',
    links: [],
  },
  {
    ask: 'Where are you?',
    answer: 'Pathum Thani, Thailand. Fourth year of computer engineering at SIIT, graduating June 2027.',
    links: [],
  },
  {
    ask: 'How do I reach you?',
    answer: `Email is best: ${profile.email}`,
    links: [{ label: 'Email', href: `mailto:${profile.email}` }, profile.github, profile.linkedin],
  },
];
```

- [ ] **Step 2: Write the failing test.** Create `src/ui/PhoneChat.test.tsx`:

```tsx
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { chat, chatGreeting } from '../content/chat';
import { profile } from '../content/profile';
import { mockMatchMedia } from '../test/matchMedia';
import { PhoneChat } from './PhoneChat';

const REDUCED = '(prefers-reduced-motion: reduce)';
const chips = () => screen.getAllByRole('button').map((b) => b.textContent);
const askAll = () => {
  for (const t of chat) fireEvent.click(screen.getByRole('button', { name: t.ask }));
};

describe('PhoneChat', () => {
  afterEach(() => vi.useRealTimers());

  it('opens with a greeting and the first three questions', () => {
    render(<PhoneChat greeting={chatGreeting} topics={chat} />);
    expect(screen.getByRole('log')).toHaveTextContent(chatGreeting);
    expect(chips()).toEqual(chat.slice(0, 3).map((t) => t.ask));
  });

  it('asks, types for a moment, then answers with its links and offers the next question', () => {
    vi.useFakeTimers();
    render(<PhoneChat greeting={chatGreeting} topics={chat} />);
    fireEvent.click(screen.getByRole('button', { name: chat[0].ask }));
    const log = screen.getByRole('log');
    expect(log).toHaveTextContent(chat[0].ask);
    expect(log).toHaveTextContent('Supakorn is typing');
    expect(log).not.toHaveTextContent(chat[0].answer);
    act(() => vi.advanceTimersByTime(800));
    expect(log).toHaveTextContent(chat[0].answer);
    expect(log).not.toHaveTextContent('Supakorn is typing');
    expect(within(log).getByRole('link', { name: 'MA-ZeroPhish' })).toHaveAttribute('href', '#ma-zerophish');
    expect(chips()).toEqual(chat.slice(1, 4).map((t) => t.ask));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: chat[1].ask }));
  });

  it('answers at once when motion is reduced', () => {
    mockMatchMedia([REDUCED]);
    render(<PhoneChat greeting={chatGreeting} topics={chat} />);
    fireEvent.click(screen.getByRole('button', { name: chat[1].ask }));
    expect(screen.getByRole('log')).toHaveTextContent(chat[1].answer);
  });

  it('hands over the email and both profiles', () => {
    mockMatchMedia([REDUCED]);
    render(<PhoneChat greeting={chatGreeting} topics={chat} />);
    askAll();
    const log = screen.getByRole('log');
    expect(within(log).getByRole('link', { name: 'Email' })).toHaveAttribute('href', `mailto:${profile.email}`);
    expect(within(log).getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', profile.github.href);
    expect(within(log).getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', profile.linkedin.href);
  });

  it('offers to start over once every question is used', () => {
    mockMatchMedia([REDUCED]);
    render(<PhoneChat greeting={chatGreeting} topics={chat} />);
    askAll();
    expect(chips()).toEqual(['Start over']);
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(screen.getByRole('log')).not.toHaveTextContent(chat[0].ask);
    expect(chips()).toEqual(chat.slice(0, 3).map((t) => t.ask));
  });
});
```

- [ ] **Step 3: Run the test and check it fails.**
  - Run: `npx vitest run src/ui/PhoneChat.test.tsx`
  - Expected: FAIL, because `./PhoneChat` does not exist.

- [ ] **Step 4: Implement.** Create `src/ui/PhoneChat.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import type { ChatTopic, Link } from '../content/types';
import { usePrefersReducedMotion } from '../scroll/usePrefersReducedMotion';

const TYPING_MS = 800;
const VISIBLE_CHIPS = 3;

type Bubble = { from: 'me' | 'them'; text: string } | { from: 'link'; link: Link };

const external = (href: string) => (href.startsWith('https:') ? { target: '_blank', rel: 'noreferrer' } : {});

/** A message thread with question chips; every answer is written in advance (content/chat.ts). */
export function PhoneChat({ greeting, topics }: { greeting: string; topics: ChatTopic[] }) {
  const reduced = usePrefersReducedMotion();
  const [used, setUsed] = useState<number[]>([]);
  const [thread, setThread] = useState<Bubble[]>([]);
  const [typing, setTyping] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const refocus = useRef(false);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // keep the newest bubble in view; once an answer lands, put focus on the next question
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
    if (refocus.current && !typing) {
      refocus.current = false;
      chipsRef.current?.querySelector('button')?.focus();
    }
  }, [thread, typing]);

  const ask = (i: number) => {
    const topic = topics[i];
    const answer: Bubble[] = [{ from: 'them', text: topic.answer }, ...topic.links.map((link) => ({ from: 'link' as const, link }))];
    setUsed((u) => [...u, i]);
    refocus.current = true;
    if (reduced) {
      setThread((t) => [...t, { from: 'me', text: topic.ask }, ...answer]);
      return;
    }
    setThread((t) => [...t, { from: 'me', text: topic.ask }]);
    setTyping(true);
    timer.current = window.setTimeout(() => {
      setTyping(false);
      setThread((t) => [...t, ...answer]);
    }, TYPING_MS);
  };

  const startOver = () => {
    window.clearTimeout(timer.current);
    refocus.current = true;
    setTyping(false);
    setUsed([]);
    setThread([]);
  };

  const remaining = topics.map((_, i) => i).filter((i) => !used.includes(i));

  return (
    <div className="chat">
      <p className="chat-head">Supakorn</p>
      <div className="chat-log" ref={logRef} role="log" aria-live="polite" aria-label="Chat">
        <p className="bubble them">{greeting}</p>
        {thread.map((b, i) =>
          b.from === 'link' ? (
            <a key={i} className="bubble link" href={b.link.href} {...external(b.link.href)}>
              {b.link.label}
            </a>
          ) : (
            <p key={i} className={`bubble ${b.from}`}>
              {b.text}
            </p>
          ),
        )}
        {typing && (
          <p className="bubble them typing">
            <span className="sr-only">Supakorn is typing</span>
            <span className="dot" aria-hidden="true" />
            <span className="dot" aria-hidden="true" />
            <span className="dot" aria-hidden="true" />
          </p>
        )}
      </div>
      <div className="chat-chips" ref={chipsRef}>
        {remaining.length > 0 ? (
          remaining.slice(0, VISIBLE_CHIPS).map((i) => (
            <button key={i} type="button" disabled={typing} onClick={() => ask(i)}>
              {topics[i].ask}
            </button>
          ))
        ) : (
          <button type="button" disabled={typing} onClick={startOver}>
            Start over
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the test and check it passes.**
  - Run: `npx vitest run src/ui/PhoneChat.test.tsx`
  - Expected: PASS (5 tests).

- [ ] **Step 6: Put the chat in Contact.** Replace `src/ui/Contact.tsx` with:

```tsx
import { chat, chatGreeting } from '../content/chat';
import type { Profile } from '../content/types';
import { PhoneChat } from './PhoneChat';
import { sideFor } from './side';

/**
 * The finale: the email and profiles, beside a phone whose screen is a chat. [data-phone-slot] is the
 * phone's screen; the scene settles its 3D phone behind it and marks it with data-scene (SceneLayer).
 */
export function Contact({ profile, anchor }: { profile: Profile; anchor: number }) {
  return (
    <section className="contact" id="contact" data-anchor={anchor} data-side={sideFor(anchor)} aria-labelledby="contact-title">
      <div className="contact-copy">
        <h2 className="part-title" id="contact-title">
          Say hello.
        </h2>
        <p>
          <a className="contact-email" href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
        </p>
        <p className="links">
          <a href={profile.github.href} target="_blank" rel="noreferrer">
            {profile.github.label}
          </a>
          <a href={profile.linkedin.href} target="_blank" rel="noreferrer">
            {profile.linkedin.label}
          </a>
        </p>
      </div>
      <div className="phone-slot" data-phone-slot>
        <PhoneChat greeting={chatGreeting} topics={chat} />
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Styles.** In `src/styles.css`, replace the `/* contact */` block (`.contact` and `.contact-email`) with the CSS below. In the narrow media query, delete `.contact { padding: 0 24px 12vh; }` and add the narrow rules shown at the end:

```css
/* contact: the copy, and a phone whose screen is the chat */
.contact {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 6vw;
  padding: 12vh 8vw;
}
.contact-email {
  font-size: clamp(24px, 3vw, 36px);
  font-weight: 600;
  letter-spacing: -0.02em;
}
/* the 3D phone's screen (aspect checked in objects.test.ts). With no data-scene, the scene is not drawing,
   so the slot draws its own bezel; "arriving" hides it while the 3D phone flies in; "on" sits on the 3D glass */
.phone-slot {
  width: clamp(220px, 22vw, 300px);
  aspect-ratio: 1440 / 3013;
  margin-right: 4vw;
  border-radius: 24px;
  overflow: hidden;
  background: #000;
  box-shadow:
    0 0 0 12px #1d1d1f,
    0 30px 60px rgb(0 0 0 / 0.28);
  transition: opacity 0.3s;
}
.phone-slot[data-scene='arriving'] {
  opacity: 0;
}
.phone-slot[data-scene='on'] {
  background: rgb(0 0 0 / 0.55);
  box-shadow: none;
}
.chat {
  height: 100%;
  display: flex;
  flex-direction: column;
  font-size: 13px;
  line-height: 1.35;
  letter-spacing: -0.005em;
}
.chat-head {
  margin: 0;
  padding: 16px 12px 8px;
  text-align: center;
  font-weight: 700;
  color: #f5f5f7;
}
.chat-log {
  flex: 1;
  overflow-y: auto;
  scrollbar-width: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 10px;
}
.bubble {
  margin: 0;
  max-width: 84%;
  padding: 7px 11px;
  border-radius: 16px;
  color: #f5f5f7;
}
.bubble.them {
  align-self: flex-start;
  background: #2c2c2e;
}
.bubble.me {
  align-self: flex-end;
  background: #0a84ff;
  color: #fff;
}
.bubble.link {
  align-self: flex-start;
  border: 1px solid #0a84ff;
  color: #64a8ff;
  font-weight: 600;
  text-decoration: none;
}
.typing .dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin: 0 2px;
  border-radius: 50%;
  background: #a1a1a6;
  animation: chat-dot 1s infinite;
}
.typing .dot:nth-child(3) {
  animation-delay: 0.15s;
}
.typing .dot:nth-child(4) {
  animation-delay: 0.3s;
}
@keyframes chat-dot {
  0%,
  80%,
  100% {
    opacity: 0.3;
  }
  40% {
    opacity: 1;
  }
}
.chat-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px;
}
.chat-chips button {
  font: inherit;
  font-size: 12px;
  text-align: left;
  color: #64a8ff;
  background: none;
  border: 1px solid #0a84ff;
  border-radius: 999px;
  padding: 5px 10px;
  cursor: pointer;
}
.chat-chips button:disabled {
  opacity: 0.4;
  cursor: default;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

Inside the narrow media query:

```css
  .contact {
    grid-template-columns: 1fr;
    gap: 48px;
    padding: 16vh 24px 12vh;
  }
  .phone-slot {
    justify-self: center;
    width: min(56vw, 230px);
    margin-right: 0;
  }
```

- [ ] **Step 8: Page and content tests.**
  - Add to `src/app/App.test.tsx` (import `chat` from `'../content/chat'`):

```tsx
  it('ends with the contact phone, whose chat links back to sections on the page', () => {
    const { container } = render(<App />);
    const slot = container.querySelector('#contact [data-phone-slot]')!;
    expect(within(slot as HTMLElement).getByRole('log')).toHaveTextContent('Tap a question');
    for (const href of chat.flatMap((t) => t.links.map((l) => l.href)).filter((h) => h.startsWith('#'))) {
      expect(container.querySelector(href), href).not.toBeNull();
    }
  });
```

  - In `tests/content.test.ts`, import `chat` from `'../src/content/chat'` and add to `describe('content')`:

```ts
  it('links chat answers only to sections on the page, the email, or the owner’s profiles', () => {
    for (const href of chat.flatMap((t) => t.links.map((l) => l.href))) {
      if (href.startsWith('#') || href === `mailto:${profile.email}`) continue;
      expect(hrefs, href).toContain(href);
    }
  });
```

- [ ] **Step 9: Run everything.**
  - Run: `npm test && npx tsc --noEmit`
  - Expected: PASS with clean output.

- [ ] **Step 10: Commit.**

```bash
git add -A src tests
git commit -m "feat: a chat on the contact phone, answered from the CV" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PVsCofSvenEXaFKqp3MYGN"
```

---

### Task 6: Headings melt the object down; the scene returns at Contact

**Files:**
- Modify: `src/scroll/useScrollProgress.ts`, `src/ui/PartHeading.tsx`, `src/ui/Contact.tsx`, `src/scene/types.ts`, `src/scene/createScene.ts`, `src/app/SceneLayer.tsx`, `src/app/SceneLayer.test.tsx`

**Interfaces:**
- Consumes: `dipAmount`, `sceneFade` and `arriveAmount` (Task 1).
- Produces:
  - `ScrollSample = { p: number; exit: number; dip: number; arrive: number }`. `arrive` is used by Task 7.
  - `SceneHandle.setDip(d: number): void`.
  - The markers `[data-scene-dip]` on `.part` and `[data-scene-return]` on `#contact`.

- [ ] **Step 1: Write the failing test.** In `src/app/SceneLayer.test.tsx`:
  - Change `handle` to `({ setProgress: vi.fn(), setTheme: vi.fn(), setActive: vi.fn(), setDip: vi.fn(), dispose: vi.fn() })`.
  - Change the two existing `scroll.sample!` calls to pass `dip: 0, arrive: 0` (`{ p: 7.4, exit: 0, dip: 0, arrive: 0 }` and `{ p: -0.8, exit: 0, dip: 0, arrive: 0 }`).
  - Widen the hoisted type to `((s: { p: number; exit: number; dip: number; arrive: number }) => void)`, and add:

```tsx
  it('forwards the heading dip to a running scene', async () => {
    const h = handle();
    createScene.mockReturnValue(h);
    render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    await waitFor(() => expect(createScene).toHaveBeenCalled());
    act(() => scroll.sample!({ p: 2, exit: 0, dip: 0.7, arrive: 0 }));
    expect(h.setDip).toHaveBeenLastCalledWith(0.7);
  });
```

- [ ] **Step 2: Run the test and check it fails.**
  - Run: `npx vitest run src/app/SceneLayer.test.tsx`
  - Expected: FAIL. `setDip` is never called, and there are type errors on `setDip`.

- [ ] **Step 3: Scene handle.** In `src/scene/types.ts`, add this to `SceneHandle`:

```ts
  /** 0..1: a part heading is passing the middle of the screen; the object melts down to a droplet. */
  setDip(d: number): void;
```

In `src/scene/createScene.ts`:
  - Add `let dip = 0;` and `let dipNow = 0;` after `let frameSum = 0;`.
  - Replace

```ts
    const size = swell.x * place.fit;
```

with

```ts
    // part headings passing the middle of the screen melt the object down to a droplet
    dipNow = still ? dip : dipNow + (dip - dipNow) * (1 - Math.exp(-dt * 10));
    const size = swell.x * place.fit * (1 - 0.82 * dipNow);
```

  - Add this to the returned handle, after `setTheme`:

```ts
    setDip(d) {
      dip = d;
    },
```

- [ ] **Step 4: Scroll hook.** In `src/scroll/useScrollProgress.ts`:
  - Change the import to `import { anchorPoint, arriveAmount, dipAmount, progressFromAnchors, sceneFade, scrollYForProgress } from './progress';`.
  - Replace the `ScrollSample` interface with:

```ts
export interface ScrollSample {
  /** Object-state progress, 0..n-1. */
  p: number;
  /** 0..1: how far the scene has faded out, from the project wall until Contact brings it back. */
  exit: number;
  /** 0..1: how close a part heading is to the middle of the screen. */
  dip: number;
  /** 0..1: the contact phone's arrival, over the last screen of the page. */
  arrive: number;
}
```

  - Replace `let exitTop = Infinity;` with:

```ts
    let exitTop = Infinity;
    let returnTop = Infinity;
    let dips: number[] = [];
```

  - Replace the two `exitEl` lines at the end of `measure` with:

```ts
      const pageTop = (el: Element | null) => (el ? el.getBoundingClientRect().top + window.scrollY : Infinity);
      exitTop = pageTop(document.querySelector('[data-scene-exit]'));
      returnTop = pageTop(document.querySelector('[data-scene-return]'));
      dips = [...document.querySelectorAll('[data-scene-dip]')].map((el) => {
        const r = el.getBoundingClientRect();
        return r.top + window.scrollY + r.height / 2;
      });
```

  - Replace the `callback.current(...)` line in `sample` with:

```ts
      const vh = window.innerHeight;
      callback.current({
        p: progressFromAnchors(y, anchors),
        exit: sceneFade(y, exitTop, returnTop, vh),
        dip: dipAmount(y, dips, vh),
        arrive: arriveAmount(y, returnTop, vh),
      });
```

  - If `exitFade` is now unused in this file, remove it from the import.

- [ ] **Step 5: Markers.**
  - In `src/ui/PartHeading.tsx`, change `<div className="part">` to `<div className="part" data-scene-dip>`.
  - In `src/ui/Contact.tsx`, add `data-scene-return` to the `<section>` (after `data-side`).

- [ ] **Step 6: SceneLayer.** In `src/app/SceneLayer.tsx`:
  - Add `const dipRef = useRef(0);` after `progressRef`.
  - In scene creation, after `handle.setProgress(progressRef.current);`, add `handle.setDip(dipRef.current);`.
  - In `onSample`, after `progressRef.current = s.p;`, add `dipRef.current = s.dip;`, and after `handleRef.current?.setProgress(s.p);`, add `handleRef.current?.setDip(s.dip);`.

- [ ] **Step 7: Run everything.**
  - Run: `npm test && npx tsc --noEmit`
  - Expected: PASS.

- [ ] **Step 8: Commit.**

```bash
git add -A src
git commit -m "feat(scene): melt the object down under part headings and bring it back at Contact" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PVsCofSvenEXaFKqp3MYGN"
```

---

### Task 7: The phone rolls in and settles behind the chat

**Files:**
- Modify: `src/scene/types.ts`, `src/scene/createScene.ts`, `src/scene/palette.ts`, `src/app/sceneItems.ts`, `src/app/sceneItems.test.ts`, `src/app/SceneLayer.tsx`, `src/app/SceneLayer.test.tsx`

**Interfaces:**
- Consumes: `fitToSlot` and `SlotRect` (Task 2), `[data-phone-slot]` (Task 5), `ScrollSample.arrive` (Task 6), and `phoneStage` (Task 1).
- Produces:
  - `SceneItem.slot?: boolean`.
  - `SceneOptions.getSlot?: () => SlotRect | null`.
  - `SceneOptions.onSlotChange?: (on: boolean) => void`.
  - `SceneHandle.setArrive(a: number): void`.
  - On `[data-phone-slot]`: `data-scene` (absent, `'arriving'` or `'on'`) and `data-stage` (`'off'`, `'lock'` or `'open'`).
  - Inside `createScene`: `slotScreen`, `settle`, `arriveNow` and `opts.centered`, which Task 8 uses for the lock screen plane.

- [ ] **Step 1: Write the failing tests.** Replace `src/app/sceneItems.test.ts` with:

```ts
import { expect, it } from 'vitest';
import { SCENE_ITEMS } from './sceneItems';

it('lists the eight object states in page order, ending with the contact phone', () => {
  expect(SCENE_ITEMS.map((i) => i.kind)).toEqual(['pebble', 'frame', 'laptop', 'frame', 'reader', 'phone', 'tablet', 'phone']);
  expect(SCENE_ITEMS[1].label).toBe('Best Paper');
  expect(SCENE_ITEMS[2].label).toBe('Mizuhada Group');
  expect(SCENE_ITEMS.map((i) => Boolean(i.slot))).toEqual([false, false, false, false, false, false, false, true]);
});
```

Add to `src/app/SceneLayer.test.tsx`:

```tsx
  describe('contact phone slot', () => {
    const renderWithSlot = () =>
      render(
        <>
          <SceneLayer items={SCENE_ITEMS} theme="light" />
          <div data-testid="slot" data-phone-slot />
        </>,
      );

    it('lets the slot draw its own phone while there is no scene', () => {
      vi.mocked(detectSceneMode).mockReturnValue('static');
      renderWithSlot();
      expect(screen.getByTestId('slot')).not.toHaveAttribute('data-scene');
    });

    it('hides the slot until the scene has settled the phone behind it', async () => {
      createScene.mockImplementation((_c: HTMLCanvasElement, _i: unknown, o: SceneOptions) => {
        o.onReady?.();
        return handle();
      });
      renderWithSlot();
      const slot = screen.getByTestId('slot');
      await waitFor(() => expect(slot).toHaveAttribute('data-scene', 'arriving'));
      const opts = createScene.mock.calls.at(-1)![2] as SceneOptions;
      act(() => opts.onSlotChange!(true));
      expect(slot).toHaveAttribute('data-scene', 'on');
      act(() => opts.onSlotChange!(false));
      expect(slot).toHaveAttribute('data-scene', 'arriving');
      expect(opts.getSlot!()).toEqual({ left: 0, top: 0, width: 0, height: 0 });
    });

    it('marks the screen stage as the phone arrives, in every mode', () => {
      vi.mocked(detectSceneMode).mockReturnValue('static');
      renderWithSlot();
      const slot = screen.getByTestId('slot');
      act(() => scroll.sample!({ p: 7, exit: 0, dip: 0, arrive: 0.2 }));
      expect(slot).toHaveAttribute('data-stage', 'off');
      act(() => scroll.sample!({ p: 7, exit: 0, dip: 0, arrive: 0.6 }));
      expect(slot).toHaveAttribute('data-stage', 'lock');
      act(() => scroll.sample!({ p: 7, exit: 0, dip: 0, arrive: 1 }));
      expect(slot).toHaveAttribute('data-stage', 'open');
    });

    it('forwards the arrival to a running scene', async () => {
      const h = handle();
      createScene.mockReturnValue(h);
      renderWithSlot();
      await waitFor(() => expect(createScene).toHaveBeenCalled());
      act(() => scroll.sample!({ p: 7, exit: 0, dip: 0, arrive: 0.4 }));
      expect(h.setArrive).toHaveBeenLastCalledWith(0.4);
    });
  });
```

Change `handle` in that file to `({ setProgress: vi.fn(), setTheme: vi.fn(), setActive: vi.fn(), setDip: vi.fn(), setArrive: vi.fn(), dispose: vi.fn() })`.

- [ ] **Step 2: Run the tests and check they fail.**
  - Run: `npx vitest run src/app/sceneItems.test.ts src/app/SceneLayer.test.tsx`
  - Expected: FAIL. The last kind is still 'sphere'; `onSlotChange`, `getSlot` and `setArrive` don't exist; and no `data-stage` is set.

- [ ] **Step 3: Types.** In `src/scene/types.ts`:
  - Add this to `SceneItem`:

```ts
  /** The page draws this state's screen: the object settles face-on behind the page's slot (SceneOptions.getSlot). */
  slot?: boolean;
```

  - Add this to `SceneOptions`:

```ts
  /** The page's slot rect for a `slot` state, in viewport CSS pixels; null when there is none. */
  getSlot?: () => SlotRect | null;
  /** Called when a `slot` state settles over its slot (true) or leaves it (false). */
  onSlotChange?: (on: boolean) => void;
```

  - Add this to `SceneHandle`:

```ts
  /** 0..1: the slot state's arrival; it rolls in edge-on from the right and lands face-on at 1. */
  setArrive(a: number): void;
```

- [ ] **Step 4: Scene items and palette comment.**
  - In `src/app/sceneItems.ts`, replace the sphere entry with `{ kind: 'phone', pics: [], label: 'Say hello.', slot: true },`.
  - Change the doc comment to `/** Object states in page order: hero pebble, the Best Paper frame, the five featured items, the contact phone. */`.
  - In `src/scene/palette.ts`, change `AckLab, projects` in the comment to `AckLab, contact`.

- [ ] **Step 5: createScene.** In `src/scene/createScene.ts`:
  - Change the imports to `import { CAMERA_Z, FOV, fitToSlot, placement, viewSize } from './layout';` and `import { ease, lerp, smoothstep } from './math';`.
  - Add `let arrive = 0;` and `let arriveNow = 0;` after `let dipNow = 0;`.
  - After the `const pictures = ...` line, add:

```ts
  // a slot state (the contact phone) rolls in and settles face-on behind the page's [data-phone-slot]
  const slotIndex = items.findIndex((item) => item.slot);
  const slotScreen = slotIndex >= 0 ? objects[slotIndex].planes[0] : undefined;
  let slotOn = false;
```

  - Replace everything from `    primed = true;` through `    group.scale.set(size * (1 + stretch), size * (1 - stretch * 0.6), size);` with the block below. It keeps the dip from Task 6.

```ts
    primed = true;

    const slotW = slotIndex === k ? wA : slotIndex === k + 1 ? wB : 0;
    const rect = slotScreen && slotW > 0 && !opts.centered ? (opts.getSlot?.() ?? null) : null;
    const fit =
      rect && slotScreen
        ? fitToSlot(
            rect,
            canvas.clientWidth || window.innerWidth,
            canvas.clientHeight || window.innerHeight,
            slotScreen.size[1],
            slotScreen.pos[2],
          )
        : null;
    const settle = fit ? smoothstep(slotW, 0.5, 1) : 0;
    const free = 1 - settle;
    // the arrival: from just past the right edge, edge-on and tilted (roll 1), to face-on in the slot (roll 0)
    arriveNow = still ? arrive : arriveNow + (arrive - arriveNow) * (1 - Math.exp(-dt * 10));
    const roll = opts.reducedMotion ? 0 : 1 - ease(arriveNow);
    const on = settle > 0.98 && arriveNow >= 0.97;
    if (on !== slotOn) {
      slotOn = on;
      opts.onSlotChange?.(on);
    }
    // capture stills leave a slot state empty: the page draws its own phone there
    mesh.visible = !(opts.centered && slotW > 0.5);
    const offX = viewSize(camera.aspect).w / 2 + (fit?.scale ?? 0) * 1.2;
    const slotX = fit ? lerp(fit.x, offX, roll) : 0;
    group.position.set(lerp(posX.x, slotX, settle), lerp(posY.x, fit?.y ?? 0, settle), 0);

    // resting angle (turned toward the text), a full spin and wobble through the liquid; in a slot, only the arrival roll
    const restA = objects[k].rest;
    const restB = objects[k + 1].rest;
    const sway = still ? 0 : Math.sin(t * 0.4) * 0.06;
    const tiltX = opts.reducedMotion ? 0 : my * 0.15;
    const tiltY = opts.reducedMotion ? 0 : mx * 0.35;
    const spin = opts.reducedMotion ? 0 : ease(s.g) * Math.PI * 2 * dir;
    group.rotation.set(
      (restA[0] * wA + restB[0] * wB + 0.15 * wBlob + tiltX + sway * 0.5 + wBlob * 0.5) * free,
      ((restA[1] * wA + restB[1] * wB) * dir + tiltY + sway + spin) * free - 1.47 * roll * settle,
      wBlob * Math.sin(t * 1.6) * 0.18 * free + 0.14 * roll * settle,
    );

    // swell with overshoot, squash and stretch from sideways speed (units per frame at 60 fps)
    const stretch = (still ? 0 : Math.min(0.35, (Math.abs(posX.v) / 60) * 2.6)) * free;
    // part headings passing the middle of the screen melt the object down to a droplet
    dipNow = still ? dip : dipNow + (dip - dipNow) * (1 - Math.exp(-dt * 10));
    const size = lerp(swell.x * place.fit, fit?.scale ?? 0, settle) * (1 - 0.82 * dipNow);
    group.scale.set(size * (1 + stretch), size * (1 - stretch * 0.6), size);
```

  - In the `background.update({...})` call, change `center: backgroundCenter(posX.x, posY.x, camera.position.z),` to `center: backgroundCenter(group.position.x, group.position.y, camera.position.z),`, so the glow follows the phone into its slot.
  - Add this to the returned handle, after `setDip`:

```ts
    setArrive(a) {
      arrive = a;
    },
```

- [ ] **Step 6: SceneLayer.** In `src/app/SceneLayer.tsx`:
  - Add these after the `useState` lines:

```tsx
  const statusRef = useRef(status);
  const slotOnRef = useRef(false);
  // mirrors the scene's hold on the contact phone onto [data-phone-slot] (see .phone-slot in styles.css)
  const syncSlot = useCallback(() => {
    const el = document.querySelector<HTMLElement>('[data-phone-slot]');
    if (!el) return;
    if (statusRef.current !== 'ready') delete el.dataset.scene;
    else el.dataset.scene = slotOnRef.current ? 'on' : 'arriving';
  }, []);

  useEffect(() => {
    statusRef.current = status;
    if (!capture) syncSlot();
  }, [status, capture, syncSlot]);
```

  - In the scene effect, just before `const handle = createScene(...)`, add `slotOnRef.current = false;`.
  - Add these options to the `createScene` call, after `centered: capture,`:

```tsx
          getSlot: capture
            ? undefined
            : () => {
                const el = document.querySelector('[data-phone-slot]');
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { left: r.left, top: r.top, width: r.width, height: r.height };
              },
          onSlotChange: (on) => {
            slotOnRef.current = on;
            syncSlot();
          },
```

  - Add `syncSlot` to that effect's dependency array.
  - Add `const arriveRef = useRef(0);` and `const stageRef = useRef<PhoneStage | null>(null);` next to `dipRef`. Import `phoneStage` and `type PhoneStage` from `'../scroll/progress'`.
  - In scene creation, after `handle.setDip(dipRef.current);`, add `handle.setArrive(arriveRef.current);`.
  - In `onSample`, after `handleRef.current?.setDip(s.dip);`, add:

```tsx
      arriveRef.current = s.arrive;
      handleRef.current?.setArrive(s.arrive);
      // the slot's screen stage, in every mode: the CSS phone (no WebGL) shows its lock screen and chat by it
      const stage = phoneStage(s.arrive);
      if (stage !== stageRef.current) {
        stageRef.current = stage;
        const el = document.querySelector<HTMLElement>('[data-phone-slot]');
        if (el) el.dataset.stage = stage;
      }
```

- [ ] **Step 7: Run everything and build.**
  - Run: `npm test && npm run build`
  - Expected: all tests pass, and the build passes its size check. Note the scene chunk's gzip size in the report; it should stay close to 123 KB.

- [ ] **Step 8: Commit.**

```bash
git add -A src
git commit -m "feat(scene): the contact phone rolls in from the side and settles behind the chat" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PVsCofSvenEXaFKqp3MYGN"
```

---

### Task 8: The liquid-glass lock screen

**Files:**
- Create: `src/ui/lockScreen.ts`, `src/ui/lockScreen.test.ts`, `src/ui/LockCanvas.tsx`, `src/scene/lockPlane.ts`
- Modify: `src/scene/pictures.ts`, `src/scene/createScene.ts`, `src/ui/Contact.tsx`, `src/styles.css`, `src/test/setup.ts`

**Interfaces:**
- Consumes:
  - `data-stage` and `data-scene` on the slot (Task 7).
  - Inside `createScene`: `slotScreen`, `settle` and `arriveNow` (Task 7).
- Produces:
  - `lockClock(now: Date): { time: string; date: string }`.
  - `drawLockScreen(ctx, w, h, { time, date, faceId })`.
  - `LOCK_NOTE`.
  - `<LockCanvas />`.
  - `createLockPlane(plane): { mesh, update(amount, faceId), dispose() }`.
  - `screenMaterial(aspect)` exported from `pictures.ts`.

- [ ] **Step 1: Quiet the missing canvas in tests.** jsdom has no canvas, and `getContext` logs "not implemented". In `src/test/setup.ts`, import `vi` from vitest and make `beforeEach` stub it:

```ts
beforeEach(() => {
  mockMatchMedia();
  // jsdom has no canvas: return no context quietly instead of logging "not implemented"
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
```

(Replace the existing `beforeEach(() => mockMatchMedia());`. Tests that need a context still override it with their own `mockReturnValue`.)

- [ ] **Step 2: Write the failing tests.** Create `src/ui/lockScreen.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LOCK_NOTE, drawLockScreen, lockClock } from './lockScreen';

/** A 2D context that records the text it draws and the names of the other calls. */
function fakeContext() {
  const texts: string[] = [];
  const calls: string[] = [];
  const state: Record<string, unknown> = {};
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === 'fillText') return (text: string) => texts.push(text);
      if (prop === 'createRadialGradient') return () => ({ addColorStop() {} });
      if (prop === 'measureText') return (text: string) => ({ width: text.length * 10 });
      return () => calls.push(prop);
    },
    set(target, prop: string, value) {
      target[prop] = value;
      return true;
    },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts, calls };
}

const clock = { time: '9:41', date: 'Sunday 18 October' };

describe('lockClock', () => {
  it('shows the visitor’s time and date the way a lock screen does', () => {
    expect(lockClock(new Date(2026, 9, 18, 9, 41))).toEqual({ time: '9:41', date: 'Sunday 18 October' });
    expect(lockClock(new Date(2026, 9, 18, 21, 5)).time).toBe('21:05');
  });
});

describe('drawLockScreen', () => {
  it('draws the date, the clock and the notification', () => {
    const { ctx, texts } = fakeContext();
    drawLockScreen(ctx, 360, 752, { ...clock, faceId: 0 });
    expect(texts).toEqual(expect.arrayContaining([clock.date, clock.time, LOCK_NOTE.from, LOCK_NOTE.when, LOCK_NOTE.text]));
  });

  it('adds the Face ID ring only once it has started', () => {
    const idle = fakeContext();
    drawLockScreen(idle.ctx, 360, 752, { ...clock, faceId: 0 });
    const scanning = fakeContext();
    drawLockScreen(scanning.ctx, 360, 752, { ...clock, faceId: 0.5 });
    const arcs = (calls: string[]) => calls.filter((c) => c === 'arc').length;
    expect(arcs(idle.calls)).toBe(0);
    expect(arcs(scanning.calls)).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run the test and check it fails.**
  - Run: `npx vitest run src/ui/lockScreen.test.ts`
  - Expected: FAIL, because `./lockScreen` does not exist.

- [ ] **Step 4: Implement the drawing.** Create `src/ui/lockScreen.ts`:

```ts
/**
 * The contact phone's lock screen, "liquid glass": pastel blooms behind a translucent clock and a frosted
 * notification. Plain Canvas 2D, so the 3D phone's screen texture and the no-WebGL phone draw the same picture.
 */

export interface LockState {
  time: string;
  date: string;
  /** 0..1: the Face ID ring sweeping round; 1 is a tick; 0 hides the glyph. */
  faceId: number;
}

export const LOCK_NOTE = { from: 'Supakorn', when: 'now', text: 'made it to the bottom? say hi 👋' };

const FONT = '"Inter Tight", system-ui, sans-serif';

/** The visitor's own time and date, as a lock screen shows them: "9:41", "Sunday 18 October". */
export function lockClock(now: Date): Pick<LockState, 'time' | 'date'> {
  return {
    time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
    date: now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
  };
}

function bloom(ctx: CanvasRenderingContext2D, w: number, h: number, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function faceIdGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, progress: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = r * 0.13;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (progress < 1) {
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
  } else {
    ctx.moveTo(x - r * 0.5, y);
    ctx.lineTo(x - r * 0.12, y + r * 0.4);
    ctx.lineTo(x + r * 0.55, y - r * 0.38);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawLockScreen(ctx: CanvasRenderingContext2D, w: number, h: number, s: LockState): void {
  ctx.fillStyle = '#e9ecf5';
  ctx.fillRect(0, 0, w, h);
  bloom(ctx, w, h, 0.3 * w, 0.3 * h, 0.75 * w, 'rgba(201, 214, 255, 1)');
  bloom(ctx, w, h, 0.75 * w, 0.65 * h, 0.7 * w, 'rgba(255, 209, 232, 1)');
  bloom(ctx, w, h, 0.4 * w, 0.92 * h, 0.85 * w, 'rgba(184, 240, 228, 1)');
  bloom(ctx, w, h, 0.5 * w, 0.26 * h, 0.5 * w, 'rgba(255, 255, 255, 0.55)');

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(30, 30, 50, 0.6)';
  ctx.font = `600 ${Math.round(h * 0.03)}px ${FONT}`;
  ctx.fillText(s.date, w / 2, h * 0.12);

  // the clock: clear glass lifted by a soft shadow
  ctx.save();
  ctx.shadowColor = 'rgba(80, 90, 140, 0.35)';
  ctx.shadowBlur = h * 0.04;
  ctx.shadowOffsetY = h * 0.006;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.font = `700 ${Math.round(h * 0.19)}px ${FONT}`;
  ctx.fillText(s.time, w / 2, h * 0.3);
  ctx.restore();

  // the notification: a frosted pill near the bottom
  const nx = w * 0.06;
  const nw = w * 0.88;
  const nh = h * 0.11;
  const ny = h * 0.79;
  ctx.save();
  ctx.shadowColor = 'rgba(80, 90, 140, 0.18)';
  ctx.shadowBlur = h * 0.03;
  roundRect(ctx, nx, ny, nw, nh, h * 0.028);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
  ctx.fill();
  ctx.restore();
  roundRect(ctx, nx, ny, nw, nh, h * 0.028);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = Math.max(1, h * 0.002);
  ctx.stroke();

  const tx = nx + w * 0.05;
  const small = Math.round(h * 0.026);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1d1d1f';
  ctx.font = `700 ${small}px ${FONT}`;
  ctx.fillText(LOCK_NOTE.from, tx, ny + nh * 0.42);
  const fromWidth = ctx.measureText(`${LOCK_NOTE.from} `).width;
  ctx.fillStyle = 'rgba(29, 29, 31, 0.55)';
  ctx.font = `600 ${small}px ${FONT}`;
  ctx.fillText(LOCK_NOTE.when, tx + fromWidth, ny + nh * 0.42);
  ctx.fillStyle = '#1d1d1f';
  ctx.font = `500 ${small}px ${FONT}`;
  ctx.fillText(LOCK_NOTE.text, tx, ny + nh * 0.76, nw - w * 0.1);

  // home indicator
  roundRect(ctx, w * 0.37, h * 0.966, w * 0.26, h * 0.006, h * 0.003);
  ctx.fillStyle = 'rgba(30, 30, 50, 0.35)';
  ctx.fill();

  if (s.faceId > 0) faceIdGlyph(ctx, w / 2, h * 0.62, w * 0.1, s.faceId);
}
```

- [ ] **Step 5: Run the test and check it passes.**
  - Run: `npx vitest run src/ui/lockScreen.test.ts`
  - Expected: PASS (3 tests).

- [ ] **Step 6: Share the screen shader.** In `src/scene/pictures.ts`, add the function below, and in `createPictures` replace the inline `new ShaderMaterial({...})` with `const material = screenMaterial(aspect);`:

```ts
/** The screen-face material: a texture in rounded corners, faded by uAmt. */
export function screenMaterial(aspect: number): ShaderMaterial {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uImg: { value: null },
      uAmt: { value: 0 },
      uPlaneAsp: { value: aspect },
      uScale: { value: new Vector2(1, 1) },
      uOffset: { value: new Vector2(0, 0) },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
}
```

Run `npx vitest run src/scene/pictures.test.ts`. Expected: PASS, with no behaviour change.

- [ ] **Step 7: The lock screen on the 3D phone.** Create `src/scene/lockPlane.ts`:

```ts
import { CanvasTexture, Mesh, PlaneGeometry } from 'three';
import { drawLockScreen, lockClock } from '../ui/lockScreen';
import type { PlaneSpec } from './objects/types';
import { screenMaterial } from './pictures';

const HEIGHT = 1024;
const FACE_ID_STEPS = 24;

export interface LockPlane {
  mesh: Mesh;
  /** amount: 0..1 opacity over the dark glass; faceId: 0..1 Face ID progress. */
  update(amount: number, faceId: number): void;
  dispose(): void;
}

/** The contact phone's lock screen on its 3D screen, repainted only when the minute or the Face ID step changes. */
export function createLockPlane(plane: PlaneSpec): LockPlane {
  const aspect = plane.size[0] / plane.size[1];
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(HEIGHT * aspect);
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const texture = new CanvasTexture(canvas);
  const material = screenMaterial(aspect);
  material.uniforms.uImg.value = texture;
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  mesh.renderOrder = 1;
  mesh.position.set(...plane.pos);
  mesh.rotation.set(...plane.rot);
  mesh.scale.set(plane.size[0], plane.size[1], 1);
  mesh.visible = false;
  let painted = '';

  return {
    mesh,
    update(amount, faceId) {
      mesh.visible = amount > 0.001;
      material.uniforms.uAmt.value = amount;
      if (!mesh.visible || !ctx) return;
      const clock = lockClock(new Date());
      const step = Math.round(faceId * FACE_ID_STEPS) / FACE_ID_STEPS;
      const key = `${clock.time}|${step}`;
      if (key === painted) return;
      painted = key;
      drawLockScreen(ctx, canvas.width, canvas.height, { ...clock, faceId: step });
      texture.needsUpdate = true;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
```

In `src/scene/createScene.ts`:
  - Import `createLockPlane` from `./lockPlane`, and add `clamp01` to the `./math` import.
  - After `scene.add(group);`, add:

```ts
  const lock = slotScreen ? createLockPlane(slotScreen) : null;
  if (lock) group.add(lock.mesh);
```

  - Right after the `if (on !== slotOn) { ... }` block, add:

```ts
    // the lock screen wakes halfway through the arrival, runs Face ID from 80%, and gives way to the chat
    lock?.update(
      opts.centered ? 0 : settle * smoothstep(arriveNow, 0.5, 0.6) * (1 - smoothstep(arriveNow, 0.97, 1)),
      clamp01((arriveNow - 0.8) / 0.17),
    );
```

  - In `dispose()`, add `lock?.dispose();` after the pictures loop.

- [ ] **Step 8: The lock screen in the CSS phone.** Create `src/ui/LockCanvas.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { drawLockScreen, lockClock } from './lockScreen';

/** The lock screen for the CSS phone (no WebGL); the 3D phone paints the same picture on its screen. */
export function LockCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let alive = true;
    const paint = () => {
      if (!alive) return;
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      drawLockScreen(ctx, canvas.width, canvas.height, { ...lockClock(new Date()), faceId: 1 });
    };
    paint();
    document.fonts?.ready.then(paint); // the clock is set in Inter Tight
    return () => {
      alive = false;
    };
  }, []);

  return <canvas className="phone-lock" ref={ref} aria-hidden="true" />;
}
```

In `src/ui/Contact.tsx`, import `LockCanvas` and render `<LockCanvas />` inside the slot, just before `<PhoneChat ... />`.

- [ ] **Step 9: Stage styles.** Append to the contact styles in `src/styles.css`:

```css
/* the screen follows the arrival (data-stage, set by SceneLayer): dark, the lock screen from halfway, the chat once landed.
   With the scene running (data-scene), the 3D screen paints the lock screen and the slot only ever shows the chat */
.phone-slot {
  position: relative;
}
.phone-lock {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.4s;
}
.phone-slot[data-stage='off'] .phone-lock,
.phone-slot[data-stage='open'] .phone-lock,
.phone-slot[data-scene] .phone-lock {
  opacity: 0;
}
.phone-slot .chat {
  transition:
    opacity 0.3s,
    visibility 0.3s;
}
.phone-slot:not([data-stage='open']) .chat {
  opacity: 0;
  visibility: hidden;
}
```

- [ ] **Step 10: Run everything and build.**
  - Run: `npm test && npm run build`
  - Expected: PASS with clean output, and the size check passes.

- [ ] **Step 11: Commit.**

```bash
git add -A src
git commit -m "feat: the contact phone wakes to a liquid-glass lock screen before the chat" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PVsCofSvenEXaFKqp3MYGN"
```

---

### Task 9: Stills, section captures and a visual pass

**Files:**
- Modify: `scripts/capture.mjs`, `package.json`, `README.md`, `docs/superpowers/specs/2026-10-16-portfolio-liquid-objects-design.md`
- Regenerate: `public/fallback/*.webp` (only 7 should change visibly)

**Interfaces:**
- Consumes: the full page from Tasks 3–8.
- Produces: `npm run capture:sections`, which writes `review/sections-<size>-<theme>-<label>.png` (git-ignored).

- [ ] **Step 1: Add a `sections` mode to `scripts/capture.mjs`.**
  - Update the header comment with the line `//   node scripts/capture.mjs sections  → review/sections-<size>-<theme>-<label>.png (scrolled views of the lower parts)`.
  - Change the mode check to `if (!['fallback', 'review', 'meta', 'sections'].includes(mode)) {` with the usage text `'Usage: node scripts/capture.mjs <fallback|review|meta|sections>'`.
  - Add these helpers above `const mode = ...`:

```js
/** Scrolls so that the page-space y given by `expr` (a JS expression) is the top of the viewport. */
const scrollTo = (page, expr) =>
  page.send('Runtime.evaluate', { expression: `window.scrollTo({ top: ${expr}, behavior: 'instant' })` });

const aboutAt = (f) =>
  `(() => { const r = document.querySelector('#about').getBoundingClientRect(); return scrollY + r.top + Math.max(0, r.height - innerHeight) * ${f}; })()`;

// scrollY at which the contact phone's arrival is f (0..1): arrive = (scrollY + vh - contactTop) / vh
const contactAt = (f) =>
  `scrollY + document.querySelector('#contact').getBoundingClientRect().top - innerHeight * ${1 - f}`;

// the lower parts, in page order; each run() leaves the page ready for a screenshot
const SECTION_SHOTS = [
  {
    label: 'projects-heading',
    run: (page) =>
      scrollTo(page, `(() => { const r = document.querySelector('#projects .part').getBoundingClientRect(); return scrollY + r.top + r.height / 2 - innerHeight / 2; })()`),
  },
  { label: 'wall', run: (page) => scrollTo(page, `scrollY + document.querySelector('#project-list').getBoundingClientRect().top`) },
  {
    label: 'wall-card',
    run: async (page) => {
      const { result } = await page.send('Runtime.evaluate', {
        expression: `JSON.stringify((({ x, y, width, height }) => ({ x: x + width * 0.4, y: y + height / 2 }))(document.querySelector('#wall-name-0').getBoundingClientRect()))`,
        returnByValue: true,
      });
      const { x, y } = JSON.parse(result.value);
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    },
  },
  { label: 'about-start', run: (page) => scrollTo(page, aboutAt(0)) },
  { label: 'about-middle', run: (page) => scrollTo(page, aboutAt(0.5)) },
  { label: 'about-end', run: (page) => scrollTo(page, aboutAt(0.99)) },
  { label: 'contact-roll', run: (page) => scrollTo(page, contactAt(0.3)) },
  { label: 'contact-lock', run: (page) => scrollTo(page, contactAt(0.88)) },
  { label: 'contact', run: (page) => scrollTo(page, 'document.documentElement.scrollHeight') },
  {
    label: 'contact-chat',
    run: (page) => page.send('Runtime.evaluate', { expression: `document.querySelector('.chat-chips button').click()` }),
  },
];
```

  - Add this branch before the final `else` (review) branch:

```js
  } else if (mode === 'sections') {
    const outDir = path('../review/');
    mkdirSync(outDir, { recursive: true });
    const sizes = [
      ['desktop', [1440, 900], false, 'scene=full&'],
      ['mobile', [390, 844], true, ''],
    ];
    for (const [name, [width, height], mobile, query] of sizes) {
      for (const theme of THEMES) {
        await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
        await page.send('Page.navigate', { url: `${BASE}?${query}theme=${theme}` });
        await sleep(SETTLE_MS);
        for (const shot of SECTION_SHOTS) {
          await shot.run(page);
          await sleep(1500); // springs, the dip, the slot settling and the chat's typing
          const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
          const out = `${outDir}sections-${name}-${theme}-${shot.label}.png`;
          writeFileSync(out, Buffer.from(data, 'base64'));
          console.log(`review/sections-${name}-${theme}-${shot.label}.png`);
        }
      }
    }
```

  - In `package.json`, add `"capture:sections": "node scripts/capture.mjs sections"` after `capture:review`.
  - In `README.md`, add `npm run capture:sections  # with preview running: scrolled shots of the project wall, About and Contact into review/` to the command list.
  - Under "Replacing a placeholder screenshot", add a line saying the contact chat's questions and answers live in `src/content/chat.ts`.
  - In `docs/superpowers/specs/2026-10-16-portfolio-liquid-objects-design.md` §3, add one line under the table: `State 7 is now the contact phone; see 2026-10-18-lower-parts-design.md.`

- [ ] **Step 2: Regenerate the stills.**
  - Run: `npm run build`, then start `npm run preview` in the background, then run `npm run capture:fallback`.
  - Expected: 16 files written.
  - Open `public/fallback/7-light.webp` and `7-dark.webp`: each must show the background glow with no object. Open `6-light.webp`: it must still show the AckLab tablet.

- [ ] **Step 3: Capture and look at every shot.**
  - Run: `npm run capture:review && npm run capture:sections` (preview still running).
  - Read every `review/sections-*.png` and `review/*-p7.png` image, and check:
    1. **`projects-heading`:** the object is a small droplet and is not covering the "Projects" heading or its line, on both desktop and mobile.
    2. **`wall`:** 10 names at large size, with no 3D object visible.
    3. **`wall-card`:** the card sits beside the pointer, dark in light mode and light in dark mode.
    4. **`about-*`:** the title is pinned, the panels move sideways across the three desktop shots, and no panel's text is clipped at the bottom. On mobile, the first panel and the dots show.
    5. **`contact-roll` / `contact-lock`:** at 30% the phone is partly in from the right edge, turned edge-on, with a dark screen. At 88% it is nearly face-on, showing the liquid-glass lock screen (pastel blooms, clock, notification) with the Face ID ring part-way round.
    6. **`contact`:** on desktop the phone sits right of the text, the chat is inside the phone's screen with no visible gap between the chat edge and the 3D body, and there's no second (CSS) bezel. On mobile the phone is below the text.
    7. **`contact-chat`:** the question bubble and answer bubble are readable over the glass.
  - Fix any problem in the CSS or code (and rerun `npm test`) before moving on.
  - If the chat and the 3D screen are misaligned by more than a few pixels, check that `.phone-slot`'s aspect matches the phone's screen plane and that `fitToSlot` gets the canvas size.

- [ ] **Step 4: Stop the preview server, run the full checks and commit.**
  - Run: `npm test && npm run build`
  - Expected: PASS.

```bash
git add -A scripts package.json README.md docs public/fallback src
git commit -m "chore: section captures, and stills for the contact phone" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01PVsCofSvenEXaFKqp3MYGN"
```
