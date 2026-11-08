import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { TrackPage } from './TrackPage.js';
import { ContentProvider } from '../lib/content-context.js';
import { SessionProvider } from '../state/session.js';
import type { ContentBundle, Module, Track } from 'tet-core';
import type { ExamAttempt, ProgressEntry, ProgressMap, StorageAdapter } from 'tet-storage';

// The DOM-level test M2's review asked for: TrackPage is the app's
// least-tested surface (Dashboard/ExamRunner had coverage; the track
// listing — numbering, compound titles, progress markers, readiness line —
// did not).
//
// 7 modules with orders 1..7 and distinct titles, including the two
// real-world compound ones (Black-Box / White-Box), and one lessonless
// module to pin the zero-lessons progress marker.
const lessonIds = (n: number, count: number) =>
  Array.from({ length: count }, (_, i) => `m${n}-l${i + 1}`);

const modules: Module[] = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
  id: `m${n}`,
  track: 't1',
  title: n === 4
    ? 'Test Analysis & Design I — Black-Box Techniques'
    : n === 5
      ? 'Test Analysis & Design II — White-Box, Experience-Based, Collaboration-Based'
      : `Module ${n}`,
  order: n,
  source: 'x', quizPool: 'x', deck: 'x',
  lessonIds: n === 3 ? [] : lessonIds(n, 2),
}));

const track: Track = {
  id: 't1', title: 'ISTQB Foundation', description: 'D', order: 1,
  modules,
  readiness: { examIds: [], passPct: 65, readyPct: 80 },
};

const bundle: ContentBundle = {
  tracks: [track], lessons: {}, questions: [], flashcards: [], exams: [],
  diagrams: {}, questionsByModule: {}, cardsByModule: {},
};

// Module 1 fully complete, module 2 half done, the rest untouched.
const entry = (m: number, l: number): ProgressEntry => ({
  track: 't1', module: `m${m}`, itemId: `m${m}-l${l}`, status: 'done', updatedAt: 'x',
});
const progress: ProgressMap = {
  't1/m1/m1-l1': entry(1, 1),
  't1/m1/m1-l2': entry(1, 2),
  't1/m2/m2-l1': entry(2, 1),
};

const adapter: Partial<StorageAdapter> = {
  getSession: () => Promise.resolve(null),
  getProgress: () => Promise.resolve(progress),
  getExamAttempts: () => Promise.resolve([]),
};

// Task 4 (M3) made the readiness line data-driven: with examIds wired the
// line reads the learner's exam attempts (filtered to the track's exams).
const examTrack: Track = {
  ...track,
  readiness: { examIds: ['e1', 'e2'], passPct: 65, readyPct: 80 },
};
const attempt = (n: number, examId: string, scorePct: number, day: string): ExamAttempt => ({
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

function renderTrackPage(a: Partial<StorageAdapter> = adapter, b: ContentBundle = bundle) {
  return render(
    <MemoryRouter initialEntries={['/track/t1']}>
      <SessionProvider adapter={a as StorageAdapter}>
        <ContentProvider seed={b}>
          <Routes>
            <Route path="/track/:trackId" element={<TrackPage />} />
          </Routes>
        </ContentProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('TrackPage', () => {
  it('renders modules 1..7 in numbered order with compound titles intact', async () => {
    renderTrackPage();
    await waitFor(() => expect(screen.getByRole('heading', { name: /istqb foundation/i })).toBeTruthy());
    // Numbered order 1..7 — the h3 link text is `${i + 1}. ${title}`, so DOM
    // order must be exactly the manifest's module order.
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual([
      '1. Module 1',
      '2. Module 2',
      '3. Module 3',
      '4. Test Analysis & Design I — Black-Box Techniques',
      '5. Test Analysis & Design II — White-Box, Experience-Based, Collaboration-Based',
      '6. Module 6',
      '7. Module 7',
    ]);
  });

  it('renders a progress marker per module, honoring lesson progress', async () => {
    renderTrackPage();
    await waitFor(() => expect(screen.getByText(/2 lessons · 50%/)).toBeTruthy());
    // All 7 modules show a progress span (label · pct).
    expect(screen.getAllByText(/(\d+ lessons|complete) · \d+%/)).toHaveLength(7);
    // Module 1's lessons are all done → "complete · 100%".
    expect(screen.getByText(/complete · 100%/)).toBeTruthy();
    // A lessonless module shows "complete · 0%" — moduleDone's every() is
    // vacuously true over an empty lesson list. (M3's module 8 shipped with
    // one lesson, so no lessonless module exists in the real manifest; the
    // synthetic fixture keeps pinning the generic behavior.)
    expect(screen.getByText(/complete · 0%/)).toBeTruthy();
    // Module 2 is half done → its marker reflects partial progress.
    expect(screen.getByText(/2 lessons · 50%/)).toBeTruthy();
  });

  it('keeps the placeholder line for a track with no wired exams', async () => {
    // Task 4 (M3) made this line data-driven from readiness.examIds + the
    // learner's exam attempts. The placeholder branch remains for tracks
    // whose readiness.examIds is still empty (the M4 AI track ships later).
    renderTrackPage();
    await waitFor(() => expect(screen.getByText(/readiness:/i)).toBeTruthy());
    expect(screen.getByText(/mock exams arrive with milestone 3/)).toBeTruthy();
  });

  it('reads the readiness verdict from the track exam attempts when exams are wired', async () => {
    // Ready: last 2 attempts (82 + 88) average 85 ≥ readyPct 80.
    renderTrackPage({
      ...adapter,
      getExamAttempts: () => Promise.resolve([
        attempt(1, 'e1', 82, '02'),
        attempt(2, 'e2', 88, '03'),
      ]),
    }, { ...bundle, tracks: [examTrack] });
    await waitFor(() => expect(screen.getByText(/readiness: ready$/i)).toBeTruthy());
  });

  it('shows the last-2 average when wired exams are below readyPct', async () => {
    renderTrackPage({
      ...adapter,
      getExamAttempts: () => Promise.resolve([
        attempt(1, 'e1', 60, '02'),
        attempt(2, 'e2', 70, '03'),
      ]),
    }, { ...bundle, tracks: [examTrack] });
    await waitFor(() => expect(screen.getByText(/readiness: last 2 average 65%/i)).toBeTruthy());
  });

  it('asks for 2 mock exams when fewer attempts exist on the wired exams', async () => {
    // One attempt, even a perfect one, gives no readiness reading; attempts
    // on exams outside the track's readiness list never leak in.
    renderTrackPage({
      ...adapter,
      getExamAttempts: () => Promise.resolve([
        attempt(1, 'e1', 100, '02'),
        attempt(2, 'other-exam', 100, '03'),
      ]),
    }, { ...bundle, tracks: [examTrack] });
    await waitFor(() => expect(screen.getByText(/readiness: take 2 mock exams for a reading/i)).toBeTruthy());
  });

  it('renders the track-not-found fallback for an unknown track id', async () => {
    render(
      <MemoryRouter initialEntries={['/track/nope']}>
        <SessionProvider adapter={adapter as StorageAdapter}>
          <ContentProvider seed={bundle}>
            <Routes>
              <Route path="/track/:trackId" element={<TrackPage />} />
            </Routes>
          </ContentProvider>
        </SessionProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('Track not found.')).toBeTruthy();
  });
});
