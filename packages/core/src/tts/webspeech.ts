import type { TtsProvider } from './provider.js';
import { chunkText } from './chunk.js';

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
  onvoiceschanged: (() => void) | null;
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
 * Split text into ≤ CHUNK-char utterances via the shared chunker.
 */
function chunkTextForSpeech(text: string): string[] {
  return chunkText(text, CHUNK);
}

export function createWebSpeechProvider(): TtsProvider {
  const synth = (globalThis as { speechSynthesis?: SpeechSynthesisLike }).speechSynthesis;
  let stopped = false;
  let runId = 0; // per-speak generation token: only a NEW speak() supersedes an in-flight one

  return {
    id: 'webspeech',
    /**
     * `synth` EXISTING is not proof speech works: on Linux Chromium-family
     * without a voice backend, getVoices() is empty and speak() silently
     * no-ops — the original "TTS plays nothing" bug. Require an actual voice;
     * voices may populate asynchronously (Chrome fires voiceschanged after
     * load), so allow one short grace window before declaring unusable.
     */
    async isReady() {
      if (!synth) return false;
      if (synth.getVoices().length > 0) return true;
      return await new Promise<boolean>((resolve) => {
        const finish = (ok: boolean) => {
          synth.onvoiceschanged = null;
          clearTimeout(timer);
          resolve(ok);
        };
        const timer = setTimeout(() => finish(false), 1000);
        synth.onvoiceschanged = () => finish(synth.getVoices().length > 0);
      });
    },
    async speak(text, opts) {
      if (!synth) return;
      const myRun = ++runId;
      stopped = false; // reset belongs to THIS run
      synth.cancel();
      const voice = bestVoice(synth.getVoices());
      const rate = opts?.rate ?? 1;
      for (const chunk of chunkTextForSpeech(text)) {
        // Superseded by a newer speak() (which reset `stopped`) or stopped
        // outright — never queue further utterances from a stale run.
        if (myRun !== runId || stopped) return;
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
