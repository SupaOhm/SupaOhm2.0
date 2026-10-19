// Headless-Chrome captures, driven over the DevTools protocol, against a running `npm run preview`.
//   node scripts/capture.mjs fallback  → public/fallback/<state>-<theme>.webp (commit these)
//   node scripts/capture.mjs review    → review/<size>-<theme>-p<state>.png and review/desktop-static-p1.png
//                                        (manual review, git-ignored)
//   node scripts/capture.mjs meta      → public/og.png, public/favicon-32.png, public/apple-touch-icon.png
//                                        (run after fallback: they are cut from the hero pebble still)
//   node scripts/capture.mjs sections  → review/sections-<size>-<theme>-<label>.png (scrolled views of the lower parts)
//   node scripts/capture.mjs strip     → review/strip-mobile-<theme>-NN.png and -sheet-N.png (the narrow page a half
//                                        screen at a time, to check that no copy runs over the object)
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173/';
const PORT = 9333;
const STATES = 8;
const THEMES = ['light', 'dark'];
const SETTLE_MS = 4000; // fonts, textures and the first frames (the scene snaps under ?p=)
const path = (rel) => fileURLToPath(new URL(rel, import.meta.url));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), 'capture-'));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return { chrome, profile };
    } catch {
      // not listening yet
    }
    await sleep(100);
  }
  chrome.kill();
  throw new Error(`Chrome did not open its debugging port (CHROME=${CHROME})`);
}

/** A page target and a send(method, params) that resolves with the protocol result. */
async function openPage() {
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let nextId = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    const call = pending.get(msg.id);
    if (!call) return;
    pending.delete(msg.id);
    if (msg.error) call.reject(new Error(msg.error.message));
    else call.resolve(msg.result);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  return { send, close: () => ws.close() };
}

async function shot(page, url, [width, height], mobile, out) {
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  await page.send('Page.navigate', { url });
  await sleep(SETTLE_MS);
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(out, Buffer.from(data, 'base64'));
}

const dataUri = (rel, type) => `data:${type};base64,${readFileSync(path(rel)).toString('base64')}`;

/** The link-preview card: the hero name and line beside the pebble, 1200 × 630. */
function ogHtml() {
  const font = dataUri('../node_modules/@fontsource/inter-tight/files/inter-tight-latin-800-normal.woff2', 'font/woff2');
  const font600 = dataUri('../node_modules/@fontsource/inter-tight/files/inter-tight-latin-600-normal.woff2', 'font/woff2');
  const pebble = dataUri('../public/fallback/0-light.webp', 'image/webp');
  return `<!doctype html><html><head><style>
    @font-face { font-family: 'Inter Tight'; font-weight: 800; src: url(${font}) format('woff2'); }
    @font-face { font-family: 'Inter Tight'; font-weight: 600; src: url(${font600}) format('woff2'); }
    html, body { margin: 0; width: 1200px; height: 630px; overflow: hidden; background: #f5f5f7; }
    body { font-family: 'Inter Tight', sans-serif; color: #1d1d1f; letter-spacing: -0.01em; }
    img { position: absolute; right: -40px; top: 15px; width: 600px; height: 600px;
      -webkit-mask-image: radial-gradient(closest-side, #000 72%, transparent); }
    .copy { position: absolute; left: 80px; top: 0; bottom: 0; width: 640px; display: flex; flex-direction: column; justify-content: center; }
    h1 { margin: 0; font-size: 116px; line-height: 0.86; font-weight: 800; letter-spacing: -0.035em; }
    p { margin: 34px 0 0; font-size: 27px; line-height: 1.35; font-weight: 600; color: #515154; }
    strong { color: #1d1d1f; }
  </style></head><body>
    <img src="${pebble}" alt="">
    <div class="copy">
      <h1>Supakorn<br>Prayongyam</h1>
      <p>Computer engineering student at SIIT, Thammasat. AI systems, security tooling and distributed infrastructure.</p>
      <p><strong>Best Paper Award, IEEE IMC 2026</strong></p>
    </div>
  </body></html>`;
}

/** Scrolls so that the page-space y given by `expr` (a JS expression) is the top of the viewport. */
const scrollTo = (page, expr) =>
  page.send('Runtime.evaluate', { expression: `window.scrollTo({ top: ${expr}, behavior: 'instant' })` });

const aboutAt = (f) =>
  `(() => { const r = document.querySelector('#about').getBoundingClientRect(); return scrollY + r.top + Math.max(0, r.height - innerHeight) * ${f}; })()`;

// scrollY at which the contact phone's arrival is f (0..1): arrive = (scrollY + vh - contactTop) / vh
const contactAt = (f) =>
  `scrollY + document.querySelector('#contact').getBoundingClientRect().top - innerHeight * ${1 - f}`;

// the lower parts, in page order; each run() leaves the page ready for a screenshot after `wait` ms (default 1500)
const SECTION_SHOTS = [
  {
    label: 'projects-heading',
    wait: 3000,
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
  { label: 'contact-roll', wait: 3000, run: (page) => scrollTo(page, contactAt(0.3)) },
  { label: 'contact-lock', wait: 3000, run: (page) => scrollTo(page, contactAt(0.88)) },
  { label: 'contact', run: (page) => scrollTo(page, 'document.documentElement.scrollHeight') },
  {
    label: 'contact-chat',
    run: (page) => page.send('Runtime.evaluate', { expression: `document.querySelector('.chat-chips button').click()` }),
  },
];

const mode = process.argv[2];
if (!['fallback', 'review', 'meta', 'sections', 'strip'].includes(mode)) {
  console.error('Usage: node scripts/capture.mjs <fallback|review|meta|sections|strip>');
  process.exit(1);
}

if (mode === 'meta') {
  const pub = path('../public/');
  await sharp(`${pub}favicon.svg`, { density: 300 }).resize(32, 32).png().toFile(`${pub}favicon-32.png`);
  console.log('public/favicon-32.png');
  await sharp(`${pub}fallback/0-light.webp`)
    .extract({ left: 145, top: 145, width: 440, height: 440 })
    .resize(180, 180)
    .png()
    .toFile(`${pub}apple-touch-icon.png`);
  console.log('public/apple-touch-icon.png');
}

const { chrome, profile } = await launchChrome();
try {
  const page = await openPage();
  if (mode === 'fallback') {
    const outDir = path('../public/fallback/');
    mkdirSync(outDir, { recursive: true });
    for (const theme of THEMES) {
      for (let s = 0; s < STATES; s++) {
        const png = join(profile, `fallback-${s}-${theme}.png`);
        await shot(page, `${BASE}?capture=1&scene=full&p=${s}&theme=${theme}`, [900, 900], false, png);
        await sharp(png).resize(720, 720).webp({ quality: 82 }).toFile(`${outDir}${s}-${theme}.webp`);
        console.log(`public/fallback/${s}-${theme}.webp`);
      }
    }
  } else if (mode === 'meta') {
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
    await page.send('Page.navigate', { url: 'about:blank' });
    await sleep(300);
    const { frameTree } = await page.send('Page.getFrameTree');
    await page.send('Page.setDocumentContent', { frameId: frameTree.frame.id, html: ogHtml() });
    await sleep(1500);
    const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
    await sharp(Buffer.from(data, 'base64')).png({ compressionLevel: 9 }).toFile(path('../public/og.png'));
    console.log('public/og.png');
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
          await sleep(shot.wait ?? 1500); // springs, the dip, the slot settling and the chat's typing
          const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
          const out = `${outDir}sections-${name}-${theme}-${shot.label}.png`;
          writeFileSync(out, Buffer.from(data, 'base64'));
          console.log(`review/sections-${name}-${theme}-${shot.label}.png`);
        }
      }
    }
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
      // half a screen apart, and the last frame lands exactly on the page bottom (the Contact phone)
      const max = result.value;
      const ys = [];
      for (let y = 0; y < max; y += height / 2) ys.push(y);
      ys.push(max);
      for (const y of ys) {
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
  } else {
    const outDir = path('../review/');
    mkdirSync(outDir, { recursive: true });
    const sizes = [
      ['desktop', [1440, 900], false, 'scene=full&'],
      ['mobile', [390, 844], true, ''],
    ];
    for (const [name, size, mobile, query] of sizes) {
      for (const theme of THEMES) {
        for (let s = 0; s < STATES; s++) {
          await shot(page, `${BASE}?${query}p=${s}&theme=${theme}`, size, mobile, `${outDir}${name}-${theme}-p${s}.png`);
          console.log(`review/${name}-${theme}-p${s}.png`);
        }
      }
    }
    await shot(page, `${BASE}?scene=static&p=1&theme=dark`, [1440, 900], false, `${outDir}desktop-static-p1.png`);
    console.log('review/desktop-static-p1.png');
  }
  page.close();
} finally {
  chrome.kill();
  // Chrome can still be writing to its profile as it exits
  rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
