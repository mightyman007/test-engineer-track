import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { SessionProvider, useSession, type SessionCtx } from './session.js';
import { type SessionInfo, type StorageAdapter } from 'tet-storage';

const storageMocks = vi.hoisted(() => ({
  createLocalAdapter: vi.fn(),
  createServerAdapter: vi.fn(),
}));

vi.mock('tet-storage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('tet-storage')>()),
  createLocalAdapter: storageMocks.createLocalAdapter,
  createServerAdapter: storageMocks.createServerAdapter,
}));

function stubAdapter(session: SessionInfo | null, pending = 0): StorageAdapter {
  return {
    getSession: vi.fn(async () => session),
    putSession: vi.fn(async () => {}),
    getProgress: vi.fn(async () => ({})),
    putProgress: vi.fn(async () => {}),
    recordQuizAttempt: vi.fn(async () => {}),
    getQuizAttempts: vi.fn(async () => []),
    recordExamAttempt: vi.fn(async () => {}),
    getExamAttempts: vi.fn(async () => []),
    recordCardReview: vi.fn(async () => {}),
    getReviewState: vi.fn(async () => ({})),
    putExamDraft: vi.fn(async () => {}),
    getExamDraft: vi.fn(async () => null),
    clearExamDraft: vi.fn(async () => {}),
    exportAll: vi.fn(async () => ({ progress: {}, quizAttempts: [], examAttempts: [], cardStates: {} })),
    importAll: vi.fn(async () => {}),
    pendingWrites: pending > 0 ? () => pending : undefined,
    drainPending: vi.fn(async () => {}),
  };
}

const ctxs: SessionCtx[] = [];
function Probe() {
  ctxs.push(useSession());
  return null;
}

function mountWith(adapter: StorageAdapter) {
  ctxs.length = 0;
  render(<SessionProvider adapter={adapter}><Probe /></SessionProvider>);
  return () => ctxs[ctxs.length - 1]!;
}

const cohort = (serverUrl: string, pending = 0): SessionInfo =>
  ({ mode: 'cohort', userId: '1', displayName: 'D', role: 'learner', serverUrl });

describe('SessionProvider.connectCohort', () => {
  beforeEach(() => {
    storageMocks.createServerAdapter.mockReset();
    storageMocks.createLocalAdapter.mockReset();
    // jsdom has no IndexedDB: swaps after disconnect must get a stub too.
    storageMocks.createLocalAdapter.mockReturnValue(stubAdapter(null));
  });
  afterEach(() => vi.restoreAllMocks());

  it('reuses the live adapter when connecting to the SAME server (replay buffer survives)', async () => {
    const first = stubAdapter(cohort('http://srv'), 3); // 3 writes buffered during an expired window
    const second = stubAdapter(cohort('http://srv'), 0);
    storageMocks.createServerAdapter.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const latest = mountWith(stubAdapter(null));

    await act(async () => { await latest().connectCohort('http://srv'); });
    expect(storageMocks.createServerAdapter).toHaveBeenCalledTimes(1);
    expect(latest().session?.serverUrl).toBe('http://srv');

    // Re-connect to the same URL (e.g. re-login after the session-expired
    // banner): the adapter must NOT be replaced — replacing it would orphan
    // the buffered writes forever.
    await act(async () => { await latest().connectCohort('http://srv'); });
    expect(storageMocks.createServerAdapter).toHaveBeenCalledTimes(1);
    expect(latest().adapter).toBe(first);
  });

  it('warns and drops the pending buffer when switching to a different server', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const first = stubAdapter(cohort('http://srv'), 3);
    const second = stubAdapter(cohort('http://other'), 0);
    storageMocks.createServerAdapter.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const latest = mountWith(stubAdapter(null));

    await act(async () => { await latest().connectCohort('http://srv'); });
    await act(async () => { await latest().connectCohort('http://other'); });

    expect(storageMocks.createServerAdapter).toHaveBeenCalledTimes(2);
    expect(latest().adapter).toBe(second);
    // Cross-server replay would write old-cohort data into the new cohort —
    // the buffer is dropped loudly instead.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('3 buffered write'), expect.stringContaining('http://other'));
  });

  it('disconnect drains pending writes while the cookie is still valid, before logout', async () => {
    const postLogout = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', postLogout);
    const cohortAdapter = stubAdapter(cohort('http://srv'), 2);
    storageMocks.createServerAdapter.mockReturnValue(cohortAdapter);
    const drain = cohortAdapter.drainPending as ReturnType<typeof vi.fn>;
    const latest = mountWith(stubAdapter(null));
    await act(async () => { await latest().connectCohort('http://srv'); });
    await act(async () => { await latest().disconnect(); });

    expect(drain).toHaveBeenCalledTimes(1);
    expect(drain.mock.invocationCallOrder[0]!).toBeLessThan(postLogout.mock.invocationCallOrder[0]!);
    vi.unstubAllGlobals();
  });
});
