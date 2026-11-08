import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { FlashcardsPage } from './FlashcardsPage.js';
import { ContentProvider } from '../lib/content-context.js';
import { SessionProvider } from '../state/session.js';
import type { ContentBundle, Track } from 'tet-core';
import type { StorageAdapter } from 'tet-storage';

// The grid is the deck picker; the review pane below it belongs to the active
// deck (none on /flashcards). The adapter stub is the same shape Dashboard
// tests use — no IndexedDB (absent in jsdom), no network.
const adapter: Partial<StorageAdapter> = {
  getSession: () => Promise.resolve(null),
  getReviewState: () => Promise.resolve({}),
};

const track: Track = {
  id: 't1', title: 'ISTQB Foundation', description: 'D', order: 1,
  modules: [
    { id: 'm1', track: 't1', title: 'Fundamentals of Testing', order: 1, source: 'x', quizPool: 'x', deck: 'x', lessonIds: [] },
    // Module-8-shaped module: real module, EMPTY deck (comment-only TOML).
    { id: 'm8', track: 't1', title: 'Exam Readiness', order: 8, source: 'x', quizPool: 'x', deck: 'x', lessonIds: [] },
  ],
  readiness: { examIds: [], passPct: 65, readyPct: 80 },
};

const bundle: ContentBundle = {
  tracks: [track], lessons: {}, questions: [],
  flashcards: [{ id: 'c1', front: 'What is testing?', back: 'Checking for defects', tags: ['ch1'] }],
  exams: [], diagrams: {},
  questionsByModule: {}, cardsByModule: { m1: ['c1'], m8: [] },
};

function renderFlashcards(path = '/flashcards') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider adapter={adapter as StorageAdapter}>
        <ContentProvider seed={bundle}>
          <Routes>
            <Route path="/flashcards" element={<FlashcardsPage />} />
            <Route path="/flashcards/:moduleId" element={<FlashcardsPage />} />
          </Routes>
        </ContentProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('FlashcardsPage deck grid (M5 Task 1)', () => {
  it('hides zero-card decks from the grid', async () => {
    renderFlashcards();
    const grid = await waitFor(() => screen.getByText('Flashcards').closest('div')!);
    // The card-bearing deck stays, with its live due/total line.
    const full = within(grid).getByText('Fundamentals of Testing').closest('a')!;
    expect(full.textContent).toContain('1 due · 1 total');
    // The empty deck is gone entirely — no "0 due · 0 total" tile, no title.
    expect(within(grid).queryByText('Exam Readiness')).toBeNull();
    expect(within(grid).queryByText(/0 due · 0 total/)).toBeNull();
  });

  it('still serves a zero-card deck reached by deep link', async () => {
    // The grid filter is display-only: /flashcards/m8 keeps its back-link and
    // the (empty) review session, so an old bookmark never 404s.
    renderFlashcards('/flashcards/m8');
    await waitFor(() => expect(screen.getByText(/← Exam Readiness/)).toBeTruthy());
    // ReviewSession resolves its own review-state fetch after the page
    // renders — the empty deck's session-complete line needs its own wait.
    await waitFor(() => expect(screen.getByText(/session complete/i)).toBeTruthy());
  });
});
