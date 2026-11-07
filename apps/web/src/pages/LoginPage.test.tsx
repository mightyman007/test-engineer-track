import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { LoginPage } from './LoginPage.js';
import { SessionProvider, type SessionCtx } from '../state/session.js';

function mockCtx(over: Partial<SessionCtx> = {}): SessionCtx {
  return {
    session: null,
    adapter: {} as SessionCtx['adapter'],
    authExpired: false,
    clearAuthExpired: () => {},
    refresh: vi.fn(async () => {}),
    connectCohort: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    ...over,
  } as SessionCtx;
}

// The provider is stubbed via a test-only re-export to avoid network calls.
vi.mock('../state/session.js', async (orig) => {
  const actual = await orig<typeof import('../state/session.js')>();
  return { ...actual };
});

describe('LoginPage', () => {
  it('collects server url + credentials and calls connectCohort on sign-in', async () => {
    const ctx = mockCtx();
    // signIn() does a real pre-flight fetch to the typed server before calling
    // connectCohort. Stub it as an unreachable server so the test is hermetic
    // no matter what listens on localhost:8787 (e.g. `docker compose up`).
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('network down'))));
    render(
      <MemoryRouter><LoginPage ctx={ctx} /></MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/server url/i), 'http://localhost:8787');
    await userEvent.type(screen.getByLabelText(/username/i), 'learner1');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(ctx.connectCohort).toHaveBeenCalledWith('http://localhost:8787'));
    vi.unstubAllGlobals();
  });

  it('register flow sends the invite code', async () => {
    const ctx = mockCtx();
    (ctx as unknown as { registerCohort: ReturnType<typeof vi.fn> }).registerCohort = vi.fn(async () => {});
    render(<MemoryRouter><LoginPage ctx={ctx} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /register with invite/i }));
    await userEvent.type(screen.getByLabelText(/server url/i), 'http://localhost:8787');
    await userEvent.type(screen.getByLabelText(/invite code/i), 'WELCOME1');
    await userEvent.type(screen.getByLabelText(/username/i), 'newbie');
    await userEvent.type(screen.getByLabelText(/password/i), 'longenough1');
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));
    const register = (ctx as unknown as { registerCohort: ReturnType<typeof vi.fn> }).registerCohort;
    await waitFor(() => expect(register).toHaveBeenCalledWith('http://localhost:8787', expect.objectContaining({ inviteCode: 'WELCOME1' })));
  });
});
