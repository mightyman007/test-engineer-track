import type { TtsProvider } from './provider.js';

const CHUNK = 200;

/**
 * Structural types for the Web Speech API. tet-core compiles without the DOM
 * lib, and these describe exactly the surface we use — the runtime objects in
 * a browser are structurally compatible with the real DOM interfaces.
 */
interface SynthVoice {
  name: string;
  lang: string;
}

interface SynthUtterance {
  text: string;
  voice: SynthVoice | null;
  rate: number;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface SpeechSynthesisLike {
  getVoices(): SynthVoice[];
  speak(utterance: SynthUtterance): void;
  cancel(): void;
  pause(): void;
  resume(): void;
}

type UtteranceCtor = new (text: string) => SynthUtterance;

/** Build an utterance without hard-requiring the DOM class (jsdom lacks it). */
function makeUtterance(text: string): SynthUtterance {
  const ctor = (globalThis as { SpeechSynthesisUtterance?: UtteranceCtor }).SpeechSynthesisUtterance;
  if (ctor) return new ctor(text);
  return { text, voice: null, rate: 1, onend: null, onerror: null };
}

function bestVoice(voices: SynthVoice[]): SynthVoice | null {
  const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
  const preferred =
    en.find((v) => /natural/i.test(v.name)) ??
    en.find((v) => /neural/i.test(v.name)) ??
    en.find((v) => /google/i.test(v.name)) ??
    en[0] ?? null;
  return preferred;
}

/**
 * Split text into ≤ CHUNK-char utterances. Sentences are kept intact and
 * accumulate up to the cap; a single sentence longer than the cap is
 * hard-split at word boundaries so oversize unpunctuated text still streams.
 */
function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let buf = '';
  const flush = (): void => { if (buf.trim()) chunks.push(buf.trim()); buf = ''; };

  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (sentence.length > CHUNK) {
      flush();
      for (const word of sentence.split(/\s+/)) {
        if (!word) continue;
        if (buf && (buf + ' ' + word).length > CHUNK) flush();
        buf = buf ? `${buf} ${word}` : word;
      }
      flush();
    } else {
      if (buf && (buf + ' ' + sentence).length > CHUNK) flush();
      buf = buf ? `${buf} ${sentence}` : sentence;
    }
  }
  flush();
  return chunks;
}

export function createWebSpeechProvider(): TtsProvider {
  const synth = (globalThis as { speechSynthesis?: SpeechSynthesisLike }).speechSynthesis;
  let stopped = false;

  return {
    id: 'webspeech',
    async isReady() { return synth !== undefined; },
    async speak(text, opts) {
      if (!synth) return;
      stopped = false;
      synth.cancel();
      const voice = bestVoice(synth.getVoices());
      const rate = opts?.rate ?? 1;
      for (const chunk of chunkText(text)) {
        if (stopped) return;
        await new Promise<void>((resolve) => {
          const u = makeUtterance(chunk);
          u.voice = voice;
          u.rate = rate;
          u.onend = () => resolve();
          u.onerror = () => resolve();
          synth.speak(u);
        });
      }
    },
    pause() { synth?.pause(); },
    resume() { synth?.resume(); },
    stop() {
      stopped = true;
      synth?.cancel();
    },
  };
}
