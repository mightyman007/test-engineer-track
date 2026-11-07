import type { TtsProvider } from './provider.js';

/**
 * Kokoro-82M in the browser via kokoro-js (transformers.js WASM/WebGPU).
 * Dynamic import keeps the model bytes out of the initial bundle; the model
 * itself is cached by the library in the browser Cache API after first load.
 * Any failure → isReady false → caller falls back to Web Speech.
 *
 * kokoro-js is imported ONLY inside warm() (`await import('kokoro-js')`), and
 * warm() refuses to run at all where Web Audio is unavailable, so non-browser
 * environments (tests, SSR) never load the model or touch the network.
 */

/** Structural Web Audio types — tet-core compiles without the DOM lib. */
interface AudioBufferLike {
  getChannelData(channel: number): Float32Array;
}

interface AudioBufferSourceLike {
  buffer: AudioBufferLike | null;
  playbackRate: { value: number };
  connect(destination: unknown): void;
  onended: (() => void) | null;
  start(): void;
  stop(): void;
}

interface AudioContextLike {
  destination: unknown;
  createBuffer(channels: number, length: number, sampleRate: number): AudioBufferLike;
  createBufferSource(): AudioBufferSourceLike;
  suspend(): Promise<void>;
  resume(): Promise<void>;
}

/** kokoro-js `generate()` resolves to a RawAudio (PCM + sample rate). */
interface RawAudioLike {
  audio: Float32Array;
  sampling_rate: number;
}

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const VOICE = 'af_heart' as const;

const AudioContextCtor =
  (globalThis as { AudioContext?: new () => AudioContextLike }).AudioContext;

export function createKokoroProvider(): TtsProvider {
  let warming: Promise<boolean> | null = null;
  let synthFn: ((text: string) => Promise<RawAudioLike>) | null = null;
  let audioCtx: AudioContextLike | null = null;
  let current: AudioBufferSourceLike | null = null;
  let stopped = false;
  let runId = 0; // per-speak generation token: only a NEW speak() supersedes an in-flight one

  async function warm(): Promise<boolean> {
    if (synthFn) return true;
    if (!AudioContextCtor) return false; // no Web Audio → never load the model
    warming ??= (async () => {
      try {
        const mod = await import('kokoro-js');
        const nav = (globalThis as { navigator?: { gpu?: unknown } }).navigator;
        const device = nav?.gpu ? 'webgpu' : 'wasm';
        const model = await mod.KokoroTTS.from_pretrained(MODEL_ID, { dtype: 'q8', device });
        synthFn = (text: string) => model.generate(text, { voice: VOICE });
        return true;
      } catch {
        return false;
      }
    })();
    return warming;
  }

  async function speakChunk(text: string, rate: number, myRun: number): Promise<void> {
    if (!synthFn || !AudioContextCtor) return;
    const raw = await synthFn(text);
    // Superseded by a newer speak() (which reset `stopped`) or stopped outright:
    // without this token check a stale run's freshly generated audio would play
    // on top of the newer run's.
    if (myRun !== runId || stopped) return;
    audioCtx ??= new AudioContextCtor();
    // kokoro returns raw PCM; wrap it in a real AudioBuffer for playback.
    const buffer = audioCtx.createBuffer(1, raw.audio.length, raw.sampling_rate);
    buffer.getChannelData(0).set(raw.audio);
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    src.connect(audioCtx.destination);
    current = src;
    await new Promise<void>((resolve) => {
      src.onended = () => resolve();
      src.start();
    });
  }

  function chunkText(text: string, max = 900): string[] {
    const chunks: string[] = [];
    let buf = '';
    const flush = (): void => { if (buf.trim()) chunks.push(buf.trim()); buf = ''; };

    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      if (sentence.length > max) {
        flush();
        for (const word of sentence.split(/\s+/)) {
          if (!word) continue;
          if (buf && (buf + ' ' + word).length > max) flush();
          buf = buf ? `${buf} ${word}` : word;
        }
        flush();
      } else {
        if (buf && (buf + ' ' + sentence).length > max) flush();
        buf = buf ? `${buf} ${sentence}` : sentence;
      }
    }
    flush();
    return chunks;
  }

  return {
    id: 'kokoro',
    isReady: warm,
    async speak(text, opts) {
      const myRun = ++runId;
      stopped = false; // reset belongs to THIS run
      if (!(await warm())) return;
      const rate = opts?.rate ?? 1;
      for (const chunk of chunkText(text)) {
        if (myRun !== runId || stopped) return; // superseded or stopped
        await speakChunk(chunk, rate, myRun);
      }
    },
    pause() { void audioCtx?.suspend(); },
    resume() { void audioCtx?.resume(); },
    stop() {
      stopped = true;
      current?.stop();
      current = null;
    },
  };
}
