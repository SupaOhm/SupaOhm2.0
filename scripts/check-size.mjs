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
