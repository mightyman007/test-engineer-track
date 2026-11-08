import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLessonMarkdown } from 'tet-core';

const CONTENT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'content');

/** Every video URL referenced by any lesson of any module of any track, deduped. */
export function discoverVideoUrls(root: string): string[] {
  const urls = new Set<string>();
  for (const trackDir of readdirSync(root, { withFileTypes: true })) {
    if (!trackDir.isDirectory()) continue;
    for (const modDir of readdirSync(join(root, trackDir.name), { withFileTypes: true })) {
      if (!modDir.isDirectory()) continue;
      const dir = join(root, trackDir.name, modDir.name);
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
        const lesson = parseLessonMarkdown(readFileSync(join(dir, f), 'utf8'));
        for (const v of lesson.videos) urls.add(v.url);
      }
    }
  }
  return [...urls];
}

async function checkUrl(url: string): Promise<boolean> {
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  try {
    const res = await fetch(oembed, { signal: AbortSignal.timeout(10_000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const urls = discoverVideoUrls(CONTENT_ROOT);
  const dead: string[] = [];
  for (const url of urls) {
    process.stdout.write(`checking ${url} ... `);
    const ok = await checkUrl(url);
    console.log(ok ? 'ok' : 'DEAD');
    if (!ok) dead.push(url);
  }
  if (dead.length > 0) {
    console.error(`\n${dead.length} dead video link(s):\n${dead.join('\n')}`);
    process.exit(1);
  }
  console.log(`\nall ${urls.length} video links embeddable`);
}

// Guard so importing this module (e.g. from check-links.test.ts) never
// triggers a network run; only the CLI entry point invokes main().
if (process.argv[1]?.endsWith('check-links.ts')) main();
