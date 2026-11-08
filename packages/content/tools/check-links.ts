import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLessonMarkdown } from 'tet-core';

const CONTENT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'content');

/** Every lesson .md file of every module of every track under `root`, in walk order. */
function lessonFiles(root: string): string[] {
  const files: string[] = [];
  for (const trackDir of readdirSync(root, { withFileTypes: true })) {
    if (!trackDir.isDirectory()) continue;
    for (const modDir of readdirSync(join(root, trackDir.name), { withFileTypes: true })) {
      if (!modDir.isDirectory()) continue;
      const dir = join(root, trackDir.name, modDir.name);
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.md'))) {
        files.push(join(dir, f));
      }
    }
  }
  return files;
}

/** Every video URL referenced by any lesson of any module of any track, deduped. */
export function discoverVideoUrls(root: string): string[] {
  const urls = new Set<string>();
  for (const file of lessonFiles(root)) {
    for (const v of parseLessonMarkdown(readFileSync(file, 'utf8')).videos) urls.add(v.url);
  }
  return [...urls];
}

/**
 * Inline markdown link/image target: http(s) only. Parentheses may appear
 * inside the URL only in balanced pairs (Wikipedia-style article titles like
 * `V-model_(software_development_model)` — the bare `)` closes the link).
 * The two alternation branches are disjoint on their first character, so the
 * repetition cannot backtrack catastrophically.
 */
const MARKDOWN_HTTP_LINK = /\]\((https?:\/\/(?:[^\s()]|\([^\s()]*\))*)\)/g;

/**
 * Every external http(s) link referenced by any lesson — frontmatter video
 * URLs plus body markdown links — deduped and sorted for deterministic CLI
 * output and stable diffs between runs.
 */
export function discoverExternalLinks(root: string): string[] {
  const urls = new Set<string>();
  for (const file of lessonFiles(root)) {
    const lesson = parseLessonMarkdown(readFileSync(file, 'utf8'));
    for (const v of lesson.videos) urls.add(v.url);
    for (const match of lesson.body.matchAll(MARKDOWN_HTTP_LINK)) urls.add(match[1]!);
  }
  return [...urls].sort();
}

const FETCH_TIMEOUT_MS = 10_000;
/** Polite checker UA — several hosts reject the default node fetch UA outright. */
const USER_AGENT = 'Mozilla/5.0 (compatible; tet-link-checker/1.0)';

interface LinkProbe { ok: boolean; detail: string; }

function isVideoUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com');
  } catch {
    return false;
  }
}

/**
 * Video URLs are probed via YouTube's oEmbed endpoint (proves the video both
 * exists and is embeddable); every other link is a plain GET that must end in
 * an HTTP 2xx. Network errors and non-2xx both read as dead, with the reason
 * captured for the report.
 */
async function probeUrl(url: string): Promise<LinkProbe> {
  const video = isVideoUrl(url);
  try {
    const res = video
      ? await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        })
      : await fetch(url, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: { 'user-agent': USER_AGENT },
        });
    return res.ok
      ? { ok: true, detail: video ? 'oEmbed ok' : `HTTP ${res.status}` }
      : { ok: false, detail: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Run `fn` over `items` with at most `limit` promises in flight, preserving
 * result order. Hand-rolled worker pool — no new dependencies.
 */
async function mapPool<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        results[i] = await fn(items[i]!);
      }
    }),
  );
  return results;
}

/** Max parallel probes in --all mode (small on purpose: polite to targets). */
const POOL_SIZE = 8;

async function checkVideos(): Promise<void> {
  const urls = discoverVideoUrls(CONTENT_ROOT);
  const dead: string[] = [];
  for (const url of urls) {
    process.stdout.write(`checking ${url} ... `);
    const ok = (await probeUrl(url)).ok;
    console.log(ok ? 'ok' : 'DEAD');
    if (!ok) dead.push(url);
  }
  if (dead.length > 0) {
    console.error(`\n${dead.length} dead video link(s):\n${dead.join('\n')}`);
    process.exit(1);
  }
  console.log(`\nall ${urls.length} video links embeddable`);
}

async function checkAll(): Promise<void> {
  const urls = discoverExternalLinks(CONTENT_ROOT);
  const videos = urls.filter(isVideoUrl).length;
  console.log(
    `checking ${urls.length} external link(s) (${videos} video via oEmbed, ${urls.length - videos} plain GET), ${POOL_SIZE} at a time ...`,
  );
  const probes = await mapPool(urls, POOL_SIZE, probeUrl);
  const dead: Array<{ url: string; detail: string }> = [];
  for (let i = 0; i < urls.length; i++) {
    const probe = probes[i]!;
    if (!probe.ok) dead.push({ url: urls[i]!, detail: probe.detail });
  }
  if (dead.length > 0) {
    console.error(`\n${dead.length} dead external link(s):`);
    for (const d of dead) console.error(`DEAD ${d.url} (${d.detail})`);
    process.exit(1);
  }
  console.log(
    `\nall ${urls.length} external links alive (${videos} video via oEmbed, ${urls.length - videos} plain GET)`,
  );
}

async function main(): Promise<void> {
  if (process.argv.includes('--all')) await checkAll();
  else await checkVideos();
}

// Guard so importing this module (e.g. from check-links.test.ts) never
// triggers a network run; only the CLI entry point invokes main(). The entry
// is matched by resolved path (argv[1] realpath vs this file's realpath), not
// by filename suffix — a suffix match would also fire for any other script
// that merely ends in check-links.ts, and misses relative/symlinked invocations.
const entry = process.argv[1];
if (entry) {
  try {
    if (realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url))) main();
  } catch {
    // argv[1] points at something unreadable (or vanished): not our CLI entry.
  }
}
