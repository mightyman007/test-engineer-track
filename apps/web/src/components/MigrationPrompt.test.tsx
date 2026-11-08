import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MigrationPrompt } from './MigrationPrompt.js';
import { SessionProvider } from '../state/session.js';
import type { MigratableData, SessionInfo, StorageAdapter } from 'tet-storage';

// The untested headline feature gets its three states (M5 Task 2): no local
// data → renders nothing; upload success → flag set + prompt gone; upload
// failure → prompt stays (retryable).
//
// Mocks sit at the component's seams, per house style: `createLocalAdapter`
// (the tet-storage export the component imports directly — the same seam
// session.test.tsx mocks) and global `fetch` (the /api/import POST). The
// session itself flows through the REAL SessionProvider with a stub adapter,
// so the cohort gating and the post-upload refresh() run the production code.
const storageMocks = vi.hoisted(() => ({ createLocalAdapter: vi.fn() }));

vi.mock('tet-storage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('tet-storage')>()),
  createLocalAdapter: storageMocks.createLocalAdapter,
}));

const cohortSession: SessionInfo = {
  mode: 'cohort', userId: 'u1', displayName: 'Learner', role: 'learner',
  serverUrl: 'https://cohort.test',
};

function stubSessionAdapter(): StorageAdapter {
  return {
    getSession: vi.fn(async () => cohortSession),
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
  };
}

const localData = (withData: boolean): MigratableData => withData
  ? {
      progress: { 't1/m1/l1': { track: 't1', module: 'm1', itemId: 'l1', status: 'done', updatedAt: 'x' } },
      quizAttempts: [], examAttempts: [], cardStates: {},
    }
  : { progress: {}, quizAttempts: [], examAttempts: [], cardStates: {} };

// The component reads localStorage directly. This vitest jsdom env runs on an
// opaque origin (window.localStorage resolves to undefined there — verified by
// probe), so the flag storage gets a Map-backed double, stubbed with the same
// house pattern as fetch.
const flagStore = new Map<string, string>();
const localStorageDouble = {
  getItem: (key: string): string | null => flagStore.get(key) ?? null,
  setItem: (key: string, value: string): void => { flagStore.set(key, String(value)); },
  removeItem: (key: string): void => { flagStore.delete(key); },
  clear: (): void => { flagStore.clear(); },
};

beforeEach(() => {
  flagStore.clear();
  vi.stubGlobal('localStorage', localStorageDouble);
});
afterEach(() => {
  vi.unstubAllGlobals();
  storageMocks.createLocalAdapter.mockReset();
});

function renderPrompt(sessionAdapter: StorageAdapter = stubSessionAdapter()) {
  return render(
    <SessionProvider adapter={sessionAdapter}>
      <MigrationPrompt />
    </SessionProvider>,
  );
}

describe('MigrationPrompt', () => {
  it('renders nothing when cohort mode has no local progress data', async () => {
    const local = { exportAll: vi.fn(async () => localData(false)) };
    storageMocks.createLocalAdapter.mockReturnValue(local);
    vi.stubGlobal('fetch', vi.fn());
    renderPrompt();
    // The export probe ran (cohort mode, no flag) but found nothing worth
    // migrating — no prompt, and no import POST ever fired.
    await waitFor(() => expect(local.exportAll).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/bring my local progress/i)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('upload success: sets the tet.migrated flag and removes the prompt', async () => {
    const local = { exportAll: vi.fn(async () => localData(true)) };
    storageMocks.createLocalAdapter.mockReturnValue(local);
    const sessionAdapter = stubSessionAdapter();
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })));
    renderPrompt(sessionAdapter);
    await screen.findByText(/bring my local progress/i);

    await userEvent.click(screen.getByRole('button', { name: /upload progress/i }));

    // The upload is a fresh re-export POSTed to the session's server...
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('https://cohort.test/api/import');
    const init = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(String(init.body))).toEqual(localData(true));
    // ...and either way the one-time flag is what keeps the prompt gone.
    await waitFor(() => expect(localStorage.getItem('tet.migrated')).toBe('1'));
    expect(screen.queryByText(/bring my local progress/i)).toBeNull();
  });

  it('upload failure: the prompt stays up, the flag stays unset, retry is possible', async () => {
    const local = { exportAll: vi.fn(async () => localData(true)) };
    storageMocks.createLocalAdapter.mockReturnValue(local);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    renderPrompt();
    await screen.findByText(/bring my local progress/i);

    await userEvent.click(screen.getByRole('button', { name: /upload progress/i }));

    // A failed upload keeps the prompt up (retry or start fresh), and the
    // busy state resets so the button never sticks disabled.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /upload progress/i }).hasAttribute('disabled')).toBe(false),
    );
    expect(screen.getByText(/bring my local progress/i)).toBeTruthy();
    expect(localStorage.getItem('tet.migrated')).toBeNull();
  });
});
