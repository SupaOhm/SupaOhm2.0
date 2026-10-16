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
