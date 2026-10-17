# Portfolio: Liquid Objects — Design Spec

Date: 2026-10-16
Owner: Supakorn Prayongyam
Status: Approved in brainstorming, pending written-spec review

## 1. Goal

A single-page personal portfolio for a mixed audience (recruiters, peers, researchers) that feels premium and Apple-like, with one memorable 3D moment: a single object that sets into a solid glossy-black real-world device per CV item, showing that item's screenshot, and melts into transparent liquid glass between items.

The approved reference prototype is `.superpowers/brainstorm/proto-liquid.html`. Preview a state with `?p=<progress>&theme=<light|dark>`.

## 2. Non-goals

- No case-study pages. Featured items carry plain links only.
- No availability or "open to work" claim.
- No phone number on the public site.
- The internal product name of the Mizuhada assistant must not appear anywhere in the repository: copy, code, file names, alt text, comments, docs or commit messages. It is described only as "an enterprise multi-agent RAG assistant". `.superpowers/` (brainstorm prototypes) is never committed and is git-ignored.
- No CMS. Content lives in a typed data file.

## 3. Page structure

| # | Section | Object | Content |
|---|---------|--------|---------|
| 0 | Hero | pebble | Name, very large. One line: "Computer engineering student at SIIT, Thammasat. I build AI systems, security tooling, and the distributed infrastructure under both." |
| 1 | Best Paper | e-reader | The award (IEEE IMC 2026, at CISOSE 2026 in Fukuoka), one line on ESNIDSaaS, and a link to its full entry in Research. The e-reader shows the paper. |
| 2 | Experience: AI Developer Intern, Mizuhada Group (Jun–Jul 2026) | laptop | "Built an enterprise multi-agent RAG assistant for company knowledge and live warehouse inventory." Public facts only: document lookup time down 91.3% (54.54 s to 4.728 s), 100% source matching in evaluation, warehouse access restricted to 12 read-only query tools. The screen shows a mock or blurred UI that the owner supplies, never real company data. |
| 3 | Experience: UX/UI Research & Design Intern, Baka Co. (Aug 2025 onward) | frame | Baka Index redesign of a farming analytics platform on Google Earth Engine, from stakeholder research to high-fidelity mockups. |
| – | Research: ESNIDSaaS | none (text only) | Best Paper Award, IEEE IMC 2026 (CISOSE 2026, Fukuoka). Cloud-native multi-tenant intrusion detection: Kafka ingestion, Spark Structured Streaming, hybrid detection. 0.9557 accuracy on CIC-IDS2017. |
| 4 | Research: MA-ZeroPhish | phone | Ongoing research at SIIT. Five specialist agents plus a Moderator and a Judge, for zero-day phishing detection. |
| 5 | Projects: AckLab | tablet | An interactive networking learning platform. GitHub link. |
| 6 | Projects list, More projects | sphere (small) | The sphere sits beside the project list, then fades out as the More projects list begins, so no list text sits under it. More projects, About and Contact have no 3D. See below. |

Each part (Experience, Research, Projects, About, Contact) opens with a large heading in plain words, never an all-caps eyebrow label, followed by one plain line describing the part. Experience comes before Research. Only a short Best Paper section, with the e-reader, sits above it; the full ESNIDSaaS entry is text only in Research, so the paper appears once in 3D (owner decision, 2026-10-17).

**Projects list** (compact rows: name, one line, tech, GitHub link): FastForm, Full-Stack Expense Tracker, Lost and Found Management System.

**More projects** (smaller list): NoSleep CLI, RevRace, DressMe, Salary Trend Regression, Online Shop Database, HCI Bus Routing, Binary Matching Arduino Game. Voke is excluded.

**About block:**
- Honors: Best Paper, IEEE IMC 2026.
- Education: SIIT, Thammasat University, B.Eng. Computer Engineering, 4th year, GPA 3.24, expected June 2027, with relevant coursework.
- Skills, grouped as on the CV.
- Leadership and activities: SIIT CPE First Meet Staff (2025), TU Freshy Games (2023).
- Languages: Thai (native), English (TU-GET CBT 90, 2024).

**Contact:** "Say hello." Email (ohm.supakornth@gmail.com), GitHub (SupaOhm), LinkedIn (supakornpra).

**Persistent UI:** a top bar with the name and anchors (Research, Experience, Projects, About, Contact), plus a light/dark toggle that defaults to the system preference.

**Content source:** the latest CV wording from the owner's knowledge-base export (synced 2026-10-16). Where the CV is silent, older portfolio text is used. No status badges are shown.

## 4. Visual system

- **Type:** Inter Tight, self-hosted as woff2 (weights 500, 600 and 800). No Google Fonts request. Headings use weight 800 with -0.035em tracking (tighter tracking merges "rn" into "m"). Hero size clamp(64px, 10vw, 164px). Section titles clamp(48px, 6vw, 96px). Body 19px/1.5, weight 500.
- **Themes:**
  - Light: background `#F5F5F7`, ink `#1D1D1F`, dim `#515154` (darkened from `#6E6E73` for WCAG AA contrast over the colour wash).
  - Dark: background `#000000`, ink `#F5F5F7`, dim `#A1A1A6`.
- **Per-section light colours:** each section has a glow/bar colour and a wash colour, blended during transitions. Light and dark palettes are taken from the prototype's `PAL`.
- **Layout:** text sections are about 130vh tall and scroll normally (never sticky). Text alternates left and right, and the object sits on the opposite side.

## 5. Scene behaviour

- **States:** N = 7 object states, in order: pebble (hero), e-reader (Best Paper), laptop, frame, phone, tablet, sphere (Projects list).
- **Progress:** measured from the DOM, not from a uniform section height. Each state k has an anchor element (the hero, the five featured sections, and the Projects heading). `c_k` is the anchor's vertical centre in page coordinates. With `y = scrollY + innerHeight/2`, `p = k + (y - c_k) / (c_{k+1} - c_k)` for `c_k ≤ y < c_{k+1}`, clamped to [0, N-1]. Anchors are re-measured on resize and when fonts or images finish loading.
- **Smoothing:** frame-rate independent damping, `p_s += (p - p_s) · (1 - exp(-dt · 3))` with dt in seconds. The springs (position and swell) also integrate with dt.
- **Step timing:** within the step from k to k+1, with `g = clamp((f - 0.2) / 0.6)`:
  - the first 20% holds object k
  - the middle 60% melts (object k → liquid blob → object k+1)
  - the last 20% holds object k+1
- **Formed state:**
  - Solid glossy black: colour `#141416`, metalness 0.35, roughness 0.16, clearcoat 1, envMapIntensity 1.3.
  - Rigid. Only a slow sway and mouse tilt.
  - The screenshot sits on a plane slightly in front of the screen face. It uses cover-fit with an optional crop focus per picture, and appears only once the object has set (shape weight above 0.82).
- **Melt:**
  - Transmission goes to 1, and the material becomes clear glass (ior 1.38, dispersion 7).
  - Vertex ripples (amplitude 0.28) and a twist.
  - A full spin.
  - A swell (+20%) driven by a spring, with an overshoot as it settles.
  - Camera push-in (−1.1).
  - A position spring that swings the object to the opposite side.
- **Objects:** all are morph targets of one geometry (an icosahedron, detail 80, with merged vertices), mapped from unit directions: pebble, e-reader, phone, laptop (screen plus base hinged), frame (recessed centre), tablet, sphere, plus the liquid blob.
- **Book rule:** an item with exactly two pictures uses the open book (two pages in a shallow V), one picture per page. Otherwise the declared object is used. No current item has two pictures.
- **Background:** an opaque shader plane behind the object, with a soft glow and thin light-bars centred on the object, so the glass has something to refract.

## 6. Architecture

Vite + React 19 + TypeScript, with three.js (r170) used imperatively. No React Three Fiber. Deployed to Vercel.

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `src/content/` | Typed data for profile, research, experience, projects, more projects and about. The single source of text, links and image paths. | nothing |
| `src/scene/` | A framework-free three.js module. `createScene(canvas, items, { lite })` returns `{ setProgress(p), setTheme(t), dispose() }`. Contains `objects/*.ts`, one file per object, each holding its shape builder, picture planes and resting angle; plus `material.ts` (glass↔black blend and liquid shader patch), `background.ts`, `pictures.ts` (cover-fit planes) and `springs.ts`. | the item list derived from content |
| `src/scroll/` | A `useScrollProgress()` hook (scroll to p) and `usePrefersReducedMotion()`. | DOM |
| `src/ui/` | TopBar, ThemeToggle, Hero, FeatureSection, ProjectRows, MoreProjects, AboutBlock, Contact. Presentational only. | content |
| `src/app/` | Mounts the canvas, feeds p and the theme into the scene, picks full, lite or static, and lazy-loads the scene chunk. | all |

Screenshots live in `public/shots/`. Placeholders are explicitly named `*.placeholder.webp`.

## 7. Adaptive rendering

- **Full scene:** viewport at least 800px wide and a capable GPU (WebGL2, not a low-end renderer).
- **Lite scene:** narrow or weak devices. Same objects and melt, lower geometry detail, no transmission (a cheap fresnel liquid shader instead), no light-bars.
- **Narrow layout (under 800px):** each featured section reserves the top 55vh as empty space for the object, with its text below. The object is centred in the top 55% of the viewport, so text never overlaps it while its section is centred.
- **Static fallback:** shown while loading, on WebGL failure, or on an unrecoverable context loss. It is a pre-rendered image of each formed object with its screenshot, one per object per theme (`public/fallback/<state>-<light|dark>.webp`). The headless-Chrome capture script (§9) produces them from the full scene, they are committed to the repo, and they are regenerated whenever a screenshot changes.
- **Reduced motion:** no melt, spin or springs. Objects crossfade.
- **Performance:**
  - the scene chunk loads after the first paint
  - the scene chunk (three.js plus scene code) is at most 220 KB gzipped, checked at build time
  - the render loop pauses when the tab is hidden or the canvas is offscreen
  - pixel ratio is capped at 2

## 8. Errors and edge cases

- **WebGL creation fails:** use the static fallback and log once.
- **Context lost:** pause, rebuild on restore, otherwise fall back to static.
- **A screenshot fails to load:** show a graphite panel with the item name. The page is otherwise unaffected.
- **A placeholder screenshot:** show a visible "screenshot coming" tile. A build-time script lists any remaining placeholders.
- **Short viewports:** the object scales to fit.
- **localStorage blocked:** use the system theme. Every access is wrapped in try/catch.

## 9. Testing

- **Unit tests (Vitest):**
  - progress mapping (p, step index, hold/melt weights, side)
  - shape builders (finite values, bounds, continuity at the laptop hinge and book spine)
  - the book rule
  - cover-fit crop maths
- **Content checks:** valid links; no occurrence of the internal product name anywhere in the repository (matched by hash, so the test never contains the name); no phone number; a placeholder report.
- **Component tests (Testing Library):**
  - the theme toggle and its system default
  - CV section order
  - the reduced-motion path
  - the static fallback when WebGL creation throws
- **Visual review:** a headless-Chrome script captures `?p=` states in both themes at desktop and mobile widths, for manual review. No pixel diffs.
- **Manual check before deploy:** scroll the full page on a phone, a laptop and a desktop, watching frame rate and melt smoothness.

## 10. Owner-supplied assets

| Item | Needed | Notes |
|------|--------|-------|
| Mizuhada (laptop) | Mock or blurred UI screenshot | Must contain no real company data or the internal product name |
| MA-ZeroPhish (phone) | Portrait screenshot or diagram | |
| AckLab (tablet) | Landscape screenshot | Public repo |
| ESNIDSaaS (e-reader) | Optional re-crop of the paper image | The current file has black side bars, and the crop focus must keep the title visible |
| Baka (frame) | Existing `baka.webp` | Approved as-is |
