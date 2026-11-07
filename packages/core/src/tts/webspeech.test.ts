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
