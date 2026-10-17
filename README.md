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
npm run capture:sections  # with preview running: scrolled shots of the project wall, About and Contact into review/
npm run capture:meta      # after capture:fallback: link-preview image and icons into public/
```

`scripts/capture.mjs` reads `CHROME` (path to the Chrome binary; default is the macOS path) and `BASE_URL` (default `http://127.0.0.1:4173/`).

Preview any state with URL parameters: `?p=3&theme=dark`, plus `&scene=full|lite|static` to force a renderer.

## Replacing a placeholder screenshot

1. Put the image in `public/shots/`, for example `acklab.webp`.
2. In `src/content/featured.ts`, change the item's `pics` to `[{ src: '/shots/acklab.webp' }]`. Add `focus: [x, y]` (0–1, from the top-left) if the important part is off-centre.
3. Run `npm test`. The content checks confirm the file exists.
4. Run `npm run build`, start `npm run preview`, then run `npm run capture:fallback` and commit the new stills.

The Mizuhada screen must be a mock or a blurred UI, with no real company data and no internal product names. An item with exactly two pictures is shown as an open book, one picture per page.

The contact chat's questions and answers live in `src/content/chat.ts`.

## Deploy

Vercel's Vite preset works as-is: build command `npm run build`, output directory `dist`.

`VITE_SITE_URL` in `.env` is the live address. `index.html` uses it for the canonical link and the link-preview tags, which need an absolute image URL. Change it if the site is served from another address.
