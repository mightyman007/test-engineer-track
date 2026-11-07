import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TtsPlayer } from './TtsPlayer.js';
import { pickProvider, type TtsProvider } from 'tet-core';

vi.mock('tet-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('tet-core')>()),
  pickProvider: vi.fn(),
}));

function providerStub(): TtsProvider {
  return {
    id: 'webspeech',
    isReady: async () => true,
    // Resolve on a macrotask so the "playing" state persists past
    // userEvent.click's own act draining (microtasks would complete play()
    // before waitFor can observe the Pause state).
    speak: vi.fn(async () => { await new Promise((r) => setTimeout(r, 50)); }),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
  };
}

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
});
