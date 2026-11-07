import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AdminPage } from './AdminPage.js';
import type { SessionCtx } from '../state/session.js';

const roster = {
  users: [
    { id: 1, username: 'admin', displayName: 'Admin', role: 'admin', lastSeenAt: '2026-11-07T09:00:00Z',
      quizAttempts: 3, bestQuizPct: 90, examAttempts: 1, bestExamPct: 72, cardsTracked: 14 },
    { id: 2, username: 'learner1', displayName: 'L1', role: 'learner', lastSeenAt: null,
      quizAttempts: 0, bestQuizPct: null, examAttempts: 0, bestExamPct: null, cardsTracked: 0 },
  ],
};

function ctx(serverUrl = 'http://x'): SessionCtx {
  return {
    session: { mode: 'cohort', userId: '1', displayName: 'admin', role: 'admin', serverUrl },
    adapter: {
      fetchLike: undefined,
    } as unknown as SessionCtx['adapter'],
    authExpired: false,
    clearAuthExpired: () => {},
    refresh: vi.fn(async () => {}),
    connectCohort: vi.fn(async () => {}),
    registerCohort: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
  } as SessionCtx;
}

// AdminPage takes `ctx` injection like LoginPage, and a `rosterLoader` for tests.
describe('AdminPage', () => {
  it('renders the roster with stats', async () => {
    render(
      <MemoryRouter>
        <AdminPage ctx={ctx()} rosterLoader={async () => roster} inviteCreator={async () => ({ code: 'ABCD2345' })} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('learner1')).toBeTruthy());
    expect(screen.getByText(/90%/)).toBeTruthy();
    expect(screen.getByText(/72%/)).toBeTruthy();
  });

  it('creates an invite and shows the code for copying', async () => {
    render(
      <MemoryRouter>
        <AdminPage ctx={ctx()} rosterLoader={async () => roster} inviteCreator={async () => ({ code: 'ABCD2345' })} />
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /new invite/i }));
    expect(await screen.findByText('ABCD2345')).toBeTruthy();
  });
});
