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
  try {
    const kokoro = createKokoroProvider();
    if (await kokoro.isReady()) return kokoro;
  } catch { /* fall through */ }
  const ws = createWebSpeechProvider();
  if (await ws.isReady()) return ws;
  return null;
}
