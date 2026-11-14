import type { TtsProvider } from './provider.js';
import { createWebSpeechProvider } from './webspeech.js';
import { createKokoroProvider } from './kokoro.js';

export type { TtsProvider } from './provider.js';
export { createWebSpeechProvider } from './webspeech.js';
export { createKokoroProvider } from './kokoro.js';

/**
 * Strips markdown that must not be read aloud: images first (alt text is
 * decoration), then links (anchor text kept, URL dropped — otherwise TTS speaks
 * "term open-paren https colon slash slash…"), then markdown punctuation.
 */
export function stripMarkdownForTts(body: string): string {
  return body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images ![alt](src) → drop entirely
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links [text](url) → keep text
    .replace(/[#*_>`]/g, ' ');
}

/** Best available natural voice: Kokoro (neural) → Web Speech → none. */
export async function pickProvider(): Promise<TtsProvider | null> {
  // One kokoro pipeline per browser session. LessonPage mounts a fresh
  // TtsPlayer on every navigation, and each kokoro provider builds its own
  // wasm arena (~1 GB resident with q8) — without sharing, playing across
  // lessons stacks renderer memory until the tab dies (Aw Snap). A FAILED
  // warm must not be cached: the next pick re-attempts (network back, WebGPU
  // enabled, …) — only a live provider is shared.
  kokoroSingleton ??= (async () => {
    try {
      const kokoro = createKokoroProvider();
      return (await kokoro.isReady()) ? kokoro : null;
    } catch {
      return null;
    }
  })();
  const kokoro = await kokoroSingleton;
  if (kokoro) return kokoro;
  kokoroSingleton = null;
  const ws = createWebSpeechProvider();
  if (await ws.isReady()) return ws;
  return null;
}

let kokoroSingleton: Promise<TtsProvider | null> | null = null;
