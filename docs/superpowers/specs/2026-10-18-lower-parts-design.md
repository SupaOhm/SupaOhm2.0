# Lower parts: project wall, sideways About, phone chat

Date: 2026-10-18. Builds on `2026-10-16-portfolio-liquid-objects-design.md`.

## 1. Goal

Everything after AckLab reads as a plain document once the 3D scene fades. Make the project list, About and Contact as interesting as the object sections above them, and fix the object running over the part headings.

Chosen in brainstorming (visual companion):

- Projects: **a wall of names with a cursor card** (B).
- About: **a pinned section that scrolls sideways** (A3).
- Contact: **the phone returns with a chat you can poke** (F1), drawn as **HTML on top** of the 3D phone.
- The projects sphere is **dropped**; the wall is full width.
- Part headings: **the object melts down** while a heading passes.

## 2. Global constraints (unchanged, still binding)

- The internal Mizuhada product name never appears anywhere (code, content, docs, commits, file names). Describe it only as "an enterprise multi-agent RAG assistant". `tests/content.test.ts` matches it by SHA-256 only.
- No phone number anywhere. Matched by hash only.
- No availability or "open to work" claim.
- three is loaded only via the dynamic `import('../scene/createScene')`; the scene chunk stays under the existing size budget. No new runtime dependencies.
- Text and contact details never depend on WebGL.

## 3. Page flow and scene states

| Anchor | Section | Object |
|---|---|---|
| 0 | Hero | pebble |
| 1 | Best Paper | frame |
| 2 | Experience: Mizuhada | laptop |
| 3 | Experience: Baka | frame |
| 4 | Research: ESNIDSaaS | reader |
| 5 | Research: MA-ZeroPhish | phone |
| 6 | Projects: AckLab | tablet |
| — | Project wall (all 10 projects) | scene fades out (`data-scene-exit`) |
| — | About, sideways | hidden |
| 7 | Contact | **phone**, `pics: []` (dark glass), scene fades back in (`data-scene-return`) |

- `STATE_COUNT` stays 8. `SCENE_ITEMS[7]` becomes `{ kind: 'phone', pics: [], label: 'Say hello.', slot: true }`; the sphere state and `ProjectRows` go. `slot: true` marks a state whose screen the page draws.
- Palette entry 7 reuses the hero pair (dark `#E8C9A0/#1F4A5A`, light `#B98450/#F1DFC8`), as today.
- Contact keeps `data-side={sideFor(7)}` (`'right'`) so anchor sides still alternate, but its layout ignores it: the phone's position comes from the slot (3.3), with text on the left and the phone on the right on wide screens.
- The tablet→phone morph completes while the scene is hidden, so the phone arrives formed.

### 3.1 Exit and return

`ScrollSample` gains nothing new in shape: `exit` becomes a window instead of a one-way ramp. `exit = exitFade(y, exitTop, vh) * (1 - exitFade(y, returnTop, vh))`, where `returnTop` is the top of `[data-scene-return]` (Infinity when absent). `SceneLayer` keeps using `1 - exit` for opacity and `exit < 1` for `setActive`.

### 3.2 Part-heading dip (overlap fix)

Each `.part` gets `data-scene-dip`. `useScrollProgress` measures their centres and reports `dip` (0..1): `dipAmount(y, centres, vh) = max over centres of clamp01(1 - |y - c| / (vh * 0.45))`, eased with smoothstep. `ScrollSample` becomes `{ p, exit, dip }`.

`SceneHandle` gains `setDip(d: number)`. The scene multiplies the object's scale by `1 - 0.82 * d`, so it shrinks to an ~18% droplet while a heading is centred, then re-forms. With reduced motion, the dip is applied without springs (instant). Static mode ignores it.

### 3.3 The phone slot

Contact contains `[data-phone-slot]`, a phone-shaped box in normal flow (aspect 9:19.5, width `clamp(220px, 22vw, 300px)`; centred below the text on narrow screens). `PhoneChat` lives inside it.

When `p` is within 0.5 of 7 and the scene is visible, the scene reads the slot's viewport rect each frame (passed in from `SceneLayer` via `setSlot(rect | null)`) and places and scales the phone so its screen fills the slot exactly. It settles front-facing with no rotation; the arrival can spin, and the chat fades in (opacity 0 to 1 over 300 ms) once the phone has settled (`onSettled` callback, or immediately with reduced motion).

The scene reports `onSlotChange(on)`; `SceneLayer` mirrors it onto the slot as `data-scene`:

- no attribute while the scene is not `ready` (static, loading, lost context): the slot draws a CSS phone bezel around the chat;
- `arriving` while the scene is ready but the phone has not settled: the slot is invisible (the 3D phone is on its way);
- `on` once the phone has settled over the slot: no CSS bezel, and the chat sits on a translucent dark layer over the 3D glass.

The slot is the phone's *screen* rect (aspect 1440 / 3013, the 3D screen plane's), and the CSS bezel is drawn outside it.

## 4. Components

### 4.1 `ProjectWall` (replaces `ProjectRows` and `MoreProjects`)

- Content: `projects.ts` exports one `projects: Project[]`, `Project = { name; line; tech?; href? }`, 10 entries. FastForm, Full-Stack Expense Tracker and Lost and Found Management System first (with their `tech`), then the seven from More projects. `ProjectRow` and `MoreProject` types go.
- Section: `section.wall#project-list`, `data-scene-exit`, `aria-label="All projects"`. A `ul` of names, `clamp(40px, 6vw, 96px)`, weight 800, letter-spacing -0.045em, colour `var(--faint)` (new token: light `#c7c7cc`, dark `#3a3a3c`, defined in all three theme blocks); the active name turns `var(--ink)`.
- Each name is an `<a>` (with `href`, `target="_blank"`, `rel="noreferrer"`) or a `<button>` (no `href`), with `aria-describedby` pointing at its card text.
- Fine pointer (`(hover: hover) and (pointer: fine)`): one card in inverted colours (`var(--ink)` background, `var(--bg)` text, so it is dark in light mode and light in dark mode; radius 12, max-width 280) follows the pointer, offset 18 px, lagged by a critically damped spring. It shows the line, the tech and "Opens GitHub" when there is an `href`. Hidden when no name is active.
- Touch and narrow screens: tapping a name toggles the same card inline beneath it (one open at a time). A name with `href` opens on a second tap, or via the card's "GitHub" link.
- Keyboard focus shows the card pinned beside the focused name (no pointer tracking).
- Reduced motion: no spring; the card is pinned beside the active name.

### 4.2 `AboutRail` (replaces `AboutBlock`)

- Four panels in order: Education (school, degree, detail, coursework, languages), Honors, Skills (grouped), Leadership and activities. Same `about.ts` data.
- Wide screens (`min-width: 800px`, no reduced motion): `section.about#about` is `4 × 100vh` tall with a sticky inner (`top: 0; height: 100vh`). The "About" title is pinned top-left; a track of four panels (each `min(72vw, 880px)` wide) translates on X by `-progress * (trackWidth - viewportWidth + padding)`, where progress is how far the section has scrolled through its sticky range. Transform only; set in a rAF from scroll.
- Narrow screens: no pinning. The track is `overflow-x: auto` with `scroll-snap-type: x mandatory`, `tabindex="0"`, `aria-label="About, scroll sideways"`, plus four position dots (decorative, `aria-hidden`).
- Reduced motion (any width): the panels stack vertically.
- All panels stay in the DOM in reading order.

### 4.3 `Contact` with `PhoneChat`

- Left: `h2.part-title` "Say hello.", the email link, GitHub and LinkedIn (unchanged). These stay visible regardless of the chat.
- Right: `[data-phone-slot]` containing `PhoneChat`.
- `PhoneChat`: a header "Supakorn", a thread `div[role=log][aria-live=polite]`, and a chip row.
  - Starts with one bubble: "Hi, I'm Supakorn. Tap a question 👇".
  - Shows at most 3 unused chips at a time, in script order.
  - Tapping a chip appends the question (right, blue) and, after ~800 ms of typing dots, the answer bubbles (left, grey) and its link bubbles. With reduced motion there are no dots and no delay.
  - The used chip disappears; the next unused one slides in. Focus moves to the first remaining chip.
  - When all are used, one chip remains: "Start over", which resets the thread.
  - The thread scrolls to the newest bubble inside the phone screen.

## 5. Chat script (`src/content/chat.ts`)

`ChatTopic = { ask: string; answer: string; links: Link[] }`.

| Chip | Answer | Links |
|---|---|---|
| What are you working on? | Phishing detection by a team of AI agents. Five specialists each read one part of a suspicious message, and a Judge makes the call. | MA-ZeroPhish → `#ma-zerophish` |
| What won Best Paper? | ESNIDSaaS, intrusion detection as a cloud service, built on Kafka and Spark. It won at IEEE IMC 2026 in Fukuoka. | Read about the research → `#esnidsaas` |
| What did you build as an intern? | An enterprise multi-agent RAG assistant. Document lookups went from about 55 seconds to under 5. | Mizuhada → `#mizuhada` |
| What do you like building? | AI systems, security tools, and the distributed plumbing under both. Mostly Python and TypeScript. | — |
| Where are you? | Pathum Thani, Thailand. Fourth year of computer engineering at SIIT, graduating June 2027. | — |
| How do I reach you? | Email is best: ohm.supakornth@gmail.com | Email, GitHub, LinkedIn (from `profile`) |

The email and links in the last answer come from `profile`, not repeated literals.

## 6. Fallbacks

- Static / no WebGL: stills 0..7. Still 7 is the background glow only: in capture mode a `slot` state hides its object, because the page's CSS phone stands in for it. Regenerate with `npm run capture:fallback`. Dip and return have no effect. The CSS bezel shows around the chat.
- `?p=7` jumps to Contact.
- Lite scene: same behaviour; the dip is a scale only.
- Context loss: the slot falls back to the CSS bezel while the scene is not `ready`.

## 7. Accessibility

- Wall: real links and buttons, `aria-describedby` to the card text, visible focus.
- About: reading order preserved; the narrow track is focusable and arrow-key scrollable.
- Chat: buttons for chips, `role="log"` with polite live updates, focus kept on the chip row.
- Reduced motion: no typing dots, no following card, About stacks, the dip is instant, and the phone does not spin on arrival.

## 8. Testing

- `progress.test.ts`: `dipAmount` is 1 at a heading centre, 0 beyond `0.45 vh`; the exit window is 0 before the wall, 1 between wall and Contact, 0 at Contact.
- `ProjectWall.test.tsx`: 10 names in order; focus and tap show the card with line and tech; only entries with `href` render as links.
- `AboutRail.test.tsx`: four panels in order; reduced motion renders the stacked layout.
- `PhoneChat.test.tsx`: opening bubble and 3 chips; tapping a chip adds the question and (with fake timers) the answer, and removes the chip; link bubbles have the right `href`s; "Start over" resets.
- Updated: `App.test.tsx` (sections and headings), anchors still `'0'..'7'` alternating, `sceneItems.test.ts` (last kind `'phone'`), `createScene.test.ts` (`setDip` and `setSlot` exist), `content.test.ts` (covers `chat.ts` and the merged `projects`; forbidden name and phone number by hash).
- Visual: `capture:review` plus a scroll capture of the wall, About and Contact at 1440×900 and 390×844 in both themes; every shot checked before the work is called done.

## 9. Out of scope

New object kinds, an LLM behind the chat, sending messages from the site, and changes above AckLab other than the part-heading dip.
