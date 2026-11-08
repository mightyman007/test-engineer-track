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

// Task 4 (M3): the per-track readiness chip — compact verdict from the
// track's exam attempts (spec §5). The chip needs examIds on the track and
// examId on each attempt so foreign exams' attempts never leak into a track.
describe('Dashboard readiness chip', () => {
  const examTrack: Track = {
    ...track,
    readiness: { examIds: ['e1', 'e2'], passPct: 65, readyPct: 80 },
  };
  const examBundle: ContentBundle = { ...bundle, tracks: [examTrack] };

  const attempt = (n: number, examId: string, scorePct: number, day: string) => ({
    attemptId: `a${n}`,
    examId,
    score: scorePct,
    max: 100,
    passed: scorePct >= 65,
    scorePct,
    perTag: {},
    responses: {},
    createdAt: `2026-01-${day}T10:00:00.000Z`,
    durationSec: 1800,
  });

  const adapterWith = (attempts: ReturnType<typeof attempt>[]): Partial<StorageAdapter> => ({
    getSession: () => Promise.resolve(null),
    getProgress: () => Promise.resolve({}),
    getQuizAttempts: () => Promise.resolve([]),
    getExamAttempts: () => Promise.resolve(attempts),
    getReviewState: () => Promise.resolve({}),
  });

  function renderChip(a: Partial<StorageAdapter>) {
    return render(
      <MemoryRouter>
        <SessionProvider adapter={a as StorageAdapter}>
          <ContentProvider seed={examBundle}>
            <Dashboard />
          </ContentProvider>
        </SessionProvider>
      </MemoryRouter>,
    );
  }

  it('shows the ready chip when the last 2 attempts average ≥ readyPct', async () => {
    renderChip(adapterWith([attempt(1, 'e1', 85, '02'), attempt(2, 'e2', 90, '03')]));
    await waitFor(() => expect(screen.getByText('✓ Ready')).toBeTruthy());
    expect(screen.getByText('✓ Ready').className).toContain('flag ok');
  });

  it('shows the last-2 average chip when the verdict is not ready', async () => {
    renderChip(adapterWith([attempt(1, 'e1', 60, '02'), attempt(2, 'e2', 70, '03')]));
    const chip = await waitFor(() => screen.getByText('65% avg (last 2)'));
    expect(chip.className).toContain('flag warn');
  });

  it('asks for 2 mock exams when the track has no exam attempts yet', async () => {
    renderChip(adapterWith([]));
    await waitFor(() =>
      expect(screen.getByText(/take 2 mock exams for a readiness reading/i)).toBeTruthy());
  });

  it('shows no readiness chip for a track with no wired exams', async () => {
    renderDashboard(adapterWith([])); // bundle's track keeps examIds: []
    await waitFor(() => expect(screen.getByText(/0\/1 modules · 0%/i)).toBeTruthy());
    expect(screen.queryByText(/✓ Ready/)).toBeNull();
    expect(screen.queryByText(/avg \(last 2\)/)).toBeNull();
  });
});
