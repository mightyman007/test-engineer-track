import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Dashboard } from './Dashboard.js';
import { ContentProvider } from '../lib/content-context.js';
import { SessionProvider } from '../state/session.js';
import type { ContentBundle, Track } from 'tet-core';
import type { StorageAdapter } from 'tet-storage';

const track: Track = {
  id: 't1', title: 'ISTQB Foundation', description: 'D', order: 1,
  modules: [{
    id: 'm1', track: 't1', title: 'Fundamentals of Testing', order: 1,
    source: 'x', quizPool: 'x', deck: 'x', lessonIds: ['l1', 'l2'], examWeight: 8,
  }],
  readiness: { examIds: [], passPct: 65, readyPct: 80 },
};

const bundle: ContentBundle = {
  tracks: [track], lessons: {}, questions: [], flashcards: [], exams: [],
  diagrams: {}, questionsByModule: {}, cardsByModule: {},
};

// (Dashboard reads content from a ContentProvider context, not a fetch, so
// tests are deterministic: ContentProvider is seeded, SessionProvider mounts
// the stub adapter — no IndexedDB (absent in jsdom), no network.)
function renderDashboard(adapter: Partial<StorageAdapter>) {
  return render(
    <MemoryRouter>
      <SessionProvider adapter={adapter as StorageAdapter}>
        <ContentProvider seed={bundle}>
          <Dashboard />
        </ContentProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('Dashboard', () => {
  it('renders empty states on fresh storage (Review Focus #2)', async () => {
    const emptyAdapter: Partial<StorageAdapter> = {
      getSession: () => Promise.resolve(null),
      getProgress: () => Promise.resolve({}),
      getQuizAttempts: () => Promise.resolve([]),
      getExamAttempts: () => Promise.resolve([]),
      getReviewState: () => Promise.resolve({}),
    };
    renderDashboard(emptyAdapter);
    await waitFor(() => {
      expect(screen.getByText(/no flashcards due/i)).toBeTruthy();
    });
    expect(screen.getByText(/0\/1 modules · 0%/i)).toBeTruthy();
  });

  it('shows progress and due count when data exists', async () => {
    const adapter: Partial<StorageAdapter> = {
      getSession: () => Promise.resolve(null),
      getProgress: () => Promise.resolve({
        't1/m1/l1': { track: 't1', module: 'm1', itemId: 'l1', status: 'done', updatedAt: 'x' },
      }),
      getQuizAttempts: () => Promise.resolve([
        { attemptId: 'a', module: 'm1', score: 9, max: 10, perQuestion: {}, createdAt: 'x' },
      ]),
      getExamAttempts: () => Promise.resolve([]),
      getReviewState: () => Promise.resolve({
        c1: { ease: 2.5, intervalDays: 1, dueAt: new Date(Date.now() - 1000).toISOString(), reps: 1, lapses: 0 },
      }),
    };
    renderDashboard(adapter);
    await waitFor(() => {
      expect(screen.getByText(/1 flashcard due/i)).toBeTruthy();
    });
    expect(screen.getByText(/best quiz 90%/i)).toBeTruthy();
  });
});
