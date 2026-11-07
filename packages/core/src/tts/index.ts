import type { TtsProvider } from './provider.js';
import { createWebSpeechProvider } from './webspeech.js';
import { createKokoroProvider } from './kokoro.js';

export type { TtsProvider } from './provider.js';
export { createWebSpeechProvider } from './webspeech.js';
export { createKokoroProvider } from './kokoro.js';

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
