import type { TtsProvider } from './provider.js';
import { chunkText } from './chunk.js';

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
// q4 halves the resident weight memory vs q8. The renderer process is the
// scarce resource: a q8 playback measured ~1.0 GB resident, which is Aw-Snap
// territory on real profiles (extensions + tabs share the renderer budget).
const DTYPE = 'q4' as const;
// ~300-char chunks ≈ ~20s of audio per generate() call. Kokoro decodes ~75
// audio tokens per SECOND of output, so attention/KV memory scales with chunk
// length — a 900-char chunk spiked the renderer +400 MB in one generation.
// 300-char chunks cut that ~3x and start audio ~3x sooner.
const CHUNK_MAX = 300;

const AudioContextCtor =
  (globalThis as { AudioContext?: new () => AudioContextLike }).AudioContext;

/**
 * Choose the transformers.js execution device. `navigator.gpu` EXISTING is not
 * proof WebGPU works: Brave exposes the API surface but its requestAdapter()
 * resolves null (or throws) unless the user enables WebGPU, and transformers.js
 * then dies with "no available backend found" — which warm() would swallow and
 * downgrade the whole provider to Web Speech. Ask for a real adapter instead;
 * only commit to webgpu when one actually comes back, and otherwise stay on
 * wasm (verified working: model loads and generates on adapter-less Brave).
 */
export type KokoroDevice = 'webgpu' | 'wasm';

export async function pickKokoroDevice(
  gpu?: { requestAdapter(): Promise<unknown> },
): Promise<KokoroDevice> {
  if (!gpu) return 'wasm';
  try {
    return (await gpu.requestAdapter()) ? 'webgpu' : 'wasm';
  } catch {
    return 'wasm';
  }
}

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
        const nav = (globalThis as { navigator?: { gpu?: { requestAdapter(): Promise<unknown> } } }).navigator;
        const device = await pickKokoroDevice(nav?.gpu);
        const model = await mod.KokoroTTS.from_pretrained(MODEL_ID, { dtype: DTYPE, device });
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
    // The FIRST context is constructed after warm()+generate() — potentially
    // seconds past the user gesture. Start it running immediately: sources on
    // a suspended context are silent (autoplay policy on stricter engines).
    void audioCtx.resume().catch(() => {});
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

  function chunkTextForSpeech(text: string): string[] {
    return chunkText(text, CHUNK_MAX);
  }

  return {
    id: 'kokoro',
    isReady: warm,
    async speak(text, opts) {
      const myRun = ++runId;
      stopped = false; // reset belongs to THIS run
      // A previous run's chunk may still be SOUNDING: pause→play re-enters
      // speak() without stop(), and runId only stops the stale loop from
      // queueing MORE chunks — webspeech cancels via synth.cancel(); the
      // wasm equivalent is stopping the live source or it doubles over us.
      current?.stop();
      current = null;
      // A prior pause() suspended the shared AudioContext; sources started on a
      // suspended context are silent, so every run resumes it first (no-op when
      // running). fire-and-forget: a rejected resume must not kill playback.
      void audioCtx?.resume().catch(() => {});
      if (!(await warm())) return;
      const rate = opts?.rate ?? 1;
      for (const chunk of chunkTextForSpeech(text)) {
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
