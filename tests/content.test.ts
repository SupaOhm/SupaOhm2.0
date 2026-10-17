import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bestPaper } from '../src/content/award';
import { featured } from '../src/content/featured';
import { parts } from '../src/content/parts';
import { profile } from '../src/content/profile';
import { moreProjects, projectRows } from '../src/content/projects';

// npm test runs from the repo root; import.meta.url is an http URL under the jsdom environment.
const ROOT = process.cwd();
const TEXT = new Set(['.ts', '.tsx', '.css', '.html', '.json', '.svg', '.txt', '.md', '.webmanifest']);

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

const shipped = [...filesUnder(join(ROOT, 'src')), ...filesUnder(join(ROOT, 'public')), join(ROOT, 'index.html')];
const shippedText = shipped.filter((f) => TEXT.has(extname(f)));
const repoFiles = [
  ...shipped,
  ...['docs', 'scripts', 'tests'].flatMap((d) => filesUnder(join(ROOT, d))),
  ...['README.md', 'package.json'].map((f) => join(ROOT, f)).filter((f) => existsSync(f)),
];

// The internal Mizuhada product name is never written in this repo, not even here:
// it is matched by the SHA-256 of its lower-case letters (6 characters long).
const BANNED_SHA256 = '1c14bf04c4b3c259593b8139f4e8586a7ec883fa73dc5bacfc4a3fe9088caaf8';
const BANNED_LENGTH = 6;
// The owner's phone number is never written in this repo either: it is matched by the SHA-256
// of its 9 national digits (without the leading 0).
const PHONE_SHA256 = '44956d60dbab3f14459c6be74711530b0895578d34798b6f6fab39347d3a413b';
const PHONE_LENGTH = 9;
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
    for (const file of repoFiles) {
      if (!TEXT.has(extname(file)) && extname(file) !== '.mjs') continue;
      const rel = relative(ROOT, file);
      expect(containsHashed(readFileSync(file, 'utf8'), PHONE_SHA256, PHONE_LENGTH), rel).toBe(false);
    }
    for (const file of shippedText) {
      expect(/\+\s*\(?66/.test(readFileSync(file, 'utf8')), relative(ROOT, file)).toBe(false);
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
    for (const pic of [...bestPaper.pics, ...featured.flatMap((f) => f.pics)]) {
      if (pic.src.includes('.placeholder.')) continue;
      expect(existsSync(join(ROOT, 'public', pic.src)), pic.src).toBe(true);
    }
  });

  it('lists the five featured items in page order', () => {
    expect(featured.map((f) => f.id)).toEqual(['mizuhada', 'baka', 'esnidsaas', 'ma-zerophish', 'acklab']);
    expect(featured.map((f) => f.object)).toEqual(['laptop', 'frame', 'reader', 'phone', 'tablet']);
  });

  it('keeps featured items grouped in the order of the parts', () => {
    const groups = [...new Set(featured.map((f) => f.group))];
    expect(groups).toEqual(parts.map((p) => p.group));
  });
});
