# Portfolio: Liquid Objects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Supakorn Prayongyam's single-page portfolio. One 3D object sets into a glossy-black device for each CV item and shows that item's screenshot. Between items it melts into liquid glass. The page follows the approved spec `docs/superpowers/specs/2026-10-16-portfolio-liquid-objects-design.md`.

**Architecture:** Vite + React 19 + TypeScript.
- **Page:** React renders all text and scrolls normally.
- **Scene:** a fixed `<canvas>` behind the text holds a framework-free three.js scene (`src/scene/`). It is loaded lazily with `import()`, and React drives it only through `setProgress / setTheme / setActive / dispose`.
- **Scroll progress:** measured from DOM anchors (`data-anchor`), not from fixed section heights.
- **Pure maths:** all of it (progress, step weights, layout, springs, cover-fit, shapes) lives in small modules with unit tests. The WebGL parts are checked by headless-Chrome screenshots.

**Tech Stack:** Vite 7.3.6, React 19.2.8, TypeScript 5.9.3, three 0.170.0 (plain, no React Three Fiber), @fontsource/inter-tight 5.3.0, Vitest 4.1.11, jsdom 29.1.1, Testing Library, sharp 0.35.5 (dev only, for images).

**Reference prototype:** `.superpowers/brainstorm/proto-liquid.html` (git-ignored, present on disk). Every scene constant below is ported from it. Open it at `http://127.0.0.1:50701/proto-liquid.html?p=2&theme=dark` (any `python3 -m http.server 50701 --directory .superpowers/brainstorm`) to compare.

## Global Constraints

- Node ≥ 20.19 (Vite 7). Developed on Node 25.9.
- Runtime dependencies are exactly: `react@19.2.8`, `react-dom@19.2.8`, `three@0.170.0`, `@fontsource/inter-tight@5.3.0`. No React Three Fiber, no animation or CSS libraries.
- The internal product name from the Mizuhada internship must never appear anywhere in the repository: copy, code, file names, alt text, comments, docs or commit messages (case-insensitive). Describe it only as "an enterprise multi-agent RAG assistant". The content test matches it by hash, so even the test never contains it. `.superpowers/` is never committed.
- No phone number anywhere on the site. No availability or "open to work" claim. No status badges.
- Section headings are plain words ("Research", "Experience", "Projects"). Never use all-caps eyebrow labels.
- Type: Inter Tight, self-hosted through `@fontsource/inter-tight` (weights 500, 600 and 800, latin subset). No Google Fonts request. Headings use weight 800 and -0.035em tracking (never tighter: it merges "rn" into "m"). Hero clamp(64px, 10vw, 164px). Section titles clamp(48px, 6vw, 96px). Body 19px/1.5, weight 500.
- Light theme: background `#F5F5F7`, ink `#1D1D1F`, dim `#6E6E73`. Dark theme: background `#000000`, ink `#F5F5F7`, dim `#A1A1A6`.
- The theme defaults to the system preference. A toggle overrides it. Every `localStorage` access is wrapped in try/catch.
- Text sections scroll normally (never sticky). Each is about 130vh on wide screens. Text alternates sides, and the object sits opposite.
- Narrow layout means a viewport under 800px wide. There, each object section reserves its top 55vh for the object.
- The scene module (`src/scene/createScene.ts` and three.js) is reached only through a dynamic `import()`. Nothing in the entry chunk may import `three`.
- The scene chunk is at most 220 KB gzipped (checked by `scripts/check-size.mjs`). Pixel ratio is capped at 2.
- Always call `window.matchMedia`, `window.location`, `window.innerWidth` and `window.innerHeight` through `window.`, so tests can stub them.
- Every commit message ends with a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The commit commands below pass it as a second `-m`.

## File map

```
index.html                      page shell
package.json, tsconfig.json, vite.config.ts
src/main.tsx                    entry: fonts, styles, <App/>
src/styles.css                  tokens, layout, components
src/test/setup.ts, src/test/matchMedia.ts
src/content/                    typed CV data (single source of text, links, image paths)
  types.ts profile.ts featured.ts projects.ts about.ts
src/scroll/
  progress.ts                   pure: anchors → progress, inverse, exit fade
  useScrollProgress.ts          DOM hook: measures anchors, reports {p, exit}
  usePrefersReducedMotion.ts
src/scene/                      framework-free three.js
  types.ts                      Theme, SceneItem, SceneOptions, SceneHandle
  math.ts step.ts layout.ts springs.ts coverFit.ts   pure maths
  objects/                      one file per object: shape, picture planes, rest angle
    types.ts box.ts pebble.ts reader.ts phone.ts laptop.ts frame.ts tablet.ts sphere.ts book.ts blob.ts index.ts
  geometry.ts material.ts background.ts palette.ts pictures.ts
  createScene.ts                renderer, frame loop
src/ui/                         presentational components
  side.ts ThemeToggle.tsx TopBar.tsx Hero.tsx FeatureSection.tsx ProjectRows.tsx MoreProjects.tsx AboutBlock.tsx Contact.tsx
src/app/
  App.tsx theme.ts capability.ts sceneItems.ts SceneLayer.tsx StaticFallback.tsx
tests/content.test.ts           repo-wide content checks
scripts/check-size.mjs report-placeholders.mjs capture.mjs
public/shots/                   screenshots (placeholders are only named, never shipped as files)
public/fallback/                pre-rendered stills, <state>-<light|dark>.webp
```

State order (anchor index → object → content) is fixed everywhere:

| k | anchor | object | content |
|---|--------|--------|---------|
| 0 | Hero | pebble | name + intro |
| 1 | FeatureSection | reader | ESNIDSaaS |
| 2 | FeatureSection | phone | MA-ZeroPhish |
| 3 | FeatureSection | laptop | Mizuhada Group |
| 4 | FeatureSection | frame | Baka Co. |
| 5 | FeatureSection | tablet | AckLab |
| 6 | ProjectRows | sphere | project list |

Even k places the text on the left and the object on the right. Odd k does the opposite.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/styles.css`, `src/app/App.tsx`, `src/test/setup.ts`, `src/test/matchMedia.ts`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `App(): JSX.Element` from `src/app/App.tsx`, replaced in Task 4.
  - `mockMatchMedia(matching?: string[]): void` from `src/test/matchMedia.ts`. It stubs `window.matchMedia` so that only the listed queries match. `src/test/setup.ts` calls it with no arguments before every test.
  - The CSS tokens `--bg --ink --dim --line --btn --bar` in `src/styles.css`.

- [ ] **Step 1: Create package.json**

```json
{
  "name": "supakorn-portfolio",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=20.19" },
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 127.0.0.1 --port 4173 --strictPort",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Install exact dependency versions**

```bash
npm install --save-exact react@19.2.8 react-dom@19.2.8 three@0.170.0 @fontsource/inter-tight@5.3.0
npm install --save-exact -D vite@7.3.6 @vitejs/plugin-react@5.2.0 typescript@5.9.3 vitest@4.1.11 jsdom@29.1.1 @testing-library/react@16.3.2 @testing-library/dom@10.4.2 @testing-library/jest-dom@7.0.1 @testing-library/user-event@14.6.6 @types/react@19.2.18 @types/react-dom@19.2.5 @types/three@0.170.0 @types/node@24.13.3 sharp@0.35.5
```

Expected: both commands finish without `ERESOLVE` errors and `package-lock.json` is created.

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 5: Create index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark" />
    <meta
      name="description"
      content="Supakorn Prayongyam, computer engineering student at SIIT, Thammasat. AI systems, security tooling and distributed infrastructure."
    />
    <title>Supakorn Prayongyam</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create src/styles.css (tokens and base only; later tasks append)**

```css
:root {
  --bg: #f5f5f7;
  --ink: #1d1d1f;
  --dim: #6e6e73;
  --line: #d2d2d7;
  --btn: #e8e8ed;
  --bar: rgb(245 245 247 / 0.72);
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --bg: #000000;
    --ink: #f5f5f7;
    --dim: #a1a1a6;
    --line: #2c2c2e;
    --btn: #1d1d1f;
    --bar: rgb(0 0 0 / 0.6);
    color-scheme: dark;
  }
}

:root[data-theme='dark'] {
  --bg: #000000;
  --ink: #f5f5f7;
  --dim: #a1a1a6;
  --line: #2c2c2e;
  --btn: #1d1d1f;
  --bar: rgb(0 0 0 / 0.6);
  color-scheme: dark;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Inter Tight', system-ui, sans-serif;
  font-size: 19px;
  line-height: 1.5;
  font-weight: 500;
  letter-spacing: -0.01em;
  -webkit-font-smoothing: antialiased;
  transition:
    background-color 0.5s,
    color 0.5s;
}

a {
  color: var(--ink);
  text-underline-offset: 5px;
  text-decoration-thickness: 1.5px;
}

:focus-visible {
  outline: 2px solid var(--ink);
  outline-offset: 3px;
  border-radius: 4px;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  body {
    transition: none;
  }
}
```

- [ ] **Step 7: Create src/app/App.tsx (shell, replaced in Task 4)**

```tsx
export function App() {
  return <main />;
}
```

- [ ] **Step 8: Create src/main.tsx**

```tsx
import '@fontsource/inter-tight/latin-500.css';
import '@fontsource/inter-tight/latin-600.css';
import '@fontsource/inter-tight/latin-800.css';
import './styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 9: Create the test helpers**

`src/test/matchMedia.ts`:

```ts
import { vi } from 'vitest';

/** Stubs window.matchMedia so that only the listed media queries match. */
export function mockMatchMedia(matching: string[] = []): void {
  const impl = (query: string) =>
    ({
      matches: matching.includes(query),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }) as unknown as MediaQueryList;
  window.matchMedia = vi.fn(impl) as unknown as typeof window.matchMedia;
}
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { mockMatchMedia } from './matchMedia';

beforeEach(() => mockMatchMedia());

afterEach(() => {
  cleanup();
  try {
    localStorage.clear();
  } catch {
    // a test stubbed storage to throw
  }
  delete document.documentElement.dataset.theme;
});
```

- [ ] **Step 10: Write the smoke test**

`src/app/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { App } from './App';

it('renders the page shell', () => {
  render(<App />);
  expect(screen.getByRole('main')).toBeInTheDocument();
});
```

- [ ] **Step 11: Run tests and build**

Run: `npm test`
Expected: `1 passed`.

Run: `npm run build`
Expected: `tsc` prints nothing, then Vite prints `✓ built in …` and writes `dist/index.html`.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src
git commit -m "chore: scaffold Vite + React + TypeScript project" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Content data and repo-wide content checks

**Files:**
- Create: `src/content/types.ts`, `src/content/profile.ts`, `src/content/featured.ts`, `src/content/projects.ts`, `src/content/about.ts`
- Create: `public/shots/esnidsaas.webp`, `public/shots/baka.webp`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (all named exports):
  - `types.ts`:
    - `DeviceKind = 'reader' | 'phone' | 'laptop' | 'frame' | 'tablet'`
    - `Group = 'Research' | 'Experience' | 'Projects'`
    - `Link { label; href }`
    - `Pic { src: string; focus?: [number, number] }`
    - `FeaturedItem { id; group; title; meta; body: string[]; figures: string[]; links: Link[]; object: DeviceKind; pics: Pic[] }`
    - `ProjectRow { name; line; tech; href }`
    - `MoreProject { name; line; href? }`
    - `Profile { name; intro; email; github: Link; linkedin: Link }`
    - `SkillGroup { label; items: string[] }`
    - `About { honors; education: { school; degree; detail; coursework }; skills: SkillGroup[]; activities: { name; detail }[]; languages: string[] }`
  - `profile: Profile` from `profile.ts`.
  - `featured: FeaturedItem[]` from `featured.ts`. It has exactly 5 items, in state order 1–5.
  - `projectRows: ProjectRow[]` and `moreProjects: MoreProject[]` from `projects.ts`.
  - `about: About` from `about.ts`.
  - Screenshot paths are site-absolute (`/shots/…`). A path containing `.placeholder.` is a placeholder marker. No file exists for it.

- [ ] **Step 1: Write the failing content test**

`tests/content.test.ts`:

```ts
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { featured } from '../src/content/featured';
import { profile } from '../src/content/profile';
import { moreProjects, projectRows } from '../src/content/projects';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TEXT = new Set(['.ts', '.tsx', '.css', '.html', '.json', '.svg', '.txt', '.md', '.webmanifest']);

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

const shipped = [...filesUnder(join(ROOT, 'src')), ...filesUnder(join(ROOT, 'public')), join(ROOT, 'index.html')];
const textFiles = shipped.filter((f) => TEXT.has(extname(f)));
const repoFiles = [
  ...shipped,
  ...['docs', 'scripts', 'tests'].flatMap((d) => filesUnder(join(ROOT, d))),
  ...['README.md', 'package.json'].map((f) => join(ROOT, f)).filter((f) => existsSync(f)),
];

// The internal Mizuhada product name is never written in this repo, not even here:
// it is matched by the SHA-256 of its lower-case letters (6 characters long).
const BANNED_SHA256 = '1c14bf04c4b3c259593b8139f4e8586a7ec883fa73dc5bacfc4a3fe9088caaf8';
const BANNED_LENGTH = 6;
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** True if the text, lower-cased with everything but letters and digits removed, contains a run hashing to `hash`. */
function containsHashed(text: string, hash: string, length: number): boolean {
  const flat = text.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (let i = 0; i + length <= flat.length; i++) {
    if (sha256(flat.slice(i, i + length)) === hash) return true;
  }
  return false;
}

describe('repository files', () => {
  it('detects a hashed name however it is written', () => {
    expect(containsHashed('a Sec-Ret plan', sha256('secret'), 6)).toBe(true);
    expect(containsHashed('nothing here', sha256('secret'), 6)).toBe(false);
  });

  it('never name the internal Mizuhada product', () => {
    for (const file of repoFiles) {
      const rel = relative(ROOT, file);
      expect(containsHashed(rel, BANNED_SHA256, BANNED_LENGTH), rel).toBe(false);
      if (TEXT.has(extname(file)) || extname(file) === '.mjs') {
        expect(containsHashed(readFileSync(file, 'utf8'), BANNED_SHA256, BANNED_LENGTH), rel).toBe(false);
      }
    }
  });

  it('never show a phone number', () => {
    const phone = /\+\s*\(?66/;
    for (const file of textFiles) {
      expect(phone.test(readFileSync(file, 'utf8')), relative(ROOT, file)).toBe(false);
    }
  });
});

describe('content', () => {
  const hrefs = [
    profile.github.href,
    profile.linkedin.href,
    ...featured.flatMap((f) => f.links.map((l) => l.href)),
    ...projectRows.map((r) => r.href),
    ...moreProjects.flatMap((m) => (m.href ? [m.href] : [])),
  ];

  it('links only to the owner’s public profiles and repositories, over https', () => {
    for (const href of hrefs) {
      expect(href, href).toMatch(/^https:\/\/(github\.com\/SupaOhm(\/[\w.-]+)?|linkedin\.com\/in\/supakornpra)$/);
    }
  });

  it('has a valid contact email', () => {
    expect(profile.email).toBe('ohm.supakornth@gmail.com');
  });

  it('points every screenshot at a real file or a named placeholder', () => {
    for (const pic of featured.flatMap((f) => f.pics)) {
      if (pic.src.includes('.placeholder.')) continue;
      expect(existsSync(join(ROOT, 'public', pic.src)), pic.src).toBe(true);
    }
  });

  it('lists the five featured items in CV order', () => {
    expect(featured.map((f) => f.id)).toEqual(['esnidsaas', 'ma-zerophish', 'mizuhada', 'baka', 'acklab']);
    expect(featured.map((f) => f.object)).toEqual(['reader', 'phone', 'laptop', 'frame', 'tablet']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- tests/content.test.ts`
Expected: FAIL with `Failed to resolve import "../src/content/featured"`.

- [ ] **Step 3: Create src/content/types.ts**

```ts
export type DeviceKind = 'reader' | 'phone' | 'laptop' | 'frame' | 'tablet';
export type Group = 'Research' | 'Experience' | 'Projects';

export interface Link {
  label: string;
  href: string;
}

/** A screenshot shown on the object. `focus` is the crop centre in image coordinates (0..1, top-left origin). */
export interface Pic {
  src: string;
  focus?: [number, number];
}

export interface FeaturedItem {
  id: string;
  group: Group;
  title: string;
  meta: string;
  body: string[];
  figures: string[];
  links: Link[];
  object: DeviceKind;
  pics: Pic[];
}

export interface ProjectRow {
  name: string;
  line: string;
  tech: string;
  href: string;
}

export interface MoreProject {
  name: string;
  line: string;
  href?: string;
}

export interface Profile {
  name: string;
  intro: string;
  email: string;
  github: Link;
  linkedin: Link;
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export interface About {
  honors: string[];
  education: { school: string; degree: string; detail: string; coursework: string[] };
  skills: SkillGroup[];
  activities: { name: string; detail: string }[];
  languages: string[];
}
```

- [ ] **Step 4: Create src/content/profile.ts**

```ts
import type { Profile } from './types';

export const profile: Profile = {
  name: 'Supakorn Prayongyam',
  intro:
    'Computer engineering student at SIIT, Thammasat. I build AI systems, security tooling, and the distributed infrastructure under both.',
  email: 'ohm.supakornth@gmail.com',
  github: { label: 'GitHub', href: 'https://github.com/SupaOhm' },
  linkedin: { label: 'LinkedIn', href: 'https://linkedin.com/in/supakornpra' },
};
```

- [ ] **Step 5: Create src/content/featured.ts**

```ts
import type { FeaturedItem } from './types';

// CV order: research first (it carries the award), then experience, then the lead project.
export const featured: FeaturedItem[] = [
  {
    id: 'esnidsaas',
    group: 'Research',
    title: 'ESNIDSaaS',
    meta: 'Best Paper Award, IEEE IMC 2026 (CISOSE 2026, Fukuoka)',
    body: [
      'Network intrusion detection as a cloud service. Kafka ingests each tenant’s traffic, Spark Structured Streaming prepares it, and a hybrid detector combines signature rules, behavioural rules and machine learning.',
    ],
    figures: ['0.9557 accuracy and 0.8479 F1 on CIC-IDS2017.'],
    links: [],
    object: 'reader',
    pics: [{ src: '/shots/esnidsaas.webp' }],
  },
  {
    id: 'ma-zerophish',
    group: 'Research',
    title: 'MA-ZeroPhish',
    meta: 'Ongoing research at SIIT',
    body: [
      'Zero-day phishing detection by a team of agents. Five specialists read the URL, the page structure, its visuals, the message body and the network behind it.',
      'A Moderator and a Judge weigh the evidence, settle conflicts and ask for another look when the evidence is not enough.',
    ],
    figures: [],
    links: [],
    object: 'phone',
    pics: [{ src: '/shots/ma-zerophish.placeholder.webp' }],
  },
  {
    id: 'mizuhada',
    group: 'Experience',
    title: 'Mizuhada Group',
    meta: 'AI Developer Intern, Jun–Jul 2026',
    body: [
      'Built an enterprise multi-agent RAG assistant for company knowledge and live warehouse inventory.',
      'I owned it end to end: React and FastAPI on top, Gemini embeddings and ChromaDB underneath, and a source and page citation on every answer.',
    ],
    figures: [
      'Document lookup time down 91.3%, from 54.54 s to 4.728 s.',
      '100% source matching in evaluation.',
      'Warehouse access limited to 12 read-only query tools.',
    ],
    links: [],
    object: 'laptop',
    pics: [{ src: '/shots/mizuhada.placeholder.webp' }],
  },
  {
    id: 'baka',
    group: 'Experience',
    title: 'Baka Co.',
    meta: 'UX/UI Research & Design Intern, Aug 2025 onward',
    body: [
      'Redesigned Baka Index, a farming analytics platform built on Google Earth Engine, from stakeholder research to high-fidelity mockups.',
      'The finished redesign came with an implementation direction for the geospatial workflows and the frontend.',
    ],
    figures: [],
    links: [],
    object: 'frame',
    pics: [{ src: '/shots/baka.webp' }],
  },
  {
    id: 'acklab',
    group: 'Projects',
    title: 'AckLab',
    meta: 'Next.js, TypeScript, Docker',
    body: [
      'An interactive networking learning platform. Subnetting, DNS, the OSI model, routing and TCP become step-through simulations with packet animation and timeline playback.',
    ],
    figures: [],
    links: [{ label: 'GitHub', href: 'https://github.com/SupaOhm/AckLab' }],
    object: 'tablet',
    pics: [{ src: '/shots/acklab.placeholder.webp' }],
  },
];
```

- [ ] **Step 6: Create src/content/projects.ts**

```ts
import type { MoreProject, ProjectRow } from './types';

export const projectRows: ProjectRow[] = [
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
];

export const moreProjects: MoreProject[] = [
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

- [ ] **Step 7: Create src/content/about.ts**

```ts
import type { About } from './types';

export const about: About = {
  honors: ['Best Paper Award, IEEE IMC 2026, Fukuoka, for ESNIDSaaS'],
  education: {
    school: 'SIIT, Thammasat University',
    degree: 'B.Eng. Computer Engineering, 4th year',
    detail: 'GPA 3.24, expected June 2027',
    coursework: [
      'Computer and Communication Security',
      'Software Engineering',
      'Object-Oriented Programming',
      'Data Structures and Algorithms',
      'Database Systems',
      'Cloud Computing',
      'Artificial Intelligence',
      'Cyber Crimes and Digital Forensics',
      'Operating Systems',
      'Networks',
      'System Analysis and Design',
    ],
  },
  skills: [
    { label: 'Programming languages', items: ['Python', 'TypeScript', 'JavaScript', 'Java', 'C', 'C++', 'C#', 'SQL', 'PHP', 'HTML/CSS'] },
    { label: 'Frameworks and libraries', items: ['FastAPI', 'React', 'Next.js', 'Vite', 'Node.js', 'Express.js', 'Tailwind CSS', 'Pandas'] },
    {
      label: 'Databases and AI',
      items: ['MySQL', 'PostgreSQL', 'MongoDB', 'ChromaDB', 'Gemini API', 'Retrieval-augmented generation', 'Multi-agent systems'],
    },
    {
      label: 'Data, DevOps and tools',
      items: ['Apache Kafka', 'Spark Structured Streaming', 'Docker', 'GitHub Actions', 'Git', 'Postman', 'Burp Suite', 'Figma'],
    },
    {
      label: 'Concepts',
      items: ['Machine learning', 'Distributed systems', 'Network security', 'Cloud computing', 'REST API design', 'Database design and normalization'],
    },
  ],
  activities: [
    { name: 'SIIT CPE First Meet Staff, 2025', detail: 'Guided incoming students through departmental orientation.' },
    { name: 'TU Freshy Games, 2023', detail: 'Ran participant parcel distribution and helped coordinate the event on site.' },
  ],
  languages: ['Thai, native', 'English, TU-GET CBT 90 (2024)'],
};
```

- [ ] **Step 8: Add the two real screenshots**

The ESNIDSaaS image has black side bars. Crop it to the paper page (x 237–512 of 800, measured) so that the portrait e-reader's cover-fit keeps the full title. The Baka image is used as-is. The sources live in the git-ignored prototype folder. The same files are also in `/Users/supa/projects/apps/Supa-portfolio/public/images/projects/`.

```bash
mkdir -p public/shots
cp .superpowers/brainstorm/img/baka.webp public/shots/baka.webp
node --input-type=module -e "import sharp from 'sharp'; const i = await sharp('.superpowers/brainstorm/img/IDSaaS.webp').extract({ left: 237, top: 0, width: 276, height: 373 }).webp({ quality: 90 }).toFile('public/shots/esnidsaas.webp'); console.log(i.width, i.height);"
```

Expected output: `276 373`.

- [ ] **Step 9: Run the test to verify it passes**

Run: `npm test -- tests/content.test.ts`
Expected: `7 passed`.

- [ ] **Step 10: Commit**

```bash
git add src/content tests public/shots
git commit -m "feat: add CV content data with privacy and link checks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Scene types, theme, capability and reduced-motion hooks

**Files:**
- Create: `src/scene/types.ts`, `src/app/theme.ts`, `src/app/capability.ts`, `src/scroll/usePrefersReducedMotion.ts`
- Test: `src/app/theme.test.ts`, `src/app/capability.test.ts`, `src/scroll/usePrefersReducedMotion.test.ts`

**Interfaces:**
- Consumes: `mockMatchMedia` (Task 1).
- Produces:
  - `src/scene/types.ts`. Types only, with no runtime imports, so the entry chunk can import it safely.
    - `Theme = 'light' | 'dark'`
    - `ObjectKind = 'pebble' | 'reader' | 'phone' | 'laptop' | 'frame' | 'tablet' | 'sphere'`
    - `ScenePic { src: string; focus?: [number, number] }`
    - `SceneItem { kind: ObjectKind; pics: ScenePic[]; label: string }`
    - `SceneOptions { lite: boolean; reducedMotion: boolean; snap: boolean; centered: boolean; onReady?: () => void }`
    - `SceneHandle { setProgress(p: number): void; setTheme(t: Theme): void; setActive(active: boolean): void; dispose(): void }`
  - `src/app/theme.ts`:
    - `initialTheme(search: string, stored: Theme | null, systemDark: boolean): Theme`
    - `readStoredTheme(): Theme | null`
    - `useTheme(): { theme: Theme; toggle: () => void }`. It writes `document.documentElement.dataset.theme`.
  - `src/app/capability.ts`:
    - `type SceneMode = 'full' | 'lite' | 'static'`
    - `pickSceneMode(o: { override: string | null; hasWebGL2: boolean; renderer: string; width: number }): SceneMode`
    - `detectSceneMode(): SceneMode`. It reads `?scene=full|lite|static` as an override.
  - `src/scroll/usePrefersReducedMotion.ts`: `usePrefersReducedMotion(): boolean`.

- [ ] **Step 1: Create src/scene/types.ts**

```ts
export type Theme = 'light' | 'dark';

export type ObjectKind = 'pebble' | 'reader' | 'phone' | 'laptop' | 'frame' | 'tablet' | 'sphere';

export interface ScenePic {
  src: string;
  /** Crop centre in image coordinates (0..1, top-left origin). */
  focus?: [number, number];
}

/** One object state: what the object becomes and the pictures shown on it. */
export interface SceneItem {
  kind: ObjectKind;
  pics: ScenePic[];
  label: string;
}

export interface SceneOptions {
  /** Lower geometry detail, no transmission, no light-bars. */
  lite: boolean;
  /** No melt, spin, sway or springs; objects fade out and in. */
  reducedMotion: boolean;
  /** Jump straight to the target progress (used for ?p= previews and captures). */
  snap: boolean;
  /** Keep the object in the middle of the canvas (used for fallback captures). */
  centered: boolean;
  /** Called once, after the first frame is drawn. */
  onReady?: () => void;
}

export interface SceneHandle {
  setProgress(p: number): void;
  setTheme(theme: Theme): void;
  /** Pause rendering while the canvas is faded out. */
  setActive(active: boolean): void;
  dispose(): void;
}
```

- [ ] **Step 2: Write the failing tests**

`src/app/theme.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockMatchMedia } from '../test/matchMedia';
import { initialTheme, readStoredTheme, useTheme } from './theme';

describe('initialTheme', () => {
  it('uses the system preference when nothing is stored', () => {
    expect(initialTheme('', null, true)).toBe('dark');
    expect(initialTheme('', null, false)).toBe('light');
  });

  it('prefers a stored choice over the system', () => {
    expect(initialTheme('', 'light', true)).toBe('light');
  });

  it('lets ?theme= override everything', () => {
    expect(initialTheme('?theme=dark', 'light', false)).toBe('dark');
  });

  it('ignores unknown ?theme= values', () => {
    expect(initialTheme('?theme=blue', null, false)).toBe('light');
  });
});

describe('useTheme', () => {
  afterEach(() => vi.restoreAllMocks());

  it('defaults to the system theme and writes it to the root element', () => {
    mockMatchMedia(['(prefers-color-scheme: dark)']);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('toggles and remembers the choice', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('still works when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredTheme()).toBeNull();
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggle());
    expect(result.current.theme).toBe('dark');
  });
});
```

`src/app/capability.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { pickSceneMode } from './capability';

const capable = { override: null, hasWebGL2: true, renderer: 'ANGLE (Apple, Apple M2, OpenGL 4.1)', width: 1440 };

describe('pickSceneMode', () => {
  it('runs the full scene on a wide, capable GPU', () => {
    expect(pickSceneMode(capable)).toBe('full');
  });

  it('falls back to static images without WebGL2', () => {
    expect(pickSceneMode({ ...capable, hasWebGL2: false })).toBe('static');
  });

  it('uses the lite scene under 800px', () => {
    expect(pickSceneMode({ ...capable, width: 799 })).toBe('lite');
    expect(pickSceneMode({ ...capable, width: 800 })).toBe('full');
  });

  it('uses the lite scene on software renderers', () => {
    expect(pickSceneMode({ ...capable, renderer: 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))' })).toBe('lite');
  });

  it('honours ?scene= overrides', () => {
    expect(pickSceneMode({ ...capable, override: 'static' })).toBe('static');
    expect(pickSceneMode({ ...capable, width: 390, override: 'full' })).toBe('full');
    expect(pickSceneMode({ ...capable, override: 'nonsense' })).toBe('full');
  });
});
```

`src/scroll/usePrefersReducedMotion.test.ts`:

```ts
import { renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { mockMatchMedia } from '../test/matchMedia';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

it('is false by default', () => {
  const { result } = renderHook(() => usePrefersReducedMotion());
  expect(result.current).toBe(false);
});

it('reports the reduced-motion preference', () => {
  mockMatchMedia(['(prefers-reduced-motion: reduce)']);
  const { result } = renderHook(() => usePrefersReducedMotion());
  expect(result.current).toBe(true);
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `npm test -- src/app src/scroll`
Expected: FAIL, because `./theme`, `./capability` and `./usePrefersReducedMotion` cannot be resolved.

- [ ] **Step 4: Create src/app/theme.ts**

```ts
import { useCallback, useEffect, useState } from 'react';
import type { Theme } from '../scene/types';

export type { Theme };

const KEY = 'theme';
const isTheme = (v: unknown): v is Theme => v === 'light' || v === 'dark';

export function readStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return isTheme(v) ? v : null;
  } catch {
    return null;
  }
}

function storeTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // storage blocked: the choice lasts for this visit only
  }
}

/** ?theme= wins, then a stored choice, then the system preference. */
export function initialTheme(search: string, stored: Theme | null, systemDark: boolean): Theme {
  const forced = new URLSearchParams(search).get('theme');
  if (isTheme(forced)) return forced;
  return stored ?? (systemDark ? 'dark' : 'light');
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() =>
    initialTheme(
      window.location.search,
      readStoredTheme(),
      window.matchMedia('(prefers-color-scheme: dark)').matches,
    ),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark';
      storeTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
```

- [ ] **Step 5: Create src/app/capability.ts**

```ts
export type SceneMode = 'full' | 'lite' | 'static';

const LOW_END = /swiftshader|llvmpipe|softpipe|software|mali-4|adreno \(tm\) [23]\d\d/i;

export function pickSceneMode(o: { override: string | null; hasWebGL2: boolean; renderer: string; width: number }): SceneMode {
  if (o.override === 'full' || o.override === 'lite' || o.override === 'static') return o.override;
  if (!o.hasWebGL2) return 'static';
  if (o.width < 800 || LOW_END.test(o.renderer)) return 'lite';
  return 'full';
}

/** Probes WebGL2 once with a throwaway canvas. three.js r170 needs WebGL2, so without it the page shows still images. */
export function detectSceneMode(): SceneMode {
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = document.createElement('canvas').getContext('webgl2');
  } catch {
    gl = null;
  }
  let renderer = '';
  if (gl) {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  return pickSceneMode({
    override: new URLSearchParams(window.location.search).get('scene'),
    hasWebGL2: Boolean(gl),
    renderer,
    width: window.innerWidth,
  });
}
```

- [ ] **Step 6: Create src/scroll/usePrefersReducedMotion.ts**

```ts
import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- src/app src/scroll`
Expected: all theme, capability and reduced-motion tests pass (14 tests), plus the App smoke test.

- [ ] **Step 8: Commit**

```bash
git add src/scene/types.ts src/app src/scroll
git commit -m "feat: add theme, scene capability and reduced-motion hooks" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Page sections, styles and App

**Files:**
- Create: `src/ui/side.ts`, `src/ui/ThemeToggle.tsx`, `src/ui/TopBar.tsx`, `src/ui/Hero.tsx`, `src/ui/FeatureSection.tsx`, `src/ui/ProjectRows.tsx`, `src/ui/MoreProjects.tsx`, `src/ui/AboutBlock.tsx`, `src/ui/Contact.tsx`
- Modify: `src/app/App.tsx` (replace), `src/styles.css` (append)
- Test: `src/app/App.test.tsx` (replace)

**Interfaces:**
- Consumes:
  - from `src/content/*` (Task 2): `profile`, `featured`, `projectRows`, `moreProjects`, `about`, and their types
  - `useTheme` (Task 3)
  - `Theme` from `src/scene/types` (Task 3)
- Produces:
  - DOM contract read by the scroll hook (Task 6):
    - The Hero, each FeatureSection and ProjectRows carry `data-anchor="0".."6"`.
    - They also carry `data-side="left|right"`, with even anchors on the left.
    - MoreProjects carries `data-scene-exit`: the scene fades out as the More projects list arrives, so no list text ever sits under the sphere.
  - Section ids: `top`, `research`, `experience`, `projects`, `about`, `contact`.
  - `sideFor(anchor: number): 'left' | 'right'` from `src/ui/side.ts`.
  - `App()` renders TopBar plus `<main>` with every section in CV order. Task 12 adds the scene layer.

- [ ] **Step 1: Write the failing App test (replaces the smoke test)**

`src/app/App.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('lays sections out in CV order', () => {
    render(<App />);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'Research',
      'Experience',
      'Projects',
      'About',
      'Say hello.',
    ]);
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .slice(0, 5)
        .map((h) => h.textContent),
    ).toEqual(['ESNIDSaaS', 'MA-ZeroPhish', 'Mizuhada Group', 'Baka Co.', 'AckLab']);
  });

  it('marks one scroll anchor per object state, alternating sides', () => {
    const { container } = render(<App />);
    const anchors = [...container.querySelectorAll<HTMLElement>('[data-anchor]')];
    expect(anchors.map((el) => el.dataset.anchor)).toEqual(['0', '1', '2', '3', '4', '5', '6']);
    expect(anchors.map((el) => el.dataset.side)).toEqual(['left', 'right', 'left', 'right', 'left', 'right', 'left']);
    expect(container.querySelector('[data-scene-exit]')).toHaveAttribute('aria-labelledby', 'more-title');
  });

  it('switches theme from the top bar', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toHaveTextContent('Light');
  });

  it('links every top-bar entry to a section on the page', () => {
    const { container } = render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Sections' });
    for (const link of within(nav).getAllByRole('link')) {
      const id = link.getAttribute('href')!.slice(1);
      expect(container.querySelector(`#${id}`), id).not.toBeNull();
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/app/App.test.tsx`
Expected: FAIL with `Unable to find role="heading"` (the shell renders an empty `<main>`).

- [ ] **Step 3: Create src/ui/side.ts and src/ui/ThemeToggle.tsx**

`src/ui/side.ts`:

```ts
/** Text side for an anchor: even states keep text left (object right), odd states the reverse. */
export const sideFor = (anchor: number): 'left' | 'right' => (anchor % 2 === 0 ? 'left' : 'right');
```

`src/ui/ThemeToggle.tsx`:

```tsx
import type { Theme } from '../scene/types';

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button type="button" className="theme-toggle" onClick={onToggle} aria-label={`Switch to ${next} theme`}>
      {next === 'dark' ? 'Dark' : 'Light'}
    </button>
  );
}
```

- [ ] **Step 4: Create src/ui/TopBar.tsx and src/ui/Hero.tsx**

`src/ui/TopBar.tsx`:

```tsx
import type { Theme } from '../scene/types';
import { ThemeToggle } from './ThemeToggle';

const SECTIONS = [
  ['research', 'Research'],
  ['experience', 'Experience'],
  ['projects', 'Projects'],
  ['about', 'About'],
  ['contact', 'Contact'],
] as const;

export function TopBar({ name, theme, onToggleTheme }: { name: string; theme: Theme; onToggleTheme: () => void }) {
  return (
    <header className="topbar">
      <a className="topbar-name" href="#top">
        {name}
      </a>
      <nav aria-label="Sections">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  );
}
```

`src/ui/Hero.tsx`:

```tsx
import type { Profile } from '../content/types';
import { sideFor } from './side';

export function Hero({ profile }: { profile: Profile }) {
  const [first, ...rest] = profile.name.split(' ');
  return (
    <section className="panel hero" id="top" data-anchor={0} data-side={sideFor(0)}>
      <div className="copy">
        <h1>
          {first}
          <br />
          {rest.join(' ')}
        </h1>
        <p className="hero-line">{profile.intro}</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create src/ui/FeatureSection.tsx**

```tsx
import type { FeaturedItem } from '../content/types';
import { sideFor } from './side';

export function FeatureSection({ item, anchor, groupStart }: { item: FeaturedItem; anchor: number; groupStart: boolean }) {
  return (
    <section
      className="panel"
      id={groupStart ? item.group.toLowerCase() : undefined}
      data-anchor={anchor}
      data-side={sideFor(anchor)}
      aria-labelledby={`${item.id}-title`}
    >
      <div className="copy">
        {groupStart && <h2 className="group">{item.group}</h2>}
        <h3 className="title" id={`${item.id}-title`}>
          {item.title}
        </h3>
        <p className="meta">{item.meta}</p>
        {item.body.map((text) => (
          <p key={text}>{text}</p>
        ))}
        {item.figures.length > 0 && (
          <ul className="figures">
            {item.figures.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        {item.links.length > 0 && (
          <p className="links">
            {item.links.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            ))}
          </p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Create src/ui/ProjectRows.tsx and src/ui/MoreProjects.tsx**

`src/ui/ProjectRows.tsx`:

```tsx
import type { ProjectRow } from '../content/types';
import { sideFor } from './side';

export function ProjectRows({ rows, anchor }: { rows: ProjectRow[]; anchor: number }) {
  return (
    <section className="panel" data-anchor={anchor} data-side={sideFor(anchor)} aria-label="Project list">
      <ul className="rows copy">
        {rows.map((r) => (
          <li key={r.name}>
            <h3 className="row-name">{r.name}</h3>
            <p>{r.line}</p>
            <p className="tech">{r.tech}</p>
            <a href={r.href} target="_blank" rel="noreferrer" aria-label={`${r.name} on GitHub`}>
              GitHub
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

`src/ui/MoreProjects.tsx`:

```tsx
import type { MoreProject } from '../content/types';

export function MoreProjects({ items }: { items: MoreProject[] }) {
  return (
    <section className="more" data-scene-exit aria-labelledby="more-title">
      <h3 className="subtitle" id="more-title">
        More projects
      </h3>
      <ul className="more-list">
        {items.map((m) => (
          <li key={m.name}>
            {m.href ? (
              <a href={m.href} target="_blank" rel="noreferrer">
                {m.name}
              </a>
            ) : (
              <span className="more-name">{m.name}</span>
            )}
            <p>{m.line}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 7: Create src/ui/AboutBlock.tsx and src/ui/Contact.tsx**

`src/ui/AboutBlock.tsx`:

```tsx
import type { About } from '../content/types';

export function AboutBlock({ about }: { about: About }) {
  return (
    <section className="about" id="about" aria-labelledby="about-title">
      <h2 className="title" id="about-title">
        About
      </h2>
      <div className="about-grid">
        <div>
          <h3>Honors</h3>
          <ul>
            {about.honors.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Education</h3>
          <p className="about-strong">{about.education.school}</p>
          <p>{about.education.degree}</p>
          <p>{about.education.detail}</p>
          <p className="about-small">Coursework: {about.education.coursework.join(', ')}.</p>
        </div>
        <div>
          <h3>Skills</h3>
          {about.skills.map((g) => (
            <p key={g.label}>
              <span className="about-strong">{g.label}</span>
              <br />
              {g.items.join(', ')}
            </p>
          ))}
        </div>
        <div>
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
        </div>
        <div>
          <h3>Languages</h3>
          <ul>
            {about.languages.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
```

`src/ui/Contact.tsx`:

```tsx
import type { Profile } from '../content/types';

export function Contact({ profile }: { profile: Profile }) {
  return (
    <section className="contact" id="contact" aria-labelledby="contact-title">
      <h2 className="title" id="contact-title">
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

- [ ] **Step 8: Replace src/app/App.tsx**

```tsx
import { about } from '../content/about';
import { featured } from '../content/featured';
import { profile } from '../content/profile';
import { moreProjects, projectRows } from '../content/projects';
import { AboutBlock } from '../ui/AboutBlock';
import { Contact } from '../ui/Contact';
import { FeatureSection } from '../ui/FeatureSection';
import { Hero } from '../ui/Hero';
import { MoreProjects } from '../ui/MoreProjects';
import { ProjectRows } from '../ui/ProjectRows';
import { TopBar } from '../ui/TopBar';
import { useTheme } from './theme';

export function App() {
  const { theme, toggle } = useTheme();
  return (
    <>
      <TopBar name={profile.name} theme={theme} onToggleTheme={toggle} />
      <main>
        <Hero profile={profile} />
        {featured.map((item, i) => (
          <FeatureSection
            key={item.id}
            item={item}
            anchor={i + 1}
            groupStart={i === 0 || featured[i - 1].group !== item.group}
          />
        ))}
        <ProjectRows rows={projectRows} anchor={featured.length + 1} />
        <MoreProjects items={moreProjects} />
        <AboutBlock about={about} />
        <Contact profile={profile} />
      </main>
    </>
  );
}
```

- [ ] **Step 9: Append component styles to src/styles.css**

```css
/* top bar */
.topbar {
  position: fixed;
  inset: 0 0 auto;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 14px 8vw;
  background: var(--bar);
  -webkit-backdrop-filter: saturate(1.6) blur(20px);
  backdrop-filter: saturate(1.6) blur(20px);
}
.topbar-name {
  margin-right: auto;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-decoration: none;
}
.topbar nav {
  display: flex;
  gap: 24px;
}
.topbar nav a {
  color: var(--dim);
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
}
.topbar nav a:hover {
  color: var(--ink);
}
.theme-toggle {
  font: 600 14px/1 'Inter Tight', system-ui, sans-serif;
  color: var(--ink);
  background: var(--btn);
  border: 0;
  border-radius: 999px;
  padding: 10px 18px;
  cursor: pointer;
}

/* text sections scroll normally; they alternate sides and the object sits opposite */
main {
  position: relative;
  z-index: 1;
}
.panel {
  min-height: 130vh;
  display: flex;
  align-items: center;
  padding: 0 8vw;
}
.panel[data-side='right'] {
  justify-content: flex-end;
}
/* 42vw keeps text clear of the object, which spans 54–96% of the width on wide screens */
.copy {
  max-width: min(480px, 42vw);
}
h1,
h2,
h3 {
  margin: 0;
  font-weight: 800;
  letter-spacing: -0.035em;
}
h1 {
  font-size: clamp(64px, 10vw, 164px);
  line-height: 0.86;
}
.title {
  font-size: clamp(48px, 6vw, 96px);
  line-height: 0.92;
  margin-bottom: 24px;
}
.group {
  font-size: clamp(22px, 2.2vw, 28px);
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--dim);
  margin-bottom: 18px;
}
p {
  margin: 0 0 12px;
  color: var(--dim);
}
.hero-line {
  margin-top: 28px;
}
.meta {
  color: var(--ink);
  font-weight: 600;
  margin-bottom: 18px;
}
.figures {
  list-style: none;
  margin: 20px 0 0;
  padding: 0;
  color: var(--ink);
}
.figures li + li {
  margin-top: 6px;
}
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 20px;
}

/* project rows */
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  max-width: min(560px, 42vw);
}
.rows li {
  padding: 26px 0;
  border-top: 1px solid var(--line);
}
.rows li:last-child {
  border-bottom: 1px solid var(--line);
}
.row-name {
  font-size: 30px;
  line-height: 1.1;
  letter-spacing: -0.025em;
  margin-bottom: 8px;
}
.tech {
  font-size: 15px;
}

/* more projects */
.more {
  position: relative;
  padding: 14vh 8vw;
}
.subtitle {
  font-size: clamp(32px, 3.5vw, 48px);
  line-height: 1;
  margin-bottom: 36px;
}
.more-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 28px 48px;
  max-width: 1100px;
}
.more-list a,
.more-name {
  font-weight: 600;
  color: var(--ink);
}
.more-list p {
  font-size: 16px;
  margin-top: 4px;
}

/* about */
.about {
  padding: 16vh 8vw;
}
.about-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 48px 64px;
  max-width: 1200px;
}
.about h3 {
  font-size: 22px;
  letter-spacing: -0.02em;
  margin-bottom: 14px;
}
.about ul {
  list-style: none;
  margin: 0;
  padding: 0;
  color: var(--dim);
}
.about li + li {
  margin-top: 10px;
}
.about-strong {
  color: var(--ink);
  font-weight: 600;
}
.about-small {
  font-size: 16px;
}

/* contact */
.contact {
  min-height: 80vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 8vw 12vh;
}
.contact-email {
  font-size: clamp(24px, 3vw, 36px);
  font-weight: 600;
  letter-spacing: -0.02em;
}

/* narrow: the top 55vh of each object section stays empty for the object */
@media (max-width: 799px) {
  .topbar {
    padding: 12px 24px;
  }
  .topbar nav {
    display: none;
  }
  .panel,
  .panel[data-side='right'] {
    min-height: 100vh;
    align-items: flex-start;
    justify-content: flex-start;
    padding: 55vh 24px 16vh;
  }
  .copy,
  .rows {
    max-width: 560px;
  }
  /* measured in Inter Tight 800: "Prayongyam" is 5.56 em wide, "MA-ZeroPhish" 6.5 em; keep both inside the gutters */
  h1 {
    font-size: min(64px, calc((100vw - 48px) / 5.8));
  }
  .title {
    font-size: min(48px, calc((100vw - 48px) / 6.8));
  }
  .more,
  .about {
    padding-left: 24px;
    padding-right: 24px;
  }
  .contact {
    padding: 0 24px 12vh;
  }
}
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `npm test`
Expected: all tests pass, including the 4 App tests and the content checks.

- [ ] **Step 11: Look at it**

Run: `npm run dev`, then open the printed URL. Without the scene the page is plain text on `#F5F5F7`.
- The name is huge.
- Sections alternate left and right.
- The toggle flips to black.

Stop the server.

- [ ] **Step 12: Commit**

```bash
git add src
git commit -m "feat: add page sections in CV order with light and dark themes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Scene maths: easing and step weights

**Files:**
- Create: `src/scene/math.ts`, `src/scene/step.ts`
- Test: `src/scene/math.test.ts`, `src/scene/step.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `math.ts`:
    - `clamp01(x: number): number`
    - `lerp(a: number, b: number, t: number): number`
    - `ease(t: number): number` (cubic in-out)
    - `smoothstep(x: number, e0: number, e1: number): number`. The value comes first, like `THREE.MathUtils.smoothstep`.
  - `step.ts`: `stepState(p: number, n: number, reducedMotion: boolean): StepState`, where `StepState { k; g; wA; wBlob; wB; fade; dir: 1 | -1 }`.
    - `k`: index of the step's first object (0..n-2)
    - `g`: melt phase 0..1
    - `wA`, `wBlob`, `wB`: morph weights that sum to 1
    - `fade`: overall opacity, below 1 only under reduced motion
    - `dir`: +1 when the object sits right, −1 when it sits left

- [ ] **Step 1: Write the failing tests**

`src/scene/math.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { clamp01, ease, lerp, smoothstep } from './math';

describe('math', () => {
  it('clamps to [0, 1]', () => {
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(3)).toBe(1);
  });

  it('lerps', () => {
    expect(lerp(2, 4, 0.25)).toBe(2.5);
  });

  it('eases from 0 to 1 through the midpoint', () => {
    expect(ease(0)).toBe(0);
    expect(ease(0.5)).toBe(0.5);
    expect(ease(1)).toBe(1);
  });

  it('smoothsteps with the value first', () => {
    expect(smoothstep(0.5, 0.6, 1)).toBe(0);
    expect(smoothstep(0.8, 0.6, 1)).toBeCloseTo(0.5);
    expect(smoothstep(1.2, 0.6, 1)).toBe(1);
  });
});
```

`src/scene/step.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { stepState } from './step';

const N = 7;

describe('stepState', () => {
  it('holds object k for the first 20% of a step', () => {
    expect(stepState(1.15, N, false)).toMatchObject({ k: 1, wA: 1, wBlob: 0, wB: 0 });
  });

  it('is fully liquid in the middle of a step', () => {
    const s = stepState(1.5, N, false);
    expect(s.wBlob).toBeCloseTo(1);
    expect(s.wA).toBeCloseTo(0);
    expect(s.wB).toBeCloseTo(0);
  });

  it('holds object k+1 for the last 20%', () => {
    expect(stepState(1.85, N, false)).toMatchObject({ k: 1, wA: 0, wBlob: 0, wB: 1 });
  });

  it('keeps the weights summing to one', () => {
    for (let p = 0; p <= N - 1; p += 0.01) {
      const s = stepState(p, N, false);
      expect(s.wA + s.wBlob + s.wB).toBeCloseTo(1, 6);
    }
  });

  it('ends on the last object and clamps out-of-range progress', () => {
    expect(stepState(6, N, false)).toMatchObject({ k: 5, wB: 1 });
    expect(stepState(-1, N, false)).toMatchObject({ k: 0, wA: 1 });
    expect(stepState(99, N, false)).toMatchObject({ k: 5, wB: 1 });
  });

  it('puts the object on alternating sides, switching mid-melt', () => {
    expect(stepState(0, N, false).dir).toBe(1);
    expect(stepState(1, N, false).dir).toBe(-1);
    expect(stepState(2.3, N, false).dir).toBe(1);
    expect(stepState(2.7, N, false).dir).toBe(-1);
  });

  it('under reduced motion, swaps objects behind a fade with no liquid', () => {
    expect(stepState(1.1, N, true)).toMatchObject({ wA: 1, wBlob: 0, wB: 0, fade: 1 });
    const early = stepState(1.3, N, true);
    expect(early.wA).toBe(1);
    expect(early.fade).toBeGreaterThan(0);
    expect(early.fade).toBeLessThan(1);
    const mid = stepState(1.5, N, true);
    expect(mid.fade).toBeCloseTo(0);
    expect(mid.wB).toBe(1);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/scene`
Expected: FAIL, because `./math` and `./step` cannot be resolved.

- [ ] **Step 3: Create src/scene/math.ts**

```ts
export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Cubic ease-in-out. */
export const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Hermite smoothstep of x between e0 and e1 (value first, like THREE.MathUtils.smoothstep). */
export const smoothstep = (x: number, e0: number, e1: number): number => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
```

- [ ] **Step 4: Create src/scene/step.ts**

```ts
import { clamp01, ease, smoothstep } from './math';

export interface StepState {
  /** First object of the current step (0..n-2). */
  k: number;
  /** Melt phase within the step, 0..1. */
  g: number;
  wA: number;
  wBlob: number;
  wB: number;
  /** Overall opacity; below 1 only while reduced motion swaps objects. */
  fade: number;
  /** +1: object on the right of the page, -1: on the left. */
  dir: 1 | -1;
}

/**
 * Within each step from object k to k+1: the first 20% holds k, the middle 60% melts
 * (k → liquid blob → k+1), the last 20% holds k+1.
 */
export function stepState(p: number, n: number, reducedMotion: boolean): StepState {
  const q = Math.min(Math.max(p, 0), n - 1);
  const k = Math.min(Math.floor(q), n - 2);
  const g = clamp01((q - k - 0.2) / 0.6);
  const near = g < 0.5 ? k : k + 1;
  const dir = near % 2 === 0 ? 1 : -1;

  if (reducedMotion) {
    const after = g >= 0.5;
    return { k, g, wA: after ? 0 : 1, wBlob: 0, wB: after ? 1 : 0, fade: smoothstep(Math.abs(2 * g - 1), 0, 1), dir };
  }
  if (g < 0.5) {
    const e = ease(g / 0.5);
    return { k, g, wA: 1 - e, wBlob: e, wB: 0, fade: 1, dir };
  }
  const e = ease((g - 0.5) / 0.5);
  return { k, g, wA: 0, wBlob: 1 - e, wB: e, fade: 1, dir };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- src/scene`
Expected: 11 passed.

- [ ] **Step 6: Commit**

```bash
git add src/scene/math.ts src/scene/math.test.ts src/scene/step.ts src/scene/step.test.ts
git commit -m "feat: add step weights for hold, melt and reduced-motion fade" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Scroll progress from DOM anchors

**Files:**
- Create: `src/scroll/progress.ts`, `src/scroll/useScrollProgress.ts`
- Test: `src/scroll/progress.test.ts`

**Interfaces:**
- Consumes:
  - `clamp01` from `src/scene/math` (Task 5). It has no three.js import, so it is safe in the entry chunk.
  - The `data-anchor` and `data-scene-exit` DOM contract (Task 4).
- Produces:
  - `progress.ts`:
    - `anchorPoint(top: number, height: number, vh: number, narrow: boolean): number`
    - `progressFromAnchors(y: number, anchors: number[]): number`
    - `scrollYForProgress(p: number, anchors: number[], vh: number): number`
    - `exitFade(y: number, exitTop: number, vh: number): number`
  - `useScrollProgress.ts`:
    - `interface ScrollSample { p: number; exit: number }`
    - `useScrollProgress(onSample: (s: ScrollSample) => void, initialP?: number | null): void`. It calls `onSample` on scroll, resize, font load and layout change. With `initialP` it scrolls the page to that progress once, and again after fonts and images load.

- [ ] **Step 1: Write the failing test**

`src/scroll/progress.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { anchorPoint, exitFade, progressFromAnchors, scrollYForProgress } from './progress';

describe('progressFromAnchors', () => {
  const c = [100, 300, 700];

  it('clamps before the first anchor', () => {
    expect(progressFromAnchors(50, c)).toBe(0);
  });

  it('is exactly k at anchor k', () => {
    expect(progressFromAnchors(300, c)).toBe(1);
  });

  it('interpolates between uneven anchors', () => {
    expect(progressFromAnchors(200, c)).toBeCloseTo(0.5);
    expect(progressFromAnchors(400, c)).toBeCloseTo(1.25);
  });

  it('clamps after the last anchor', () => {
    expect(progressFromAnchors(900, c)).toBe(2);
  });

  it('copes with duplicate anchors', () => {
    expect(Number.isFinite(progressFromAnchors(300, [100, 300, 300, 500]))).toBe(true);
  });
});

describe('scrollYForProgress', () => {
  const c = [1000, 2000, 4000];

  it('inverts progressFromAnchors', () => {
    for (const p of [0, 0.3, 1, 1.7, 2]) {
      const y = scrollYForProgress(p, c, 800) + 400;
      expect(progressFromAnchors(y, c)).toBeCloseTo(p);
    }
  });

  it('never scrolls above the top of the page', () => {
    expect(scrollYForProgress(0, [100, 300], 800)).toBe(0);
  });
});

describe('anchorPoint', () => {
  it('uses the element centre on wide layouts', () => {
    expect(anchorPoint(1000, 1200, 900, false)).toBe(1600);
  });

  it('uses top + half a viewport on narrow layouts, so the top 55vh is clear when reached', () => {
    expect(anchorPoint(1000, 1200, 800, true)).toBe(1400);
  });
});

describe('exitFade', () => {
  it('fades over half a viewport around the exit element’s top', () => {
    expect(exitFade(5000 - 200, 5000, 800)).toBe(0);
    expect(exitFade(5000, 5000, 800)).toBeCloseTo(0.5);
    expect(exitFade(5000 + 200, 5000, 800)).toBe(1);
  });

  it('stays 0 when there is no exit element', () => {
    expect(exitFade(5000, Infinity, 800)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/scroll/progress.test.ts`
Expected: FAIL, because `./progress` cannot be resolved.

- [ ] **Step 3: Create src/scroll/progress.ts**

```ts
import { clamp01 } from '../scene/math';

/**
 * Page-space y that marks an anchor. Wide layouts use the element's centre. Narrow layouts
 * reserve the top 55vh of each section for the object, so the anchor is reached when the
 * section's top meets the top of the viewport.
 */
export function anchorPoint(top: number, height: number, vh: number, narrow: boolean): number {
  return narrow ? top + vh / 2 : top + height / 2;
}

/** p = k + (y - c_k) / (c_{k+1} - c_k) for c_k ≤ y < c_{k+1}, clamped to [0, n-1]. */
export function progressFromAnchors(y: number, anchors: number[]): number {
  const n = anchors.length;
  if (n < 2 || y <= anchors[0]) return 0;
  if (y >= anchors[n - 1]) return n - 1;
  let k = 0;
  while (k < n - 2 && y >= anchors[k + 1]) k++;
  const span = anchors[k + 1] - anchors[k];
  return k + (span > 0 ? (y - anchors[k]) / span : 1);
}

/** The scrollY at which progressFromAnchors returns p (used by ?p= previews). */
export function scrollYForProgress(p: number, anchors: number[], vh: number): number {
  const n = anchors.length;
  if (n === 0) return 0;
  if (n === 1) return Math.max(0, anchors[0] - vh / 2);
  const q = Math.min(Math.max(p, 0), n - 1);
  const k = Math.min(Math.floor(q), n - 2);
  const y = anchors[k] + (q - k) * (anchors[k + 1] - anchors[k]);
  return Math.max(0, y - vh / 2);
}

/** 0 while the exit element's top is in the lower quarter or further down, 1 once it is in the upper quarter. */
export function exitFade(y: number, exitTop: number, vh: number): number {
  return clamp01((y - (exitTop - vh * 0.25)) / (vh * 0.5));
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- src/scroll/progress.test.ts`
Expected: 11 passed.

- [ ] **Step 5: Create src/scroll/useScrollProgress.ts**

```ts
import { useEffect, useRef } from 'react';
import { anchorPoint, exitFade, progressFromAnchors, scrollYForProgress } from './progress';

export interface ScrollSample {
  /** Object-state progress, 0..n-1. */
  p: number;
  /** 0..1 as the More projects list arrives; the scene fades out by this much. */
  exit: number;
}

/**
 * Measures the [data-anchor] elements and reports progress on every scroll, resize and layout
 * change (fonts and images loading). With initialP, scrolls the page to that progress.
 */
export function useScrollProgress(onSample: (s: ScrollSample) => void, initialP: number | null = null): void {
  const callback = useRef(onSample);
  useEffect(() => {
    callback.current = onSample;
  }, [onSample]);

  useEffect(() => {
    let alive = true;
    let anchors: number[] = [];
    let exitTop = Infinity;
    let frame = 0;

    const measure = () => {
      const vh = window.innerHeight;
      const narrow = window.innerWidth < 800;
      anchors = [...document.querySelectorAll<HTMLElement>('[data-anchor]')]
        .sort((a, b) => Number(a.dataset.anchor) - Number(b.dataset.anchor))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return anchorPoint(r.top + window.scrollY, r.height, vh, narrow);
        });
      const exitEl = document.querySelector<HTMLElement>('[data-scene-exit]');
      exitTop = exitEl ? exitEl.getBoundingClientRect().top + window.scrollY : Infinity;
    };

    const sample = () => {
      frame = 0;
      const y = window.scrollY + window.innerHeight / 2;
      callback.current({ p: progressFromAnchors(y, anchors), exit: exitFade(y, exitTop, window.innerHeight) });
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(sample);
    };

    const jumpToInitial = () => {
      if (initialP === null) return;
      window.scrollTo({ top: scrollYForProgress(initialP, anchors, window.innerHeight), behavior: 'instant' });
    };

    const remeasure = () => {
      if (!alive) return;
      measure();
      schedule();
    };

    const settle = () => {
      if (!alive) return;
      measure();
      jumpToInitial();
      schedule();
    };

    measure();
    jumpToInitial();
    sample();

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', remeasure);
    window.addEventListener('load', settle);
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(settle);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(remeasure);
    observer?.observe(document.body);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('load', settle);
      observer?.disconnect();
    };
  }, [initialP]);
}
```

- [ ] **Step 6: Typecheck and run the whole suite**

Run: `npm run typecheck && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/scroll
git commit -m "feat: measure scroll progress from section anchors" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Layout, springs and cover-fit

**Files:**
- Create: `src/scene/layout.ts`, `src/scene/springs.ts`, `src/scene/coverFit.ts`
- Test: `src/scene/layout.test.ts`, `src/scene/springs.test.ts`, `src/scene/coverFit.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `layout.ts`:
    - constants `CAMERA_Z = 9` and `FOV = 35`
    - `viewSize(aspect: number, z?: number): { w: number; h: number }`, the world size visible at z = 0
    - `placement(aspect: number, mode: 'wide' | 'narrow' | 'centered'): { side: number; y: number; fit: number }`
  - `springs.ts`:
    - `interface Spring { x: number; v: number; step(target: number, dt: number): number; set(x: number): void }`
    - `createSpring(x0: number, stiffness: number, damping: number): Spring`
    - constants `POSITION_SPRING` and `SWELL_SPRING`, each `{ stiffness, damping }` per second
  - `coverFit.ts`:
    - `interface UvWindow { scale: [number, number]; offset: [number, number] }`
    - `coverFit(planeAsp: number, imgAsp: number, focus?: [number, number]): UvWindow`. Sample the texture at `uv * scale + offset`.

- [ ] **Step 1: Write the failing tests**

`src/scene/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { placement, viewSize } from './layout';

describe('layout', () => {
  it('computes the visible world size at the object plane', () => {
    const { w, h } = viewSize(1.6);
    expect(h).toBeCloseTo(5.675, 2);
    expect(w).toBeCloseTo(9.08, 2);
  });

  it('wide: object a quarter-width off centre, full size', () => {
    const p = placement(1440 / 900, 'wide');
    expect(p.side).toBeCloseTo(2.27, 2);
    expect(p.fit).toBe(1);
  });

  it('narrow: object centred in the top 55% of the screen and scaled to fit', () => {
    const p = placement(390 / 844, 'narrow');
    expect(p.side).toBe(0);
    expect(p.y).toBeCloseTo(1.277, 2);
    expect(p.fit).toBeCloseTo(0.6095, 3);
  });

  it('centered: in the middle at full size on a square canvas', () => {
    expect(placement(1, 'centered')).toEqual({ side: 0, y: 0, fit: 1 });
  });

  it('wide: shrinks the object when the window is tall and narrow', () => {
    // 800×1000: 4.54 world units across, so 42% of that fits only about half the object
    expect(placement(800 / 1000, 'wide').fit).toBeCloseTo(0.515, 2);
  });
});
```

`src/scene/springs.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { POSITION_SPRING, SWELL_SPRING, createSpring } from './springs';

const run = (stiffness: number, damping: number, seconds: number, dt: number) => {
  const s = createSpring(0, stiffness, damping);
  let peak = 0;
  for (let t = 0; t < seconds; t += dt) peak = Math.max(peak, s.step(1, dt));
  return { x: s.x, peak };
};

describe('createSpring', () => {
  it('settles on the target', () => {
    expect(run(POSITION_SPRING.stiffness, POSITION_SPRING.damping, 3, 1 / 60).x).toBeCloseTo(1, 3);
  });

  it('overshoots before settling (the liquid bounce)', () => {
    expect(run(SWELL_SPRING.stiffness, SWELL_SPRING.damping, 1, 1 / 60).peak).toBeGreaterThan(1.05);
  });

  it('behaves the same at 30 and 144 frames per second', () => {
    const slow = run(POSITION_SPRING.stiffness, POSITION_SPRING.damping, 0.5, 1 / 30).x;
    const fast = run(POSITION_SPRING.stiffness, POSITION_SPRING.damping, 0.5, 1 / 144).x;
    expect(Math.abs(slow - fast)).toBeLessThan(0.03);
  });

  it('survives a long pause without exploding', () => {
    const s = createSpring(0, POSITION_SPRING.stiffness, POSITION_SPRING.damping);
    s.step(1, 5);
    expect(Number.isFinite(s.x)).toBe(true);
    expect(Math.abs(s.x)).toBeLessThan(2);
  });

  it('set() jumps and stops', () => {
    const s = createSpring(0, 100, 10);
    s.step(1, 0.05);
    s.set(3);
    expect(s.x).toBe(3);
    expect(s.v).toBe(0);
  });
});
```

`src/scene/coverFit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { coverFit } from './coverFit';

describe('coverFit', () => {
  it('uses the whole image when aspects match', () => {
    expect(coverFit(1.5, 1.5)).toEqual({ scale: [1, 1], offset: [0, 0] });
  });

  it('crops the sides of a wide image, centred by default', () => {
    const w = coverFit(1, 2);
    expect(w.scale).toEqual([0.5, 1]);
    expect(w.offset[0]).toBeCloseTo(0.25);
  });

  it('moves the crop toward the focus, but never past the image edge', () => {
    expect(coverFit(1, 2, [0, 0.5]).offset[0]).toBe(0);
    expect(coverFit(1, 2, [1, 0.5]).offset[0]).toBeCloseTo(0.5);
  });

  it('crops top and bottom of a tall image; focus y counts from the top', () => {
    const top = coverFit(1, 0.5, [0.5, 0]);
    expect(top.scale).toEqual([1, 0.5]);
    expect(top.offset[1]).toBeCloseTo(0.5); // uv y points up, so the top half starts at 0.5
    expect(coverFit(1, 0.5, [0.5, 1]).offset[1]).toBe(0);
  });

  it('always samples inside the image', () => {
    for (const img of [0.3, 0.8, 1, 2.2, 4]) {
      for (const fx of [0, 0.3, 1]) {
        const { scale, offset } = coverFit(0.7, img, [fx, fx]);
        expect(offset[0]).toBeGreaterThanOrEqual(0);
        expect(offset[1]).toBeGreaterThanOrEqual(0);
        expect(offset[0] + scale[0]).toBeLessThanOrEqual(1 + 1e-9);
        expect(offset[1] + scale[1]).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/scene/layout.test.ts src/scene/springs.test.ts src/scene/coverFit.test.ts`
Expected: FAIL, because the modules cannot be resolved.

- [ ] **Step 3: Create src/scene/layout.ts**

```ts
export const CAMERA_Z = 9;
export const FOV = 35;

// bounds of the largest formed object (tablet across, laptop up), with room for the swell
const OBJECT_W = 3.7;
const OBJECT_H = 3.3;

/** World-space width and height visible at z = 0 from a camera at distance z. */
export function viewSize(aspect: number, z = CAMERA_Z): { w: number; h: number } {
  const h = 2 * z * Math.tan((FOV * Math.PI) / 360);
  return { w: h * aspect, h };
}

export interface Placement {
  /** Horizontal offset; the object sits at dir * side. */
  side: number;
  y: number;
  /** Uniform scale so the object fits short or narrow viewports. */
  fit: number;
}

export function placement(aspect: number, mode: 'wide' | 'narrow' | 'centered'): Placement {
  const { w, h } = viewSize(aspect);
  if (mode === 'wide') {
    return { side: w * 0.25, y: 0.05, fit: Math.min(1, (w * 0.42) / OBJECT_W, (h * 0.8) / OBJECT_H) };
  }
  if (mode === 'narrow') {
    // centre of the top 55% of the screen: 22.5% of the height above the middle
    return { side: 0, y: h * 0.225, fit: Math.min(1, (w * 0.86) / OBJECT_W, (h * 0.5) / OBJECT_H) };
  }
  return { side: 0, y: 0, fit: Math.min(1, (w * 0.8) / OBJECT_W, (h * 0.8) / OBJECT_H) };
}
```

- [ ] **Step 4: Create src/scene/springs.ts**

```ts
/** A damped spring integrated in real time; stiffness and damping are per second, so frame rate does not matter. */
export interface Spring {
  x: number;
  v: number;
  step(target: number, dt: number): number;
  set(x: number): void;
}

export function createSpring(x0: number, stiffness: number, damping: number): Spring {
  const s: Spring = {
    x: x0,
    v: 0,
    step(target, dt) {
      let left = Math.min(dt, 0.1); // after a paused tab, take at most a tenth of a second
      while (left > 0) {
        const h = Math.min(left, 1 / 120);
        s.v += (target - s.x) * stiffness * h;
        s.v *= Math.exp(-damping * h);
        s.x += s.v * h;
        left -= h;
      }
      return s.x;
    },
    set(x) {
      s.x = x;
      s.v = 0;
    },
  };
  return s;
}

// The prototype's per-frame springs at 60 fps, converted to per-second constants:
// stiffness = k·60², damping = -ln(d)·60.
export const POSITION_SPRING = { stiffness: 108, damping: 10.5 } as const; // k 0.03, d 0.84
export const SWELL_SPRING = { stiffness: 324, damping: 13.4 } as const; // k 0.09, d 0.8
```

- [ ] **Step 5: Create src/scene/coverFit.ts**

```ts
export interface UvWindow {
  scale: [number, number];
  offset: [number, number];
}

/**
 * The part of an image (aspect imgAsp) that covers a plane (aspect planeAsp) without distortion.
 * The crop is centred on `focus` (image coordinates, top-left origin) as far as the image edges allow.
 * Sample the texture at uv * scale + offset (uv y points up, as in three.js).
 */
export function coverFit(planeAsp: number, imgAsp: number, focus: [number, number] = [0.5, 0.5]): UvWindow {
  const wider = imgAsp > planeAsp;
  const sx = wider ? planeAsp / imgAsp : 1;
  const sy = wider ? 1 : imgAsp / planeAsp;
  const ox = Math.min(Math.max(focus[0] - sx / 2, 0), 1 - sx);
  const oy = Math.min(Math.max(1 - focus[1] - sy / 2, 0), 1 - sy);
  return { scale: [sx, sy], offset: [ox, oy] };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/scene`
Expected: all scene tests pass (15 new tests).

- [ ] **Step 7: Commit**

```bash
git add src/scene/layout.ts src/scene/layout.test.ts src/scene/springs.ts src/scene/springs.test.ts src/scene/coverFit.ts src/scene/coverFit.test.ts
git commit -m "feat: add object placement, time-based springs and cover-fit crop" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Object shapes, picture planes and the book rule

**Files:**
- Create: `src/scene/objects/types.ts`, `box.ts`, `pebble.ts`, `sphere.ts`, `blob.ts`, `reader.ts`, `phone.ts`, `laptop.ts`, `frame.ts`, `tablet.ts`, `book.ts`, `index.ts`, all under `src/scene/objects/`
- Test: `src/scene/objects/objects.test.ts`

**Interfaces:**
- Consumes:
  - `smoothstep` from `src/scene/math` (Task 5)
  - `ObjectKind` from `src/scene/types` (Task 3)
- Produces:
  - `objects/types.ts`:
    - `Vec3 = [number, number, number]`
    - `ShapeFn = (x: number, y: number, z: number) => Vec3`. It maps a unit direction to a surface point.
    - `PlaneSpec { pos: Vec3; rot: Vec3; size: [number, number]; pic: number }`
    - `SceneObject { shape: ShapeFn; planes: PlaneSpec[]; rest: [number, number] }`
    - constants `SCREEN_GAP = 0.012` and `DEFAULT_REST`
  - `objects/index.ts`:
    - `OBJECTS: Record<ObjectKind, SceneObject>`
    - `book: SceneObject`
    - `blob: ShapeFn`
    - `resolveObject(kind: ObjectKind, picCount: number): SceneObject`. This is the book rule: exactly 2 pictures gives the book.

- [ ] **Step 1: Write the failing test**

`src/scene/objects/objects.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LAP } from './laptop';
import { OBJECTS, blob, book, resolveObject } from './index';
import { READER } from './reader';
import type { SceneObject, Vec3 } from './types';

/** Evenly spread unit directions (Fibonacci sphere). */
function directions(n: number): Vec3[] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (2 * i + 1) / n;
    const r = Math.sqrt(1 - y * y);
    return [Math.cos(golden * i) * r, y, Math.sin(golden * i) * r] as Vec3;
  });
}

const DIRS = directions(1500);
const ALL: Record<string, SceneObject> = { ...OBJECTS, book };
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const unit = (x: number, y: number, z: number): Vec3 => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
};

describe.each(Object.entries(ALL))('%s', (_name, obj) => {
  it('maps every direction to a finite point inside the scene bounds', () => {
    for (const d of DIRS) {
      const p = obj.shape(...d);
      for (const c of p) {
        expect(Number.isFinite(c)).toBe(true);
        expect(Math.abs(c)).toBeLessThan(2.2);
      }
    }
  });

  it('has finite picture planes inside the object and a finite rest angle', () => {
    for (const plane of obj.planes) {
      for (const c of [...plane.pos, ...plane.rot, ...plane.size]) expect(Number.isFinite(c)).toBe(true);
      expect(plane.size[0]).toBeGreaterThan(0);
      expect(plane.size[1]).toBeGreaterThan(0);
      for (const c of plane.pos) expect(Math.abs(c)).toBeLessThan(2.2);
    }
    expect(obj.rest.every(Number.isFinite)).toBe(true);
  });
});

describe('shapes', () => {
  it('blob is a sphere of radius 1.25', () => {
    for (const d of DIRS.slice(0, 50)) expect(Math.hypot(...blob(...d))).toBeCloseTo(1.25);
  });

  it('reader spans its declared half-sizes', () => {
    const xs = DIRS.map((d) => OBJECTS.reader.shape(...d)[0]);
    const ys = DIRS.map((d) => OBJECTS.reader.shape(...d)[1]);
    expect(Math.max(...xs)).toBeCloseTo(READER.W, 1);
    expect(Math.max(...ys)).toBeCloseTo(READER.H, 1);
  });

  // sample along the hinge/spine but never at its centre: (0, ±ε, 0) normalizes to a pole, not the hinge
  const ALONG = [-0.9, -0.5, -0.1, 0.3, 0.7];

  it('laptop: screen and base meet at the hinge', () => {
    for (const x of ALONG) {
      for (const z of [-0.4, 0, 0.4]) {
        const up = OBJECTS.laptop.shape(...unit(x, 1e-4, z));
        const down = OBJECTS.laptop.shape(...unit(x, -1e-4, z));
        expect(dist(up, down)).toBeLessThan(Math.SQRT2 * LAP.D + 0.01);
      }
    }
  });

  it('book: the two pages meet at the spine', () => {
    for (const y of ALONG) {
      for (const z of [-0.4, 0, 0.4]) {
        expect(dist(book.shape(...unit(1e-4, y, z)), book.shape(...unit(-1e-4, y, z)))).toBeLessThan(0.01);
      }
    }
  });

  it('book puts one picture on each page', () => {
    expect(book.planes.map((p) => p.pic)).toEqual([0, 1]);
  });
});

describe('resolveObject (book rule)', () => {
  it('turns an item with exactly two pictures into the open book', () => {
    expect(resolveObject('tablet', 2)).toBe(book);
  });

  it('keeps the declared object otherwise', () => {
    expect(resolveObject('tablet', 1)).toBe(OBJECTS.tablet);
    expect(resolveObject('phone', 0)).toBe(OBJECTS.phone);
    expect(resolveObject('laptop', 3)).toBe(OBJECTS.laptop);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/scene/objects`
Expected: FAIL, because `./laptop` cannot be resolved.

- [ ] **Step 3: Create src/scene/objects/types.ts and box.ts**

`src/scene/objects/types.ts`:

```ts
export type Vec3 = [number, number, number];

/** Maps a unit direction on the base sphere to a point on the object's surface. */
export type ShapeFn = (x: number, y: number, z: number) => Vec3;

/** Where a picture sits on the formed object, in object space. `pic` indexes the item's pictures. */
export interface PlaneSpec {
  pos: Vec3;
  rot: Vec3;
  size: [number, number];
  pic: number;
}

export interface SceneObject {
  shape: ShapeFn;
  planes: PlaneSpec[];
  /** Resting rotation [x, y] while formed; y is mirrored when the object sits on the left. */
  rest: [number, number];
}

/** Pictures float this far in front of the screen face, so the glass never distorts them. */
export const SCREEN_GAP = 0.012;

export const DEFAULT_REST: [number, number] = [0.15, 0];
```

`src/scene/objects/box.ts`:

```ts
import type { Vec3 } from './types';

/** Projects a unit direction onto a rounded box (superellipse of exponent n) with half-sizes W, H, D. */
export function box(x: number, y: number, z: number, W: number, H: number, D: number, n = 12): Vec3 {
  const s = Math.pow(Math.abs(x) ** n + Math.abs(y) ** n + Math.abs(z) ** n, 1 / n);
  return [(x / s) * W, (y / s) * H, (z / s) * D];
}
```

- [ ] **Step 4: Create the round shapes**

`src/scene/objects/pebble.ts`:

```ts
import { DEFAULT_REST, type SceneObject } from './types';

export const pebble: SceneObject = {
  shape: (x, y, z) => {
    const r = 1.3 + 0.07 * Math.sin(3 * x + 1) * Math.cos(2.5 * y) + 0.05 * Math.sin(4 * z);
    return [x * r * 1.08, y * r, z * r];
  },
  planes: [],
  rest: DEFAULT_REST,
};
```

`src/scene/objects/sphere.ts`:

```ts
import { DEFAULT_REST, type SceneObject } from './types';

export const sphere: SceneObject = {
  shape: (x, y, z) => [x * 1.35, y * 1.35, z * 1.35],
  planes: [],
  rest: DEFAULT_REST,
};
```

`src/scene/objects/blob.ts`:

```ts
import type { ShapeFn } from './types';

/** The liquid between two objects. */
export const blob: ShapeFn = (x, y, z) => [x * 1.25, y * 1.25, z * 1.25];
```

- [ ] **Step 5: Create the flat devices**

`src/scene/objects/reader.ts`:

```ts
import { box } from './box';
import { SCREEN_GAP, type SceneObject } from './types';

export const READER = { W: 1.02, H: 1.42, D: 0.07 };

/** Portrait e-reader. */
export const reader: SceneObject = {
  shape: (x, y, z) => box(x, y, z, READER.W, READER.H, READER.D, 10),
  planes: [{ pos: [0, 0, READER.D + SCREEN_GAP], rot: [0, 0, 0], size: [READER.W * 2 * 0.88, READER.H * 2 * 0.9], pic: 0 }],
  rest: [0.06, -0.3],
};
```

`src/scene/objects/phone.ts`:

```ts
import { box } from './box';
import { SCREEN_GAP, type SceneObject } from './types';

export const PHONE = { W: 0.8, H: 1.62, D: 0.085 };

export const phone: SceneObject = {
  shape: (x, y, z) => box(x, y, z, PHONE.W, PHONE.H, PHONE.D, 9),
  planes: [{ pos: [0, 0, PHONE.D + SCREEN_GAP], rot: [0, 0, 0], size: [PHONE.W * 2 * 0.9, PHONE.H * 2 * 0.93], pic: 0 }],
  rest: [0.08, -0.3],
};
```

`src/scene/objects/tablet.ts`:

```ts
import { box } from './box';
import { SCREEN_GAP, type SceneObject } from './types';

export const TAB = { W: 1.8, H: 1.25, D: 0.07 };

export const tablet: SceneObject = {
  shape: (x, y, z) => box(x, y, z, TAB.W, TAB.H, TAB.D, 12),
  planes: [{ pos: [0, 0, TAB.D + SCREEN_GAP], rot: [0, 0, 0], size: [TAB.W * 2 * 0.92, TAB.H * 2 * 0.9], pic: 0 }],
  rest: [0.1, -0.3],
};
```

`src/scene/objects/frame.ts`:

```ts
import { smoothstep } from '../math';
import { box } from './box';
import { SCREEN_GAP, type SceneObject } from './types';

export const FRAME = { W: 1.62, H: 1.28, D: 0.13, R: 0.1 };

/** Picture frame: the front face is recessed inside a raised border. */
export const frame: SceneObject = {
  shape: (x, y, z) => {
    const [X, Y, Z] = box(x, y, z, FRAME.W, FRAME.H, FRAME.D, 14);
    if (Z <= 0) return [X, Y, Z];
    const t = Math.max(Math.abs(X) / FRAME.W, Math.abs(Y) / FRAME.H);
    return [X, Y, Z - FRAME.R * (1 - smoothstep(t, 0.8, 0.86))];
  },
  planes: [{ pos: [0, 0, FRAME.D - FRAME.R + SCREEN_GAP], rot: [0, 0, 0], size: [FRAME.W * 2 * 0.78, FRAME.H * 2 * 0.76], pic: 0 }],
  rest: [0.06, -0.28],
};
```

- [ ] **Step 6: Create the hinged shapes**

`src/scene/objects/laptop.ts`:

```ts
import { box } from './box';
import { SCREEN_GAP, type SceneObject } from './types';

/** W half-width, S screen height, D half-thickness, T screen tilt (rad), Y/Z offsets of the hinge. */
export const LAP = { W: 1.62, S: 1.9, D: 0.045, T: 0.2, Y: -0.75, Z: -0.55 };

const screenPlane = () => {
  const h = LAP.S / 2;
  const c = Math.cos(LAP.T);
  const s = Math.sin(LAP.T);
  const z = LAP.D + SCREEN_GAP;
  return {
    pos: [0, h * c + z * s + LAP.Y, -h * s + z * c + LAP.Z] as [number, number, number],
    rot: [-LAP.T, 0, 0] as [number, number, number],
    size: [LAP.W * 2 * 0.92, LAP.S * 0.88] as [number, number],
    pic: 0,
  };
};

/** Upper half of the sphere becomes the screen (tilted back), lower half folds forward into the base. */
export const laptop: SceneObject = {
  shape: (x, y, z) => {
    const [X, Y, Z] = box(x, y, z, LAP.W, 1, LAP.D);
    if (Y >= 0) {
      const h = Y * LAP.S;
      return [X, h * Math.cos(LAP.T) + LAP.Y, -h * Math.sin(LAP.T) + Z + LAP.Z];
    }
    return [X, -Z + LAP.Y, -Y * LAP.S * 0.85 + LAP.Z];
  },
  planes: [screenPlane()],
  rest: [0.22, -0.38],
};
```

`src/scene/objects/book.ts`:

```ts
import { box } from './box';
import { SCREEN_GAP, type SceneObject } from './types';

/** Open book: two pages in a shallow V, opened by angle A. */
export const BOOK = { W: 1.62, H: 1.12, D: 0.05, A: 0.26 };

const page = (side: -1 | 1, pic: number) => {
  const hw = BOOK.W / 2;
  const z = BOOK.D + SCREEN_GAP;
  return {
    pos: [side * hw * Math.cos(BOOK.A), 0, hw * Math.sin(BOOK.A) + z - 0.2] as [number, number, number],
    rot: [0, -side * BOOK.A, 0] as [number, number, number],
    size: [BOOK.W * 0.9, BOOK.H * 2 * 0.9] as [number, number],
    pic,
  };
};

export const book: SceneObject = {
  shape: (x, y, z) => {
    const [X, Y, Z] = box(x, y, z, BOOK.W, BOOK.H, BOOK.D);
    return [X * Math.cos(BOOK.A), Y, Math.abs(X) * Math.sin(BOOK.A) + Z - 0.2];
  },
  planes: [page(-1, 0), page(1, 1)],
  rest: [0.12, -0.32],
};
```

- [ ] **Step 7: Create src/scene/objects/index.ts**

```ts
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
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- src/scene/objects`
Expected: every `describe.each` block passes for pebble, reader, phone, laptop, frame, tablet, sphere and book, along with the shape and book-rule tests.

- [ ] **Step 9: Commit**

```bash
git add src/scene/objects
git commit -m "feat: add object shapes, picture planes and the book rule" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Morph geometry, material, background and palette

**Files:**
- Create: `src/scene/geometry.ts`, `src/scene/material.ts`, `src/scene/background.ts`, `src/scene/palette.ts`
- Test: `src/scene/geometry.test.ts`, `src/scene/material.test.ts`, `src/scene/background.test.ts`, `src/scene/palette.test.ts`

**Interfaces:**
- Consumes:
  - `ShapeFn` (Task 8)
  - `lerp` (Task 5)
  - `Theme` (Task 3)
- Produces:
  - `geometry.ts`: `buildMorphGeometry(shapes: ShapeFn[], detail: number): BufferGeometry`. It returns one morph target per shape, in order, with absolute positions.
  - `material.ts`:
    - `interface LiquidUniforms { uLiquid: { value: number }; uT: { value: number } }`
    - `interface ObjectMaterial { material: MeshPhysicalMaterial; uniforms: LiquidUniforms; setSolid(solid: number, fade: number): void }`
    - `createObjectMaterial(lite: boolean, fadeable: boolean): ObjectMaterial`
  - `background.ts`:
    - `interface BackgroundFrame { base: Color; a: Color; b: Color; bar: Color; t: number; center: [number, number]; bars: number }`
    - `interface Background { mesh: Mesh; update(f: BackgroundFrame): void; dispose(): void }`
    - `createBackground(): Background`
    - `backgroundCenter(x: number, y: number, cameraZ: number): [number, number]`
    - constants `BG_Z = -6` and `BG_SIZE = [40, 22]`
  - `palette.ts`:
    - `interface Swatch { glow: Color; wash: Color }`
    - `PALETTE: Record<Theme, Swatch[]>`, in state order
    - `BASE: Record<Theme, Color>`
    - `STATE_COUNT = 7`

- [ ] **Step 1: Write the failing tests**

`src/scene/geometry.test.ts`:

```ts
import { expect, it } from 'vitest';
import { buildMorphGeometry } from './geometry';
import { OBJECTS, blob } from './objects';

it('builds one morph target per shape on a shared, welded sphere', () => {
  const geo = buildMorphGeometry([OBJECTS.phone.shape, blob], 4);
  // an icosahedron with each edge split into 5 has 10·5²+2 unique vertices
  expect(geo.getAttribute('position').count).toBe(252);
  expect(geo.getIndex()).not.toBeNull();
  expect(geo.morphAttributes.position).toHaveLength(2);
  expect(geo.morphAttributes.normal).toHaveLength(2);
  expect(Array.from(geo.morphAttributes.position[0].array).every(Number.isFinite)).toBe(true);
  expect(Array.from(geo.morphAttributes.normal[1].array).every(Number.isFinite)).toBe(true);
});
```

`src/scene/material.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createObjectMaterial } from './material';

describe('createObjectMaterial', () => {
  it('is clear liquid glass when molten and glossy black when set', () => {
    const look = createObjectMaterial(false, false);
    look.setSolid(0, 1);
    expect(look.material.transmission).toBe(1);
    expect(look.material.color.getHexString()).toBe('ffffff');
    look.setSolid(1, 1);
    expect(look.material.transmission).toBeLessThan(0.001);
    expect(look.material.color.getHexString()).toBe('141416');
    expect(look.material.metalness).toBeCloseTo(0.35);
    expect(look.material.roughness).toBeCloseTo(0.16);
    expect(look.material.envMapIntensity).toBeCloseTo(1.3);
  });

  it('lite mode never uses transmission and fades through opacity', () => {
    const look = createObjectMaterial(true, false);
    look.setSolid(0, 0.5);
    expect(look.material.transmission).toBe(0);
    expect(look.material.transparent).toBe(true);
    expect(look.material.opacity).toBeCloseTo(0.15);
  });

  it('patches the liquid ripple into the vertex shader, and the rim into lite fragments', () => {
    const shader = {
      uniforms: {} as Record<string, unknown>,
      vertexShader: '#include <common>\n#include <morphtarget_vertex>',
      fragmentShader: '#include <common>\n#include <dithering_fragment>',
    };
    const look = createObjectMaterial(true, false);
    look.material.onBeforeCompile(shader as never, null as never);
    expect(shader.uniforms.uLiquid).toBe(look.uniforms.uLiquid);
    expect(shader.vertexShader).toContain('transformed += nrm * w * 0.28 * uLiquid');
    expect(shader.fragmentShader).toContain('rim');
  });
});
```

`src/scene/background.test.ts`:

```ts
import { Color } from 'three';
import { expect, it } from 'vitest';
import { backgroundCenter, createBackground } from './background';

it('projects the object position onto the background plane', () => {
  expect(backgroundCenter(0, 0, 9)).toEqual([0.9, 0.5]);
  const [u] = backgroundCenter(2.25, 0, 9);
  expect(u).toBeCloseTo((0.5 + (2.25 * 15) / 9 / 40) * 1.8);
});

it('writes frame values into its uniforms', () => {
  const bg = createBackground();
  bg.update({ base: new Color(0, 0, 0), a: new Color(1, 0, 0), b: new Color(0, 1, 0), bar: new Color(0, 0, 1), t: 2, center: [0.4, 0.6], bars: 0 });
  const u = (bg.mesh.material as unknown as { uniforms: Record<string, { value: unknown }> }).uniforms;
  expect((u.uA.value as Color).r).toBe(1);
  expect(u.uBars.value).toBe(0);
  expect(u.uT.value).toBe(2);
  bg.dispose();
});
```

`src/scene/palette.test.ts`:

```ts
import { expect, it } from 'vitest';
import { BASE, PALETTE, STATE_COUNT } from './palette';

it('has one swatch per object state in both themes', () => {
  expect(PALETTE.light).toHaveLength(STATE_COUNT);
  expect(PALETTE.dark).toHaveLength(STATE_COUNT);
});

it('stores the light page background as raw output values so the canvas matches the CSS', () => {
  expect(BASE.light.r).toBeCloseTo(245 / 255);
  expect(BASE.light.b).toBeCloseTo(247 / 255);
  expect(BASE.dark.r).toBe(0);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/scene/geometry.test.ts src/scene/material.test.ts src/scene/background.test.ts src/scene/palette.test.ts`
Expected: FAIL, because the modules cannot be resolved.

- [ ] **Step 3: Create src/scene/geometry.ts**

```ts
import { BufferAttribute, BufferGeometry, IcosahedronGeometry, Vector3 } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ShapeFn } from './objects/types';

/**
 * One welded sphere with a morph target per shape. Every shape maps the same unit directions,
 * so any two targets blend smoothly. Targets hold absolute positions: with influences summing
 * to 1 the base sphere contributes nothing.
 */
export function buildMorphGeometry(shapes: ShapeFn[], detail: number): BufferGeometry {
  const ico = new IcosahedronGeometry(1, detail);
  ico.deleteAttribute('normal');
  ico.deleteAttribute('uv'); // uv seams would stop vertices from welding
  const geo = mergeVertices(ico);
  ico.dispose();

  const pos = geo.getAttribute('position');
  const count = pos.count;
  const dirs = new Float32Array(count * 3);
  const v = new Vector3();
  for (let i = 0; i < count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    dirs[i * 3] = v.x;
    dirs[i * 3 + 1] = v.y;
    dirs[i * 3 + 2] = v.z;
  }

  geo.morphAttributes.position = [];
  geo.morphAttributes.normal = [];
  for (const shape of shapes) {
    const target = new BufferGeometry();
    target.setIndex(geo.getIndex());
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) arr.set(shape(dirs[i * 3], dirs[i * 3 + 1], dirs[i * 3 + 2]), i * 3);
    target.setAttribute('position', new BufferAttribute(arr, 3));
    target.computeVertexNormals();
    geo.morphAttributes.position.push(target.getAttribute('position') as BufferAttribute);
    geo.morphAttributes.normal.push(target.getAttribute('normal') as BufferAttribute);
  }
  geo.computeVertexNormals();
  return geo;
}
```

- [ ] **Step 4: Create src/scene/material.ts**

```ts
import { Color, MeshPhysicalMaterial } from 'three';
import { lerp } from './math';

export interface LiquidUniforms {
  uLiquid: { value: number };
  uT: { value: number };
}

export interface ObjectMaterial {
  material: MeshPhysicalMaterial;
  uniforms: LiquidUniforms;
  /** solid: 0 = liquid glass, 1 = glossy black. fade: overall opacity (reduced-motion swaps). */
  setSolid(solid: number, fade: number): void;
}

const CLEAR = new Color('#ffffff');
const INK = new Color('#141416');

const VERTEX_LIQUID = /* glsl */ `#include <morphtarget_vertex>
  // molten: slow travelling ripples along the surface, plus a twist around the vertical axis
  vec3 nrm = normalize(transformed + 1e-5);
  float w = sin(2.6 * transformed.x + uT * 2.4) * sin(2.2 * transformed.y - uT * 1.9)
          + 0.6 * sin(3.4 * transformed.z + uT * 3.1) + 0.35 * sin(5.0 * (transformed.x + transformed.y) - uT * 4.0);
  transformed += nrm * w * 0.28 * uLiquid;
  float tw = uLiquid * sin(transformed.y * 1.6 + uT * 2.2) * 0.7;
  transformed.xz = mat2(cos(tw), -sin(tw), sin(tw), cos(tw)) * transformed.xz;`;

// lite has no transmission: the liquid reads as a bright, opaque rim instead
const FRAGMENT_RIM = /* glsl */ `#include <dithering_fragment>
  float rim = pow(1.0 - abs(dot(normalize(vViewPosition), normalize(vNormal))), 2.5);
  gl_FragColor.rgb += rim * uLiquid * 0.5;
  gl_FragColor.a = mix(gl_FragColor.a, 1.0, rim * uLiquid);`;

export function createObjectMaterial(lite: boolean, fadeable: boolean): ObjectMaterial {
  const uniforms: LiquidUniforms = { uLiquid: { value: 0 }, uT: { value: 0 } };
  const material = new MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0,
    ior: 1.38,
    specularIntensity: 0.8,
    envMapIntensity: 0.4,
    clearcoatRoughness: 0.05,
    ...(lite ? { transparent: true } : { transmission: 1, thickness: 0.6, dispersion: 7, transparent: fadeable }),
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uLiquid, uT;')
      .replace('#include <morphtarget_vertex>', VERTEX_LIQUID);
    if (lite) {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uLiquid;')
        .replace('#include <dithering_fragment>', FRAGMENT_RIM);
    }
  };

  return {
    material,
    uniforms,
    setSolid(solid, fade) {
      material.color.copy(CLEAR).lerp(INK, solid);
      material.metalness = 0.35 * solid;
      material.roughness = 0.16 * solid;
      // never exactly 0: crossing 0 toggles a shader define and forces a recompile mid-scroll
      material.clearcoat = Math.max(0.0001, solid);
      material.envMapIntensity = lerp(0.4, 1.3, solid);
      if (lite) {
        material.opacity = lerp(0.3, 1, solid) * fade;
      } else {
        material.transmission = Math.max(0.0001, 1 - solid);
        material.opacity = fade;
      }
    },
  };
}
```

- [ ] **Step 5: Create src/scene/background.ts**

```ts
import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector2 } from 'three';

export const BG_Z = -6;
export const BG_SIZE: [number, number] = [40, 22];

export interface BackgroundFrame {
  base: Color;
  a: Color;
  b: Color;
  bar: Color;
  t: number;
  center: [number, number];
  /** 1 draws the thin light-bars, 0 hides them (lite). */
  bars: number;
}

export interface Background {
  mesh: Mesh;
  update(f: BackgroundFrame): void;
  dispose(): void;
}

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// Output is written without colour conversion, exactly as in the approved prototype.
const FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uBase, uA, uB, uBar; uniform float uT, uBars; uniform vec2 uC;
  float blob(vec2 p, vec2 c, float r){ return exp(-dot(p - c, p - c) / (r * r)); }
  void main(){
    vec2 p = vUv * vec2(1.8, 1.0);
    vec2 c1 = uC + vec2(0.03 * sin(uT * 0.3), 0.04 + 0.02 * cos(uT * 0.25));
    vec2 c2 = uC + vec2(-0.05 * cos(uT * 0.2), -0.08 + 0.02 * sin(uT * 0.35));
    vec3 col = mix(uBase, uB, blob(p, c2, 0.36) * 0.85);
    col = mix(col, uA, blob(p, c1, 0.13) * 0.4);
    float bars = smoothstep(0.94, 1.0, abs(sin((p.x - uC.x) * 70.0)));
    col = mix(col, uBar, bars * blob(p, uC, 0.15) * 0.85 * uBars);
    gl_FragColor = vec4(col, 1.0);
  }`;

/** An opaque plane behind the object: a soft glow and thin light-bars, so the glass has something to refract. */
export function createBackground(): Background {
  const material = new ShaderMaterial({
    uniforms: {
      uBase: { value: new Color() },
      uA: { value: new Color() },
      uB: { value: new Color() },
      uBar: { value: new Color() },
      uT: { value: 0 },
      uC: { value: new Vector2() },
      uBars: { value: 1 },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
  const mesh = new Mesh(new PlaneGeometry(...BG_SIZE), material);
  mesh.position.z = BG_Z;

  return {
    mesh,
    update(f) {
      const u = material.uniforms;
      u.uBase.value.copy(f.base);
      u.uA.value.copy(f.a);
      u.uB.value.copy(f.b);
      u.uBar.value.copy(f.bar);
      u.uT.value = f.t;
      u.uC.value.set(f.center[0], f.center[1]);
      u.uBars.value = f.bars;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}

/** Where an object at world (x, y) appears on the background, in the shader's p space. */
export function backgroundCenter(x: number, y: number, cameraZ: number): [number, number] {
  const k = (cameraZ - BG_Z) / cameraZ;
  return [(0.5 + (x * k) / BG_SIZE[0]) * 1.8, 0.5 + (y * k) / BG_SIZE[1]];
}
```

- [ ] **Step 6: Create src/scene/palette.ts**

```ts
import { Color, LinearSRGBColorSpace } from 'three';
import type { Theme } from './types';

export const STATE_COUNT = 7;

// glow / wash per state: hero, ESNIDSaaS, MA-ZeroPhish, Mizuhada, Baka, AckLab, projects
const HEX: Record<Theme, string[]> = {
  dark: ['#E8C9A0/#1F4A5A', '#9FC3E8/#2A2F6B', '#F0A860/#7A2E46', '#8FD3C1/#14403E', '#B7D98B/#2E4A1E', '#C7B3F2/#2E2A5E', '#E8C9A0/#1F4A5A'],
  light: ['#B98450/#F1DFC8', '#2F6FD0/#D6E5F8', '#D9682C/#F7D7C4', '#1E8C74/#D3EEE7', '#5C8A1E/#E3EFD3', '#6E4FD8/#E3DAF8', '#B98450/#F1DFC8'],
};

export interface Swatch {
  glow: Color;
  wash: Color;
}

const parse = (pair: string): Swatch => {
  const [glow, wash] = pair.split('/');
  return { glow: new Color(glow), wash: new Color(wash) };
};

export const PALETTE: Record<Theme, Swatch[]> = { dark: HEX.dark.map(parse), light: HEX.light.map(parse) };

/** Page background as raw output values: the background shader does no colour conversion, so this matches the CSS exactly. */
export const BASE: Record<Theme, Color> = {
  dark: new Color().setRGB(0, 0, 0, LinearSRGBColorSpace),
  light: new Color().setRGB(245 / 255, 245 / 255, 247 / 255, LinearSRGBColorSpace),
};
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- src/scene`
Expected: all scene tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/scene/geometry.ts src/scene/geometry.test.ts src/scene/material.ts src/scene/material.test.ts src/scene/background.ts src/scene/background.test.ts src/scene/palette.ts src/scene/palette.test.ts
git commit -m "feat: add morph geometry, glass-to-black material and glow background" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Picture planes

**Files:**
- Create: `src/scene/pictures.ts`
- Test: `src/scene/pictures.test.ts`

**Interfaces:**
- Consumes:
  - `coverFit` (Task 7)
  - `PlaneSpec` (Task 8)
  - `ScenePic` (Task 3)
- Produces:
  - `isPlaceholder(src: string): boolean`
  - `interface PictureSet { group: Group; setAmount(a: number): void; dispose(): void }`
  - `createPictures(planes: PlaneSpec[], pics: ScenePic[], label: string, anisotropy: number): PictureSet`. What it shows:
    - A placeholder src gives a graphite "Screenshot coming" tile with the label.
    - A failed load gives a graphite panel with the label.
    - `setAmount(a)` sets the picture opacity, and hides the group when `a` is near 0.

- [ ] **Step 1: Write the failing test**

`src/scene/pictures.test.ts`:

```ts
import { expect, it } from 'vitest';
import { createPictures, isPlaceholder } from './pictures';

it('recognises placeholder screenshots by name', () => {
  expect(isPlaceholder('/shots/acklab.placeholder.webp')).toBe(true);
  expect(isPlaceholder('/shots/baka.webp')).toBe(false);
});

it('makes no planes for an object without screens', () => {
  const set = createPictures([], [], 'Hero', 1);
  expect(set.group.children).toHaveLength(0);
  set.setAmount(1);
  expect(set.group.visible).toBe(true);
  set.setAmount(0);
  expect(set.group.visible).toBe(false);
  set.dispose();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/scene/pictures.test.ts`
Expected: FAIL, because `./pictures` cannot be resolved.

- [ ] **Step 3: Create src/scene/pictures.ts**

```ts
import { CanvasTexture, Group, LinearMipmapLinearFilter, Mesh, PlaneGeometry, ShaderMaterial, Texture, TextureLoader, Vector2 } from 'three';
import { coverFit } from './coverFit';
import type { PlaneSpec } from './objects/types';
import type { ScenePic } from './types';

export const isPlaceholder = (src: string): boolean => src.includes('.placeholder.');

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uImg; uniform float uAmt, uPlaneAsp; uniform vec2 uScale, uOffset;
  void main(){
    // rounded corners, so the picture sits inside the screen face
    vec2 d = abs(vUv - 0.5) * vec2(uPlaneAsp, 1.0); float r = 0.025; vec2 h = vec2(uPlaneAsp, 1.0) * 0.5 - r;
    if (length(max(d - h, 0.0)) - r > 0.0) discard;
    gl_FragColor = vec4(texture2D(uImg, vUv * uScale + uOffset).rgb, uAmt);
  }`;

export interface PictureSet {
  group: Group;
  setAmount(a: number): void;
  dispose(): void;
}

export function createPictures(planes: PlaneSpec[], pics: ScenePic[], label: string, anisotropy: number): PictureSet {
  const group = new Group();
  const materials: ShaderMaterial[] = [];
  const textures: Texture[] = [];
  let disposed = false;

  for (const plane of planes) {
    const pic = pics[plane.pic];
    if (!pic) continue;
    const aspect = plane.size[0] / plane.size[1];
    const material = new ShaderMaterial({
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
    const mesh = new Mesh(new PlaneGeometry(1, 1), material);
    mesh.position.set(...plane.pos);
    mesh.rotation.set(...plane.rot);
    mesh.scale.set(plane.size[0], plane.size[1], 1);
    mesh.visible = false; // until its texture is ready
    group.add(mesh);
    materials.push(material);

    const show = (texture: Texture, imageAspect: number, focus?: [number, number]) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      textures.push(texture);
      const fit = coverFit(aspect, imageAspect, focus);
      material.uniforms.uImg.value = texture;
      (material.uniforms.uScale.value as Vector2).set(...fit.scale);
      (material.uniforms.uOffset.value as Vector2).set(...fit.offset);
      mesh.visible = true;
    };

    if (isPlaceholder(pic.src)) {
      show(tileTexture(aspect, ['Screenshot coming', label]), aspect);
    } else {
      new TextureLoader().load(
        pic.src,
        (texture) => {
          texture.anisotropy = anisotropy;
          texture.minFilter = LinearMipmapLinearFilter;
          const img = texture.image as HTMLImageElement;
          show(texture, img.width / img.height, pic.focus);
        },
        undefined,
        () => show(tileTexture(aspect, [label]), aspect),
      );
    }
  }

  group.visible = false;
  return {
    group,
    setAmount(a) {
      group.visible = a > 0.001;
      for (const m of materials) m.uniforms.uAmt.value = a;
    },
    dispose() {
      disposed = true;
      group.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}

/** Graphite panel with centred text: used for placeholders and for screenshots that fail to load. */
function tileTexture(aspect: number, lines: string[]): CanvasTexture {
  const h = 512;
  const w = Math.round(h * aspect);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2C2C2E';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    lines.forEach((line, i) => {
      const first = i === 0;
      ctx.fillStyle = first ? '#F5F5F7' : '#A1A1A6';
      ctx.font = `${first ? 800 : 600} ${Math.round(h * (first ? 0.075 : 0.05))}px "Inter Tight", system-ui, sans-serif`;
      ctx.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * h * 0.1, w * 0.86);
    });
  }
  return new CanvasTexture(canvas);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm test -- src/scene/pictures.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/scene/pictures.ts src/scene/pictures.test.ts
git commit -m "feat: add cover-fit picture planes with placeholder and failure tiles" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: createScene: renderer and frame loop

**Files:**
- Create: `src/scene/createScene.ts`
- Test: `src/scene/createScene.test.ts`

**Interfaces:**
- Consumes everything in `src/scene/` from Tasks 3 and 5–10:
  - `stepState`, `placement`, `CAMERA_Z`, `FOV`
  - `createSpring`, `POSITION_SPRING`, `SWELL_SPRING`
  - `resolveObject`, `blob`
  - `buildMorphGeometry`, `createObjectMaterial`, `createBackground`, `backgroundCenter`
  - `PALETTE`, `BASE`, `STATE_COUNT`
  - `createPictures`
  - `ease`, `smoothstep`
  - the types `SceneItem`, `SceneOptions`, `SceneHandle`, `Theme`
- Produces: `createScene(canvas: HTMLCanvasElement, items: SceneItem[], opts: SceneOptions): SceneHandle`.
  - It throws if `items.length !== 7` or if WebGL cannot be created.
  - It starts rendering immediately and calls `opts.onReady` after the first frame.
  - It pauses while `document.hidden` is true or after `setActive(false)`.

- [ ] **Step 1: Write the failing test**

`src/scene/createScene.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createScene } from './createScene';
import type { ObjectKind, SceneItem, SceneOptions } from './types';

const kinds: ObjectKind[] = ['pebble', 'reader', 'phone', 'laptop', 'frame', 'tablet', 'sphere'];
const items: SceneItem[] = kinds.map((kind) => ({ kind, pics: [], label: kind }));
const opts: SceneOptions = { lite: false, reducedMotion: false, snap: false, centered: false };

describe('createScene', () => {
  afterEach(() => vi.restoreAllMocks());

  it('rejects an item list that does not match the palette', () => {
    expect(() => createScene(document.createElement('canvas'), items.slice(0, 3), opts)).toThrow(/expects 7 items/);
  });

  it('throws when WebGL is unavailable, so the caller can show still images', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => createScene(document.createElement('canvas'), items, opts)).toThrow();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/scene/createScene.test.ts`
Expected: FAIL, because `./createScene` cannot be resolved.

- [ ] **Step 3: Create src/scene/createScene.ts**

```ts
import { ACESFilmicToneMapping, Color, DirectionalLight, Group, Mesh, PMREMGenerator, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { backgroundCenter, createBackground } from './background';
import { buildMorphGeometry } from './geometry';
import { CAMERA_Z, FOV, placement } from './layout';
import { createObjectMaterial } from './material';
import { ease, smoothstep } from './math';
import { blob, resolveObject } from './objects';
import { BASE, PALETTE, STATE_COUNT } from './palette';
import { createPictures } from './pictures';
import { POSITION_SPRING, SWELL_SPRING, createSpring } from './springs';
import { stepState } from './step';
import type { SceneHandle, SceneItem, SceneOptions, Theme } from './types';

const WHITE = new Color('#ffffff');

export function createScene(canvas: HTMLCanvasElement, items: SceneItem[], opts: SceneOptions): SceneHandle {
  if (items.length !== STATE_COUNT) throw new Error(`createScene expects ${STATE_COUNT} items, got ${items.length}`);

  const renderer = new WebGLRenderer({ canvas, antialias: true }); // throws when WebGL is unavailable
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = ACESFilmicToneMapping;

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 0.1, 100);
  camera.position.z = CAMERA_Z;
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = env.texture;

  const background = createBackground();
  scene.add(background.mesh);

  // every state is a morph target of one mesh; the liquid blob is the last target
  const objects = items.map((item) => resolveObject(item.kind, item.pics.length));
  const geometry = buildMorphGeometry([...objects.map((o) => o.shape), blob], opts.lite ? 40 : 80);
  const BLOB = objects.length;
  const look = createObjectMaterial(opts.lite, opts.reducedMotion);
  const mesh = new Mesh(geometry, look.material);
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const pictures = objects.map((o, i) => createPictures(o.planes, items[i].pics, items[i].label, anisotropy));

  const group = new Group();
  group.add(mesh, ...pictures.map((p) => p.group));
  scene.add(group);
  const key = new DirectionalLight('#fff4e6', 2);
  key.position.set(3, 4, 5);
  scene.add(key);

  const still = opts.reducedMotion || opts.snap;
  const posX = createSpring(0, POSITION_SPRING.stiffness, POSITION_SPRING.damping);
  const posY = createSpring(0, POSITION_SPRING.stiffness, POSITION_SPRING.damping);
  const swell = createSpring(1, SWELL_SPRING.stiffness, SWELL_SPRING.damping);
  const glow = new Color();
  const wash = new Color();
  const bar = new Color();

  let theme: Theme = 'light';
  let target = 0;
  let smooth = 0;
  let primed = false;
  let ready = false;
  let mx = 0;
  let my = 0;
  let active = true;
  let running = false;
  let raf = 0;
  let last = 0;
  let time = 0;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render(t: number, dt: number) {
    // frame-rate independent damping of the scroll position
    if (!primed || still) smooth = target;
    else smooth += (target - smooth) * (1 - Math.exp(-dt * 3));

    const s = stepState(smooth, STATE_COUNT, opts.reducedMotion);
    const { k, wA, wBlob, wB, fade, dir } = s;

    // shape: object k melts into the blob, the blob sets into object k+1
    const influences = mesh.morphTargetInfluences!;
    influences.fill(0);
    influences[k] = wA;
    influences[k + 1] = wB;
    influences[BLOB] = wBlob;
    look.uniforms.uLiquid.value = wBlob;
    look.uniforms.uT.value = t;
    look.setSolid(smoothstep(wA + wB, 0.6, 1), fade);

    // pictures appear only once the object has set
    pictures.forEach((pic, i) => {
      const w = i === k ? wA : i === k + 1 ? wB : 0;
      pic.setAmount(smoothstep(w, 0.82, 1) * fade);
    });

    // position: opposite the text, following on a springy, liquid path
    const mode = opts.centered ? 'centered' : window.innerWidth >= 800 ? 'wide' : 'narrow';
    const place = placement(camera.aspect, mode);
    const tx = dir * place.side;
    const ty = place.y;
    const swellTarget = 1 + 0.2 * wBlob;
    if (!primed || still) {
      posX.set(tx);
      posY.set(ty);
      swell.set(swellTarget);
    } else {
      posX.step(tx, dt);
      posY.step(ty, dt);
      swell.step(swellTarget, dt);
    }
    primed = true;
    group.position.set(posX.x, posY.x, 0);

    // resting angle (turned toward the text), a full spin and wobble through the liquid
    const restA = objects[k].rest;
    const restB = objects[k + 1].rest;
    const sway = still ? 0 : Math.sin(t * 0.4) * 0.06;
    const tiltX = opts.reducedMotion ? 0 : my * 0.15;
    const tiltY = opts.reducedMotion ? 0 : mx * 0.35;
    const spin = opts.reducedMotion ? 0 : ease(s.g) * Math.PI * 2 * dir;
    group.rotation.set(
      restA[0] * wA + restB[0] * wB + 0.15 * wBlob + tiltX + sway * 0.5 + wBlob * 0.5,
      (restA[1] * wA + restB[1] * wB) * dir + tiltY + sway + spin,
      wBlob * Math.sin(t * 1.6) * 0.18,
    );

    // swell with overshoot, squash and stretch from sideways speed (units per frame at 60 fps)
    const stretch = still ? 0 : Math.min(0.35, (Math.abs(posX.v) / 60) * 2.6);
    const size = swell.x * place.fit;
    group.scale.set(size * (1 + stretch), size * (1 - stretch * 0.6), size);
    camera.position.z = CAMERA_Z - wBlob * 1.1;

    // per-section glow, blended through the melt
    const pal = PALETTE[theme];
    const dark = theme === 'dark';
    const ef = ease(s.g);
    glow.copy(pal[k].glow).lerp(pal[k + 1].glow, ef);
    wash.copy(pal[k].wash).lerp(pal[k + 1].wash, ef);
    bar.copy(glow).lerp(WHITE, dark ? 0.6 : 0);
    background.update({
      base: BASE[theme],
      a: glow,
      b: wash,
      bar,
      t: opts.reducedMotion ? 0 : t,
      center: backgroundCenter(posX.x, posY.x, camera.position.z),
      bars: opts.lite ? 0 : 1,
    });
    renderer.toneMappingExposure = dark ? 1.05 : 1;

    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      opts.onReady?.();
    }
  }

  function loop(now: number) {
    raf = requestAnimationFrame(loop);
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    time += dt;
    render(time, dt);
  }

  function start() {
    if (running || !active || document.hidden) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  const onPointer = (e: PointerEvent) => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  };
  const onVisibility = () => (document.hidden ? stop() : start());

  resize();
  window.addEventListener('resize', resize);
  if (!opts.reducedMotion) window.addEventListener('pointermove', onPointer, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  start();

  return {
    setProgress(p) {
      target = p;
    },
    setTheme(t) {
      theme = t;
    },
    setActive(a) {
      active = a;
      if (a) start();
      else stop();
    },
    dispose() {
      stop();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      for (const p of pictures) p.dispose();
      geometry.dispose();
      look.material.dispose();
      background.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- src/scene/createScene.test.ts && npm run typecheck`
Expected: 2 passed; no type errors. jsdom prints "Not implemented: HTMLCanvasElement.prototype.getContext". That message is the expected failure path and is silenced by the spy.

- [ ] **Step 5: Commit**

```bash
git add src/scene/createScene.ts src/scene/createScene.test.ts
git commit -m "feat: add the liquid-object scene and frame loop" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Scene layer, static fallback and wiring into the page

**Files:**
- Create: `src/app/sceneItems.ts`, `src/app/StaticFallback.tsx`, `src/app/SceneLayer.tsx`
- Modify: `src/app/App.tsx` (add the scene layer and capture mode), `src/app/App.test.tsx` (mock the capability), `src/styles.css` (append)
- Test: `src/app/sceneItems.test.ts`, `src/app/SceneLayer.test.tsx`

**Interfaces:**
- Consumes:
  - `createScene` (Task 11), only through `import('../scene/createScene')`
  - `detectSceneMode` (Task 3)
  - `usePrefersReducedMotion` (Task 3)
  - `useScrollProgress` and `ScrollSample` (Task 6)
  - `featured` (Task 2)
  - the types `SceneItem`, `SceneHandle` and `Theme` (Task 3)
- Produces:
  - `SCENE_ITEMS: SceneItem[]`: 7 items in state order.
  - `<StaticFallback state={number} theme={Theme} />`: an `<img data-testid="scene-fallback">` with src `/fallback/<state>-<theme>.webp`. It hides itself if the image is missing.
  - `<SceneLayer items theme capture? />`: a `<div class="scene" data-status="loading|ready|static">`.
  - URL parameters read by the page:
    - `?p=<progress>`: scroll the page there and snap the scene
    - `?capture=1`: render only the scene, with the object centred
    - `?scene=full|lite|static` and `?theme=light|dark`

- [ ] **Step 1: Write the failing tests**

`src/app/sceneItems.test.ts`:

```ts
import { expect, it } from 'vitest';
import { SCENE_ITEMS } from './sceneItems';

it('lists the seven object states in CV order', () => {
  expect(SCENE_ITEMS.map((i) => i.kind)).toEqual(['pebble', 'reader', 'phone', 'laptop', 'frame', 'tablet', 'sphere']);
  expect(SCENE_ITEMS[3].label).toBe('Mizuhada Group');
});
```

`src/app/SceneLayer.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SceneHandle, SceneOptions } from '../scene/types';
import { mockMatchMedia } from '../test/matchMedia';
import { detectSceneMode } from './capability';
import { SceneLayer } from './SceneLayer';
import { SCENE_ITEMS } from './sceneItems';

const { createScene } = vi.hoisted(() => ({ createScene: vi.fn() }));
vi.mock('../scene/createScene', () => ({ createScene }));
vi.mock('./capability', () => ({ detectSceneMode: vi.fn(() => 'full') }));

const handle = (): SceneHandle => ({ setProgress: vi.fn(), setTheme: vi.fn(), setActive: vi.fn(), dispose: vi.fn() });

describe('SceneLayer', () => {
  beforeEach(() => {
    vi.mocked(detectSceneMode).mockReturnValue('full');
    createScene.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('passes the reduced-motion preference to the scene', async () => {
    mockMatchMedia(['(prefers-reduced-motion: reduce)']);
    createScene.mockReturnValue(handle());
    render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    await waitFor(() => expect(createScene).toHaveBeenCalled());
    const opts = createScene.mock.calls.at(-1)![2] as SceneOptions;
    expect(opts).toMatchObject({ reducedMotion: true, lite: false, snap: false, centered: false });
  });

  it('shows the still image when WebGL creation throws', async () => {
    createScene.mockImplementation(() => {
      throw new Error('Error creating WebGL context.');
    });
    const { container } = render(<SceneLayer items={SCENE_ITEMS} theme="dark" />);
    await waitFor(() => expect(container.querySelector('.scene')).toHaveAttribute('data-status', 'static'));
    expect(container.querySelector('canvas')).toBeNull();
    expect(screen.getByTestId('scene-fallback')).toHaveAttribute('src', '/fallback/0-dark.webp');
  });

  it('hides the still image once the scene has drawn its first frame', async () => {
    createScene.mockImplementation((_c: HTMLCanvasElement, _i: unknown, o: SceneOptions) => {
      o.onReady?.();
      return handle();
    });
    const { container } = render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    await waitFor(() => expect(container.querySelector('.scene')).toHaveAttribute('data-status', 'ready'));
    expect(screen.queryByTestId('scene-fallback')).toBeNull();
  });

  it('never loads the scene when the device cannot run it', () => {
    vi.mocked(detectSceneMode).mockReturnValue('static');
    const { container } = render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    expect(container.querySelector('.scene')).toHaveAttribute('data-status', 'static');
    expect(createScene).not.toHaveBeenCalled();
    expect(screen.getByTestId('scene-fallback')).toBeInTheDocument();
  });

  it('forwards theme changes to a running scene', async () => {
    const h = handle();
    createScene.mockReturnValue(h);
    const { rerender } = render(<SceneLayer items={SCENE_ITEMS} theme="light" />);
    await waitFor(() => expect(h.setTheme).toHaveBeenCalledWith('light'));
    rerender(<SceneLayer items={SCENE_ITEMS} theme="dark" />);
    expect(h.setTheme).toHaveBeenLastCalledWith('dark');
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npm test -- src/app/sceneItems.test.ts src/app/SceneLayer.test.tsx`
Expected: FAIL, because `./sceneItems` and `./SceneLayer` cannot be resolved.

- [ ] **Step 3: Create src/app/sceneItems.ts**

```ts
import { featured } from '../content/featured';
import type { SceneItem } from '../scene/types';

/** Object states in page order: hero pebble, the five featured items, the projects sphere. */
export const SCENE_ITEMS: SceneItem[] = [
  { kind: 'pebble', pics: [], label: 'Supakorn Prayongyam' },
  ...featured.map((f): SceneItem => ({ kind: f.object, pics: f.pics, label: f.title })),
  { kind: 'sphere', pics: [], label: 'Projects' },
];
```

- [ ] **Step 4: Create src/app/StaticFallback.tsx**

```tsx
import { useState } from 'react';
import type { Theme } from '../scene/types';

/** Pre-rendered still of the formed object, shown while the scene loads or when it cannot run. */
export function StaticFallback({ state, theme }: { state: number; theme: Theme }) {
  const src = `/fallback/${state}-${theme}.webp`;
  const [missing, setMissing] = useState<string | null>(null);
  if (missing === src) return null;
  return (
    <img
      className="scene-fallback"
      data-testid="scene-fallback"
      data-side={state % 2 === 0 ? 'right' : 'left'}
      src={src}
      alt=""
      onError={() => setMissing(src)}
    />
  );
}
```

- [ ] **Step 5: Create src/app/SceneLayer.tsx**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SceneHandle, SceneItem, Theme } from '../scene/types';
import { usePrefersReducedMotion } from '../scroll/usePrefersReducedMotion';
import { useScrollProgress, type ScrollSample } from '../scroll/useScrollProgress';
import { detectSceneMode } from './capability';
import { StaticFallback } from './StaticFallback';

type Status = 'loading' | 'ready' | 'static';

const RESTORE_WAIT_MS = 3000;

function readForcedProgress(search: string): number | null {
  const raw = new URLSearchParams(search).get('p');
  if (raw === null || raw.trim() === '') return null;
  const p = Number(raw);
  return Number.isFinite(p) ? p : null;
}

export function SceneLayer({ items, theme, capture = false }: { items: SceneItem[]; theme: Theme; capture?: boolean }) {
  const mode = useMemo(detectSceneMode, []);
  const reduced = usePrefersReducedMotion();
  const forcedP = useMemo(() => readForcedProgress(window.location.search), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const progressRef = useRef(forcedP ?? 0);
  const activeRef = useRef(true);
  const themeRef = useRef(theme);
  const [status, setStatus] = useState<Status>(mode === 'static' ? 'static' : 'loading');
  const [generation, setGeneration] = useState(0);
  const [fallbackState, setFallbackState] = useState(Math.round(forcedP ?? 0));

  useEffect(() => {
    themeRef.current = theme;
    handleRef.current?.setTheme(theme);
  }, [theme]);

  // load the scene chunk after first paint; rebuild on context restore, fall back to stills on failure
  useEffect(() => {
    if (mode === 'static') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let alive = true;
    let restoreTimer = 0;

    const toStatic = (reason: unknown) => {
      if (!alive) return;
      console.warn('3D scene unavailable; showing still images instead.', reason);
      setStatus('static');
    };
    const onLost = (e: Event) => {
      // Must happen here: our listener runs before three.js's, and dispose() removes three's,
      // so without this the browser never restores the context.
      e.preventDefault();
      handleRef.current?.dispose();
      handleRef.current = null;
      setStatus('loading');
      restoreTimer = window.setTimeout(() => toStatic('WebGL context lost'), RESTORE_WAIT_MS);
    };
    const onRestored = () => {
      window.clearTimeout(restoreTimer);
      setGeneration((g) => g + 1);
    };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    import('../scene/createScene').then(({ createScene }) => {
      if (!alive) return;
      try {
        const handle = createScene(canvas, items, {
          lite: mode === 'lite',
          reducedMotion: reduced,
          snap: capture || forcedP !== null,
          centered: capture,
          onReady: () => {
            if (alive) setStatus('ready');
          },
        });
        handle.setTheme(themeRef.current);
        handle.setProgress(progressRef.current);
        handle.setActive(activeRef.current); // the page may open already scrolled past the scene
        handleRef.current = handle;
      } catch (err) {
        toStatic(err);
      }
    }, toStatic);

    return () => {
      alive = false;
      window.clearTimeout(restoreTimer);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [mode, reduced, generation, items, capture, forcedP]);

  const onSample = useCallback(
    (s: ScrollSample) => {
      if (capture) return;
      progressRef.current = s.p;
      activeRef.current = s.exit < 1;
      handleRef.current?.setProgress(s.p);
      handleRef.current?.setActive(activeRef.current);
      if (layerRef.current) layerRef.current.style.opacity = String(1 - s.exit);
      setFallbackState(Math.round(s.p));
    },
    [capture],
  );
  useScrollProgress(onSample, capture ? null : forcedP);

  return (
    <div className="scene" ref={layerRef} aria-hidden="true" data-status={status}>
      {status !== 'static' && <canvas key={generation} ref={canvasRef} />}
      {status !== 'ready' && <StaticFallback state={fallbackState} theme={theme} />}
    </div>
  );
}
```

- [ ] **Step 6: Run the new tests to verify they pass**

Run: `npm test -- src/app/sceneItems.test.ts src/app/SceneLayer.test.tsx`
Expected: 6 passed.

- [ ] **Step 7: Wire the layer into src/app/App.tsx**

Replace the whole file:

```tsx
import { useMemo } from 'react';
import { about } from '../content/about';
import { featured } from '../content/featured';
import { profile } from '../content/profile';
import { moreProjects, projectRows } from '../content/projects';
import { AboutBlock } from '../ui/AboutBlock';
import { Contact } from '../ui/Contact';
import { FeatureSection } from '../ui/FeatureSection';
import { Hero } from '../ui/Hero';
import { MoreProjects } from '../ui/MoreProjects';
import { ProjectRows } from '../ui/ProjectRows';
import { TopBar } from '../ui/TopBar';
import { SceneLayer } from './SceneLayer';
import { SCENE_ITEMS } from './sceneItems';
import { useTheme } from './theme';

export function App() {
  const { theme, toggle } = useTheme();
  // ?capture=1 renders only the centred object, for scripts/capture.mjs
  const capture = useMemo(() => new URLSearchParams(window.location.search).has('capture'), []);
  if (capture) return <SceneLayer items={SCENE_ITEMS} theme={theme} capture />;

  return (
    <>
      <SceneLayer items={SCENE_ITEMS} theme={theme} />
      <TopBar name={profile.name} theme={theme} onToggleTheme={toggle} />
      <main>
        <Hero profile={profile} />
        {featured.map((item, i) => (
          <FeatureSection
            key={item.id}
            item={item}
            anchor={i + 1}
            groupStart={i === 0 || featured[i - 1].group !== item.group}
          />
        ))}
        <ProjectRows rows={projectRows} anchor={featured.length + 1} />
        <MoreProjects items={moreProjects} />
        <AboutBlock about={about} />
        <Contact profile={profile} />
      </main>
    </>
  );
}
```

- [ ] **Step 8: Keep the App tests off WebGL**

In `src/app/App.test.tsx`, replace the import block at the top of the file (everything above `describe('App', …)`) with:

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

// jsdom has no WebGL: render the page with still images instead of the scene
vi.mock('./capability', () => ({ detectSceneMode: () => 'static' }));
```

The `describe('App', …)` block stays unchanged.

- [ ] **Step 9: Append scene styles to src/styles.css**

```css
/* 3D layer: fixed behind the text, faded out (and paused) as More projects arrives */
.scene {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
.scene canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.scene-fallback {
  position: absolute;
  top: 50%;
  width: min(42vw, 80vh);
  aspect-ratio: 1;
  object-fit: contain;
  transform: translateY(-50%);
  -webkit-mask-image: radial-gradient(closest-side, #000 72%, transparent);
  mask-image: radial-gradient(closest-side, #000 72%, transparent);
}
.scene-fallback[data-side='right'] {
  right: 4vw;
}
.scene-fallback[data-side='left'] {
  left: 4vw;
}
@media (max-width: 799px) {
  .scene-fallback,
  .scene-fallback[data-side] {
    top: 27.5vh;
    right: auto;
    left: 50%;
    width: min(86vw, 50vh);
    transform: translate(-50%, -50%);
  }
}
```

- [ ] **Step 10: Run the full suite and build**

Run: `npm test && npm run build`
Expected: every test passes. The build output lists a separate `assets/createScene-*.js` chunk next to `assets/index-*.js`.

- [ ] **Step 11: Look at it in headless Chrome**

Start the preview server in the background: `npm run preview` (serves `http://127.0.0.1:4173`). Then capture three states:

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=/tmp/portfolio-check && mkdir -p $OUT
for s in "p=0&theme=light" "p=1&theme=dark" "p=1.5&theme=dark" "p=3&theme=light"; do
  "$CHROME" --headless=new --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
    --window-size=1440,900 --virtual-time-budget=12000 \
    --screenshot="$OUT/${s//[&=]/_}.png" "http://127.0.0.1:4173/?scene=full&$s"
done
ls $OUT
```

Open each PNG with the Read tool. Expected:
- `p_0_theme_light.png`: the name on the left and a black pebble on the right over a warm glow.
- `p_1_theme_dark.png`: a glossy black e-reader on the left showing the ESNIDSaaS paper with its title fully visible, the ESNIDSaaS text on the right, and blue light-bars behind.
- `p_1.5_theme_dark.png`: transparent rippled glass mid-spin, with no picture.
- `p_3_theme_light.png`: a black laptop on the left with a graphite "Screenshot coming / Mizuhada Group" screen, and the Mizuhada text on the right.

If an object or picture is misplaced, compare it against the prototype at the same `?p=` before changing constants. Stop the preview server.

- [ ] **Step 12: Commit**

```bash
git add src
git commit -m "feat: mount the lazy-loaded scene with static fallback and context-loss recovery" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Build checks and capture scripts

**Files:**
- Create: `scripts/check-size.mjs`, `scripts/report-placeholders.mjs`, `scripts/capture.mjs`
- Create (generated): `public/fallback/{0..6}-{light,dark}.webp`
- Modify: `package.json` (scripts), `.gitignore` (add `review/`)

**Interfaces:**
- Consumes:
  - `dist/` from `vite build`
  - the `?capture=1&p=&theme=&scene=` URL contract (Task 12)
  - the `.placeholder.` naming (Task 2)
- Produces:
  - `npm run build` fails if the lazy scene chunks exceed 220 KB gzipped, or if three.js reaches the entry chunk.
  - `npm run build` prints any remaining placeholder screenshots.
  - `npm run capture:fallback` writes the 14 fallback stills.
  - `npm run capture:review` writes review screenshots to `review/`.

- [ ] **Step 1: Create scripts/check-size.mjs**

```js
// Fails the build when the lazily loaded scene (three.js + scene code) is over budget,
// or when three.js has leaked into the entry chunk.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const LIMIT = 220 * 1024;
const dist = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const entry = html.match(/<script type="module"[^>]*src="\/(assets\/[^"]+\.js)"/)?.[1];
if (!entry) {
  console.error('check-size: could not find the entry script in dist/index.html');
  process.exit(1);
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
const gz = (file) => gzipSync(readFileSync(new URL(file, dist))).length;
const scripts = readdirSync(new URL('assets/', dist))
  .filter((f) => f.endsWith('.js'))
  .map((f) => `assets/${f}`);
const lazy = scripts.filter((f) => f !== entry);

if (readFileSync(new URL(entry, dist), 'utf8').includes('WebGLRenderer')) {
  console.error('check-size: three.js is in the entry chunk; import the scene only with import()');
  process.exit(1);
}
if (lazy.length === 0) {
  console.error('check-size: no lazy chunk found; the scene must be loaded with import()');
  process.exit(1);
}

console.log(`  ${entry}  ${kb(gz(entry))} gzipped (entry)`);
let total = 0;
for (const file of lazy) {
  const size = gz(file);
  total += size;
  console.log(`  ${file}  ${kb(size)} gzipped`);
}
console.log(`Scene chunk: ${kb(total)} gzipped (limit ${kb(LIMIT)})`);
if (total > LIMIT) {
  console.error('check-size: the scene chunk is over budget');
  process.exit(1);
}
```

- [ ] **Step 2: Create scripts/report-placeholders.mjs**

```js
// Lists screenshots that are still placeholders. Informational: it never fails the build.
import { readFileSync, readdirSync } from 'node:fs';

const dir = new URL('../src/content/', import.meta.url);
const found = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
  const text = readFileSync(new URL(file, dir), 'utf8');
  for (const m of text.matchAll(/['"]([^'"]*\.placeholder\.[a-z]+)['"]/g)) found.push(`${file}: ${m[1]}`);
}

if (found.length === 0) {
  console.log('No placeholder screenshots left.');
} else {
  console.log(`Placeholder screenshots still in use (${found.length}):`);
  for (const line of found) console.log(`  ${line}`);
}
```

- [ ] **Step 3: Create scripts/capture.mjs**

```js
// Headless-Chrome captures against a running `npm run preview` (http://127.0.0.1:4173).
//   node scripts/capture.mjs fallback  → public/fallback/<state>-<theme>.webp (commit these)
//   node scripts/capture.mjs review    → review/<size>-<theme>-p<state>.png (for manual review, git-ignored)
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173/';
const STATES = 7;
const THEMES = ['light', 'dark'];
const path = (rel) => fileURLToPath(new URL(rel, import.meta.url));

function shot(url, out, [w, h]) {
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      `--window-size=${w},${h}`,
      '--virtual-time-budget=15000',
      `--screenshot=${out}`,
      url,
    ],
    { stdio: 'ignore' },
  );
}

const mode = process.argv[2];

if (mode === 'fallback') {
  const outDir = path('../public/fallback/');
  const tmp = path('../review/tmp/');
  mkdirSync(outDir, { recursive: true });
  mkdirSync(tmp, { recursive: true });
  for (const theme of THEMES) {
    for (let s = 0; s < STATES; s++) {
      const png = `${tmp}${s}-${theme}.png`;
      shot(`${BASE}?capture=1&scene=full&p=${s}&theme=${theme}`, png, [900, 900]);
      await sharp(png).resize(720, 720).webp({ quality: 82 }).toFile(`${outDir}${s}-${theme}.webp`);
      console.log(`public/fallback/${s}-${theme}.webp`);
    }
  }
  rmSync(tmp, { recursive: true, force: true });
} else if (mode === 'review') {
  const outDir = path('../review/');
  mkdirSync(outDir, { recursive: true });
  const sizes = [
    ['desktop', [1440, 900], 'scene=full&'],
    ['mobile', [390, 844], ''],
  ];
  for (const [name, size, query] of sizes) {
    for (const theme of THEMES) {
      for (let s = 0; s < STATES; s++) {
        shot(`${BASE}?${query}p=${s}&theme=${theme}`, `${outDir}${name}-${theme}-p${s}.png`, size);
        console.log(`review/${name}-${theme}-p${s}.png`);
      }
    }
  }
} else {
  console.error('Usage: node scripts/capture.mjs <fallback|review>');
  process.exit(1);
}
```

- [ ] **Step 4: Update package.json scripts and .gitignore**

Set the `scripts` block of `package.json` to:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build && node scripts/check-size.mjs && node scripts/report-placeholders.mjs",
    "preview": "vite preview --host 127.0.0.1 --port 4173 --strictPort",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "capture:fallback": "node scripts/capture.mjs fallback",
    "capture:review": "node scripts/capture.mjs review"
  }
```

Append to `.gitignore`:

```
review/
```

- [ ] **Step 5: Run the build with the checks**

Run: `npm run build`
Expected:
- Vite builds.
- `check-size` prints the entry chunk, then `Scene chunk: … KB gzipped (limit 220.0 KB)`. The total should be about 130–170 KB.
- The placeholder report lists `featured.ts: /shots/ma-zerophish.placeholder.webp`, `featured.ts: /shots/mizuhada.placeholder.webp` and `featured.ts: /shots/acklab.placeholder.webp`.
- The exit code is 0.

If the scene chunk is over budget, check the output for a second copy of three.js (for example, `three/webgpu` pulled in by an addon import). Fix the import rather than raising the limit.

- [ ] **Step 6: Generate the fallback stills**

Start `npm run preview` in the background. Then run: `npm run capture:fallback`
Expected: 14 lines, from `public/fallback/0-light.webp` through `public/fallback/6-dark.webp`.

Open `public/fallback/1-dark.webp` and `public/fallback/4-light.webp` with the Read tool. Expected: a centred, formed black e-reader (ESNIDSaaS page) and a frame (Baka mockup), each over its glow.

- [ ] **Step 7: Check that the fallback is used when the scene is off**

Run (preview still running):

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --window-size=1440,900 --virtual-time-budget=8000 --screenshot=/tmp/portfolio-static.png "http://127.0.0.1:4173/?scene=static&p=1&theme=dark"
```

Open `/tmp/portfolio-static.png`. Expected: the e-reader still, softly masked, on the left of the ESNIDSaaS text. Then stop the preview server.

- [ ] **Step 8: Commit**

```bash
git add scripts package.json .gitignore public/fallback
git commit -m "build: add scene size budget, placeholder report and fallback capture" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Final verification, README and push

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: everything.
- Produces: a verified `main` branch pushed to `origin`, ready for Vercel. Vercel's Vite preset needs no config: build command `npm run build`, output `dist`.

- [ ] **Step 1: Create README.md**

````markdown
# Supakorn Prayongyam: portfolio

Single-page portfolio. One 3D object sets into a device for each CV item and melts into liquid glass between them. Design spec: `docs/superpowers/specs/2026-10-16-portfolio-liquid-objects-design.md`.

## Commands

```bash
npm run dev               # local dev server
npm test                  # unit, component and content checks
npm run build             # typecheck, build, scene size budget, placeholder report
npm run preview           # serve dist/ at http://127.0.0.1:4173
npm run capture:fallback  # with preview running: regenerate public/fallback stills
npm run capture:review    # with preview running: screenshots of every state into review/
```

Preview any state with URL parameters: `?p=3&theme=dark`, plus `&scene=full|lite|static` to force a renderer.

## Replacing a placeholder screenshot

1. Put the image in `public/shots/`, for example `acklab.webp`.
2. In `src/content/featured.ts`, change the item's `pics` to `[{ src: '/shots/acklab.webp' }]`. Add `focus: [x, y]` (0–1, from the top-left) if the important part is off-centre.
3. Run `npm test`. The content checks confirm the file exists.
4. Run `npm run build`, start `npm run preview`, then run `npm run capture:fallback` and commit the new stills.

The Mizuhada screen must be a mock or a blurred UI, with no real company data and no internal product names. An item with exactly two pictures is shown as an open book, one picture per page.
````

- [ ] **Step 2: Run everything from clean**

```bash
rm -rf dist node_modules && npm ci && npm test && npm run build
```

Expected: tests all pass, the build passes the size check, and the placeholder report lists the three remaining placeholders.

- [ ] **Step 3: Review screenshots**

Start `npm run preview` in the background, then run `npm run capture:review`. Open the review images with the Read tool and check each list.

Desktop (`review/desktop-*`):
- Text and object never overlap.
- The object alternates sides opposite the text.
- p0–p5 show formed black objects with their pictures.
- p6 shows the small sphere beside the project list.
- Both themes look right.

Mobile (`review/mobile-*`):
- The object sits in the top half and the text sits below it.
- Nothing is cut off horizontally.
- The top bar shows the name and the toggle only.

Stop the preview server.

- [ ] **Step 4: Manual device check (owner)**

Ask the owner to run `npm run dev -- --host` and to scroll the full page on a phone, a laptop and a desktop. Watch for:
- frame rate
- melt smoothness
- the scene fading out as More projects arrives
- the theme toggle
- keyboard focus rings on links

Note any problems as follow-up tasks; do not change scope here.

- [ ] **Step 5: Commit and push**

```bash
git add README.md
git commit -m "docs: add README with commands and screenshot workflow" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

Expected: the push succeeds to `https://github.com/SupaOhm/SupaOhm2.0.git`.

---

## Spec coverage

| Spec section | Task |
|---|---|
| §2 Non-goals: no product name, no phone number, no availability claim | 2 (content + checks), Global Constraints |
| §3 Page structure, CV order, headings, About, Contact, top bar | 2, 4 |
| §4 Type, themes, palettes, layout | 1, 4, 9 |
| §5 States, DOM progress, smoothing, step timing, formed/melt, objects, book rule, background | 5, 6, 7, 8, 9, 10, 11 |
| §6 Architecture units | file map; 2–12 |
| §7 Full/lite/narrow/static/reduced motion/performance | 3, 4, 7, 9, 11, 12, 13 |
| §8 Errors: WebGL failure, context loss, image failure, placeholder, short viewports, localStorage | 3, 7, 10, 12 |
| §9 Tests: unit, content, component, visual capture, manual | 2–13, 14 |
| §10 Owner assets | 2 (ESNIDSaaS crop, Baka), README workflow |
