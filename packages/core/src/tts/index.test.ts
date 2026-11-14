import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// pickProvider wires kokoro → webspeech with a session-wide singleton for the
// kokoro pipeline: LessonPage mounts a fresh TtsPlayer on every navigation,
// and each kokoro provider builds its own wasm arena — without sharing,
// playback across lessons stacks renderer memory until the tab dies.

// vi.hoisted: the mock factories close over these, and factories are hoisted
// above imports — plain consts would be a TDZ hazard.
const { kokoroCreate, webspeechCreate } = vi.hoisted(() => ({
  kokoroCreate: vi.fn(),
  webspeechCreate: vi.fn(),
}));

vi.mock('./kokoro.js', () => ({ createKokoroProvider: kokoroCreate }));
vi.mock('./webspeech.js', () => ({ createWebSpeechProvider: webspeechCreate }));

// pickProvider's singleton lives at module scope, so every test needs a FRESH
// module instance (resetModules + re-import) to start from clean state.
async function freshPickProvider() {
  vi.resetModules();
  const { pickProvider } = await import('./index.js');
  return pickProvider;
}

const kokoroStub = (ready: boolean) => ({
  id: 'kokoro',
  isReady: () => Promise.resolve(ready),
  speak: () => Promise.resolve(),
  pause: () => {},
  resume: () => {},
  stop: () => {},
});

const webspeechStub = (ready: boolean) => ({
  id: 'webspeech',
  isReady: () => Promise.resolve(ready),
  speak: () => Promise.resolve(),
  pause: () => {},
  resume: () => {},
  stop: () => {},
});

describe('pickProvider', () => {
  beforeEach(() => {
    kokoroCreate.mockReset();
    webspeechCreate.mockReset();
  });
  afterEach(() => {
    vi.resetModules();
  });

  it('should create one kokoro provider across repeated picks when it is ready', async () => {
    const pickProvider = await freshPickProvider();
    // Precondition.
    kokoroCreate.mockReturnValue(kokoroStub(true));
    expect(kokoroCreate).not.toHaveBeenCalled();

    // Under test — two picks (two lesson navigations).
    const first = await pickProvider();
    const second = await pickProvider();

    // Postcondition.
    expect(kokoroCreate).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
    expect(first?.id).toBe('kokoro');
    expect(webspeechCreate).not.toHaveBeenCalled();
  });

  it('should share one in-flight warm across concurrent picks', async () => {
    const pickProvider = await freshPickProvider();
    kokoroCreate.mockImplementation(() => kokoroStub(true));

    // Under test: two picks issued before either resolves.
    const [a, b] = await Promise.all([pickProvider(), pickProvider()]);

    // Postcondition: one pipeline, one instance.
    expect(kokoroCreate).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('should fall back to webspeech and retry kokoro on the next pick when warm fails', async () => {
    const pickProvider = await freshPickProvider();
    // Precondition: kokoro cannot warm (e.g. no Web Audio) — but a later
    // navigation may succeed (network back, gpu flag flipped).
    kokoroCreate.mockReturnValueOnce(kokoroStub(false)).mockReturnValueOnce(kokoroStub(true));
    webspeechCreate.mockReturnValue(webspeechStub(true));

    // Under test.
    const first = await pickProvider();
    const second = await pickProvider();

    // Postcondition: first pick fell through to webspeech; second retried
    // kokoro and got it — so the failed warm must NOT be cached forever.
    expect(first?.id).toBe('webspeech');
    expect(second?.id).toBe('kokoro');
    expect(kokoroCreate).toHaveBeenCalledTimes(2);
  });

  it('should fall back to webspeech when kokoro creation throws synchronously', async () => {
    const pickProvider = await freshPickProvider();
    kokoroCreate.mockImplementationOnce(() => { throw new Error('boom'); });
    webspeechCreate.mockReturnValue(webspeechStub(true));

    expect((await pickProvider())?.id).toBe('webspeech');
    expect(webspeechCreate).toHaveBeenCalledTimes(1);
  });

  it('should resolve null when no provider is ready', async () => {
    const pickProvider = await freshPickProvider();
    kokoroCreate.mockReturnValue(kokoroStub(false));
    webspeechCreate.mockReturnValue(webspeechStub(false));

    expect(await pickProvider()).toBeNull();
    expect(webspeechCreate).toHaveBeenCalledTimes(1);
  });
});
