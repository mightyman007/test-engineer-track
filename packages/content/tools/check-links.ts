import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLessonMarkdown } from 'tet-core';

const CONTENT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'content');

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
  const urls = new Set<string>();
  for (const trackDir of readdirSync(CONTENT_ROOT, { withFileTypes: true })) {
    if (!trackDir.isDirectory()) continue;
    for (const modDir of readdirSync(join(CONTENT_ROOT, trackDir.name), { withFileTypes: true })) {
      if (!modDir.isDirectory()) continue;
      const dir = join(CONTENT_ROOT, trackDir.name, modDir.name);
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
        const lesson = parseLessonMarkdown(readFileSync(join(dir, f), 'utf8'));
        for (const v of lesson.videos) urls.add(v.url);
      }
    }
  }
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
  console.log(`\nall ${urls.size} video links embeddable`);
}

main();
