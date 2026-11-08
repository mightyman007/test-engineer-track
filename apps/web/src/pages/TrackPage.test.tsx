import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { TrackPage } from './TrackPage.js';
import { ContentProvider } from '../lib/content-context.js';
import { SessionProvider } from '../state/session.js';
import type { ContentBundle, Module, Track } from 'tet-core';
import type { ProgressEntry, ProgressMap, StorageAdapter } from 'tet-storage';

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
};

function renderTrackPage(a: Partial<StorageAdapter> = adapter) {
  return render(
    <MemoryRouter initialEntries={['/track/t1']}>
      <SessionProvider adapter={a as StorageAdapter}>
        <ContentProvider seed={bundle}>
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
    // vacuously true over an empty lesson list (pinned current behavior;
    // revisit if M3's lessonless module 8 wants a distinct marker).
    expect(screen.getByText(/complete · 0%/)).toBeTruthy();
    // Module 2 is half done → its marker reflects partial progress.
    expect(screen.getByText(/2 lessons · 50%/)).toBeTruthy();
  });

  it('shows the readiness placeholder while no mock exams are wired', async () => {
    // Task 4 (M3) makes this line data-driven from readiness.examIds — that
    // task must update THIS assertion alongside the component change.
    renderTrackPage();
    await waitFor(() => expect(screen.getByText(/readiness:/i)).toBeTruthy());
    expect(screen.getByText(/mock exams arrive with milestone 3/)).toBeTruthy();
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
