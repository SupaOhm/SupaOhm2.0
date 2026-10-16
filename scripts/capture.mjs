// Headless-Chrome captures, driven over the DevTools protocol, against a running `npm run preview`.
//   node scripts/capture.mjs fallback  → public/fallback/<state>-<theme>.webp (commit these)
//   node scripts/capture.mjs review    → review/<size>-<theme>-p<state>.png and review/desktop-static-p1.png
//                                        (manual review, git-ignored)
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173/';
const PORT = 9333;
const STATES = 7;
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

const mode = process.argv[2];
if (mode !== 'fallback' && mode !== 'review') {
  console.error('Usage: node scripts/capture.mjs <fallback|review>');
  process.exit(1);
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
  rmSync(profile, { recursive: true, force: true });
}
