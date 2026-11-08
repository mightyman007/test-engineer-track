import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { discoverVideoUrls } from './check-links.js';

describe('discoverVideoUrls', () => {
  it('discovers video URLs from every module of every track', () => {
    const root = mkdtempSync(join(tmpdir(), 'tet-links-'));
    for (const mod of ['module-2', 'module-3']) {
      mkdirSync(join(root, 'istqb', mod), { recursive: true });
      writeFileSync(join(root, 'istqb', mod, 'lesson-01.md'), `+++
id = "x-${mod}"
module = "m-${mod}"
title = "T"
minutes = 5
objectives = []
videos = [{ title = "v", url = "https://www.youtube.com/watch?v=${mod === 'module-2' ? 'abc12345678' : 'def12345678'}" }]
diagrams = [{ title = "d", file = "diagrams/d.svg" }]
+++
body
`);
    }
    const urls = discoverVideoUrls(root);
    expect(urls.sort()).toEqual([
      'https://www.youtube.com/watch?v=abc12345678',
      'https://www.youtube.com/watch?v=def12345678',
    ]);
  });

  it('returns an empty array for a tree with no lessons', () => {
    expect(discoverVideoUrls(mkdtempSync(join(tmpdir(), 'tet-links-empty-')))).toEqual([]);
  });
});
