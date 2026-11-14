import { describe, expect, it, vi } from 'vitest';
import { pickKokoroDevice } from './kokoro.js';

// The provider state-machine tests need kokoro-js stubbed before the module's
// module-level AudioContext capture, so they dynamic-import a fresh copy.
const fromPretrained = vi.fn();
vi.mock('kokoro-js', () => ({
  KokoroTTS: { from_pretrained: (...args: unknown[]) => fromPretrained(...args) },
}));

describe('pickKokoroDevice', () => {
  it('should pick wasm when no webgpu exists', async () => {
    expect(await pickKokoroDevice(undefined)).toBe('wasm');
  });

  it('should pick wasm when the adapter request resolves null — Brave exposes navigator.gpu but refuses the adapter', async () => {
    const braveLikeGpu = { requestAdapter: () => Promise.resolve(null) };
    expect(await pickKokoroDevice(braveLikeGpu)).toBe('wasm');
  });

  it('should pick webgpu when an adapter is actually available', async () => {
    const gpu = { requestAdapter: () => Promise.resolve({}) };
    expect(await pickKokoroDevice(gpu)).toBe('webgpu');
  });

  it('should pick wasm when the adapter request throws', async () => {
    const gpu = { requestAdapter: () => Promise.reject(new Error('denied')) };
    expect(await pickKokoroDevice(gpu)).toBe('wasm');
  });
});

describe('createKokoroProvider', () => {
  it('should stop the sounding source when a new speak() begins without stop() — pause→play must not double voices', async () => {
    vi.resetModules();
    const events: string[] = [];
    let counter = 0;
    class FakeAudioContext {
      destination = {};
      resume = () => Promise.resolve();
      suspend = () => Promise.resolve();
      createBuffer = (_c: number, length: number, _sr: number) => ({ getChannelData: () => new Float32Array(length) });
      createBufferSource = () => {
        counter += 1;
        const id = counter;
        const src = {
          id,
          buffer: null,
          playbackRate: { value: 1 },
          onended: null as (() => void) | null,
          connect: () => {},
          start: () => { events.push(`start:${id}`); },
          stop: () => { events.push(`stop:${id}`); },
        };
        return src;
      };
    }
    vi.stubGlobal('AudioContext', FakeAudioContext);
    fromPretrained.mockResolvedValue({
      generate: async () => ({ audio: new Float32Array(64), sampling_rate: 24000 }),
    });
    const { createKokoroProvider } = await import('./kokoro.js');

    const p = createKokoroProvider();
    expect(await p.isReady()).toBe(true);
    void p.speak('first chunk').catch(() => {}); // src 1 starts and keeps sounding
    await new Promise((r) => setTimeout(r, 10));
    expect(events).toEqual(['start:1']);

    // Under test: a second speak() without an intervening stop() (the
    // pause→play path) must cancel the live source before its own starts.
    void p.speak('second chunk').catch(() => {});
    await new Promise((r) => setTimeout(r, 10));
    expect(events).toEqual(['start:1', 'stop:1', 'start:2']);

    p.stop();
    vi.unstubAllGlobals();
  });
});
