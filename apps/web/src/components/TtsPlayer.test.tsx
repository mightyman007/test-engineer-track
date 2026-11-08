import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TtsPlayer } from './TtsPlayer.js';
import { pickProvider, type TtsProvider } from 'tet-core';

vi.mock('tet-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('tet-core')>()),
  pickProvider: vi.fn(),
}));

// Every stub speak() settles on a macrotask (below). Those timers are
// TRACKED here and defused in afterEach: a speak left pending when a test
// ends fires its timer after the file's jsdom environment is torn down, and
// the play() continuation running against the dead environment was the
// Task-1-flagged latent flake (an unhandled "window is not defined"
// rejection that could fail an UNRELATED later file).
const pendingSpeaks: Array<{ timer: ReturnType<typeof setTimeout>; settle: () => void }> = [];

function providerStub(): TtsProvider {
  return {
    id: 'webspeech',
    isReady: async () => true,
    // Resolve on a macrotask so the "playing" state persists past
    // userEvent.click's own act draining (microtasks would complete play()
    // before waitFor can observe the Pause state).
    speak: vi.fn(() => new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 50);
      pendingSpeaks.push({ timer, settle: resolve });
    })),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
  };
}

afterEach(() => {
  // Unmount FIRST, so a settled speak meets the component's post-unmount
  // guard instead of live state; then defuse the timers (cleared + resolved
  // synchronously, so nothing of this test outlives the file's environment).
  cleanup();
  for (const { timer, settle } of pendingSpeaks) {
    clearTimeout(timer);
    settle();
  }
  pendingSpeaks.length = 0;
});

describe('TtsPlayer', () => {
  it('stays idle on mount, warms on first click, then shows controls and speaks', async () => {
    // pick resolves only after the test releases it: the warming state must be
    // observable in between, and nothing may warm (fetch the model) on mount.
    const p = providerStub();
    let resolvePick!: (value: TtsProvider | null) => void;
    vi.mocked(pickProvider).mockImplementation(
      () => new Promise<TtsProvider | null>((resolve) => { resolvePick = resolve; }),
    );

    render(<TtsPlayer text="hello lesson" />);
    // Idle state: subtle ready button; NO unavailability claim, NO warm-up.
    expect(screen.queryByText(/voice not available/i)).toBeNull();
    expect(pickProvider).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /text-to-speech ready/i })).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /text-to-speech ready/i }));
    expect(pickProvider).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/warming voice/i)).toBeTruthy(); // distinct from unavailable
    expect(screen.queryByRole('button', { name: /listen/i })).toBeNull();

    resolvePick(p);
    const listen = await screen.findByRole('button', { name: /listen/i });
    expect(screen.queryByText(/warming voice/i)).toBeNull();
    expect(screen.getByText(/voice: webspeech/)).toBeTruthy();

    await userEvent.click(listen);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause/i })).toBeTruthy();
    });
    expect(p.speak).toHaveBeenCalledWith('hello lesson', { rate: 1 });
  });

  it('renders the unavailable message only after a play attempt picks nothing', async () => {
    vi.mocked(pickProvider).mockResolvedValue(null);
    render(<TtsPlayer text="hello lesson" />);
    // RED anchor: a mount must never claim "voice not available" before the
    // learner has even tried to listen.
    expect(screen.queryByText(/voice not available/i)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /text-to-speech ready/i }));
    await screen.findByText(/voice not available in this browser/i);
    // And the warming state was shown while the pick was in flight.
    expect(screen.queryByRole('button', { name: /listen/i })).toBeNull();
  });

  it('does not update state after unmount during an in-flight pick', async () => {
    let resolvePick!: (value: TtsProvider | null) => void;
    vi.mocked(pickProvider).mockImplementation(
      () => new Promise<TtsProvider | null>((resolve) => { resolvePick = resolve; }),
    );
    const { unmount } = render(<TtsPlayer text="hello lesson" />);
    await userEvent.click(screen.getByRole('button', { name: /text-to-speech ready/i }));
    unmount();
    expect(() => resolvePick(providerStub())).not.toThrow();
  });

  it('a speak completing after unmount schedules nothing and rejects nothing', async () => {
    // The Task-1-flagged latent flake, pinned (M5 Task 2): unmount while a
    // play() is in flight, then let the provider's macrotask completion fire.
    // PINS the symptom — no unhandled rejection may leak out of this file
    // (it could fail an unrelated later suite). The leak is closed at two
    // layers: this file's afterEach defuses every pending speak, and play()
    // skips its post-await state work once unmounted. The component guard is
    // defense in depth — React also no-ops a late setState — so this pin
    // alone cannot red-drive the guard; it holds the no-leak contract either
    // way.
    const p = providerStub();
    vi.mocked(pickProvider).mockResolvedValue(p);
    const { unmount } = render(<TtsPlayer text="hello lesson" />);
    await userEvent.click(screen.getByRole('button', { name: /text-to-speech ready/i }));
    const listen = await screen.findByRole('button', { name: /listen/i });
    await userEvent.click(listen);
    await screen.findByRole('button', { name: /pause/i }); // speak in flight

    const rejections: unknown[] = [];
    const listener = (reason: unknown): void => { rejections.push(reason); };
    process.on('unhandledRejection', listener);
    try {
      unmount();
      // Outlive the stub's 50ms macrotask so its completion (and every
      // continuation it schedules) happens while we are watching.
      await new Promise((resolve) => setTimeout(resolve, 80));
    } finally {
      process.off('unhandledRejection', listener);
    }
    expect(p.speak).toHaveBeenCalledTimes(1);
    expect(rejections).toEqual([]);
  });

  it('works under React StrictMode (dev double-mount must not wedge the lazy pick)', async () => {
    // StrictMode dev simulates mount → cleanup → re-mount; refs survive the
    // simulated remount, so an alive-flag that is only cleared in cleanup (and
    // never re-armed on mount) stays false forever and the pick can never land.
    // RED under the wedge: the player is stuck on "warming voice…" forever.
    vi.mocked(pickProvider).mockResolvedValue(providerStub());
    render(
      <StrictMode>
        <TtsPlayer text="hello lesson" />
      </StrictMode>,
    );
    await userEvent.click(screen.getByRole('button', { name: /text-to-speech ready/i }));
    const listen = await screen.findByRole('button', { name: /listen/i }, { timeout: 2000 });
    expect(screen.queryByText(/warming voice/i)).toBeNull();
    expect(listen).toBeTruthy();
  });
});
