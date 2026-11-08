import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LESSON_DEMOS } from '../components/demos.js';

// The M3-flagged silent-degradation gap: LessonPage looks a lesson's
// frontmatter `demo = "<name>"` up in LESSON_DEMOS and renders nothing when
// the key is missing — so a typo'd demo name in content degrades silently
// (the lesson just loses its interactive demo, no error anywhere). This test
// closes the loop from the other side: every demo key in the built
// content.json — the exact artifact apps/web/public serves — must exist in
// the registry.
//
// The real file is read via fs (vitest runs in Node even under the jsdom
// environment), not imported: resolveJsonModule is off and the file is the
// build's OUTPUT, so reading it keeps the test honest about what ships.
// Paths hang off process.cwd() — vitest always runs from the package root
// (import.meta.url is not a file:// URL under the vite module runner).
const publicPath = resolve(process.cwd(), 'public', 'content.json');
const raw = JSON.parse(readFileSync(publicPath, 'utf8')) as {
  lessons: Record<string, { demo?: string }>;
};

const demoKeys = Object.values(raw.lessons)
  .map((l) => l.demo)
  .filter((d): d is string => d !== undefined);

describe('demo registry coverage', () => {
  it('every lesson demo key in the built content exists in LESSON_DEMOS', () => {
    // Vacuity guards — if the content ever stops declaring demos, or the
    // registry is emptied, this test must be REVISITED, not silently pass
    // over an empty set (the same silent-degradation pattern it exists to
    // catch).
    expect(demoKeys.length).toBeGreaterThan(0);
    expect(Object.keys(LESSON_DEMOS).length).toBeGreaterThan(0);
    for (const key of demoKeys) {
      expect(LESSON_DEMOS[key], `lesson demo "${key}" has no LESSON_DEMOS entry`).toBeDefined();
    }
  });

  it('reads the artifact the content build actually emitted (public/ not stale)', () => {
    // This file's promise is "the demo keys of what SHIPS". The served copy
    // is written by the same build step that writes the content package's
    // own content.json — if they ever diverge (partial build, manual edit),
    // the sweep above would be checking a file nobody serves. Byte-equality
    // is the cheapest honest check; the path is workspace-stable.
    const builtPath = resolve(process.cwd(), '..', '..', 'packages', 'content', 'content.json');
    expect(readFileSync(publicPath, 'utf8')).toBe(readFileSync(builtPath, 'utf8'));
  });
});
