import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createWebSpeechProvider } from './webspeech.js';

describe('createWebSpeechProvider', () => {
  beforeEach(() => {
    const utterances: unknown[] = [];
    vi.stubGlobal('speechSynthesis', {
      getVoices: () => [
        { name: 'Microsoft David', lang: 'en-US' },
        { name: 'Google US English', lang: 'en-US' },
        { name: 'Natural Voice EN', lang: 'en-GB' },
      ],
      speak: vi.fn((u: { text: string; voice?: unknown; rate?: number; onend?: () => void }) => {
        utterances.push(u);
        u.onend?.(); // synchronous stub: each queued chunk's onend fires immediately
      }),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      speaking: false,
      paused: false,
    });
  });

  it('reports ready when speechSynthesis exists', async () => {
    const p = createWebSpeechProvider();
    expect(await p.isReady()).toBe(true);
  });

  it('prefers natural-sounding voices', async () => {
    const p = createWebSpeechProvider();
    await p.speak('hello world');
    const synth = globalThis.speechSynthesis as unknown as { speak: ReturnType<typeof vi.fn> };
    const calls = synth.speak.mock.calls as unknown as Array<[{ voice?: { name: string } }]>;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]![0]!.voice!.name).toContain('Natural');
  });

  it('should report not ready when speechSynthesis has zero voices — speak() would silently no-op', async () => {
    vi.useFakeTimers();
    try {
      // Voiceless Linux Chromium: the API exists, the voices never arrive.
      vi.stubGlobal('speechSynthesis', {
        getVoices: () => [],
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        speaking: false,
        paused: false,
      });
      const p = createWebSpeechProvider();
      const ready = p.isReady();
      expect(await Promise.race([ready.then(() => 'ready'), Promise.resolve('pending')])).toBe('pending');
      await vi.advanceTimersByTimeAsync(1000);
      expect(await ready).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should report ready when voices arrive during the grace window', async () => {
    vi.useFakeTimers();
    try {
      let voices: Array<{ name: string; lang: string }> = [];
      const listeners: Array<() => void> = [];
      vi.stubGlobal('speechSynthesis', {
        getVoices: () => voices,
        onvoiceschanged: null as (() => void) | null,
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        speaking: false,
        paused: false,
      });
      const synth = globalThis.speechSynthesis as unknown as { onvoiceschanged: (() => void) | null };
      const p = createWebSpeechProvider();
      const ready = p.isReady();
      // Voices arrive 100ms in, as on real Chrome (async voiceschanged).
      setTimeout(() => { voices = [{ name: 'V', lang: 'en-US' }]; synth.onvoiceschanged?.(); }, 100);
      await vi.advanceTimersByTimeAsync(200);
      expect(await ready).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('chunks long text into multiple utterances', async () => {
    const p = createWebSpeechProvider();
    const long = 'word '.repeat(80); // 400 chars > 200-char chunk
    await p.speak(long);
    const synth = globalThis.speechSynthesis as unknown as { speak: ReturnType<typeof vi.fn> };
    expect(synth.speak.mock.calls.length).toBeGreaterThan(1);
  });

  it('stop() cancels synthesis', async () => {
    const p = createWebSpeechProvider();
    p.stop();
    const synth = globalThis.speechSynthesis as unknown as { cancel: ReturnType<typeof vi.fn> };
    expect(synth.cancel).toHaveBeenCalled();
  });
});
