import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TtsPlayer } from './TtsPlayer.js';

vi.mock('tet-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('tet-core')>()),
  pickProvider: vi.fn(async () => ({
    id: 'webspeech',
    isReady: async () => true,
    // Resolve on a macrotask so the "playing" state persists past
    // userEvent.click's own act draining (microtasks would complete play()
    // before waitFor can observe the Pause state).
    speak: vi.fn(async () => { await new Promise((r) => setTimeout(r, 50)); }),
    pause: vi.fn(),
    resume: vi.fn(),
    stop: vi.fn(),
  })),
}));

describe('TtsPlayer', () => {
  it('renders controls and calls speak on play', async () => {
    render(<TtsPlayer text="hello lesson" />);
    const play = await screen.findByRole('button', { name: /listen/i });
    await userEvent.click(play);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pause/i })).toBeTruthy();
    });
    expect(screen.getByText(/voice: webspeech/)).toBeTruthy();
  });
});
