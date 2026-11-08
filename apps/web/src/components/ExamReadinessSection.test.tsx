import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router';
import { ExamReadinessSection } from './ExamReadinessSection.js';
import { ContentProvider } from '../lib/content-context.js';
import type { ContentBundle, ExamDefinition, Track } from 'tet-core';
import type { ExamAttempt } from 'tet-storage';

// The readiness hub section renders three data states (spec §5): a fresh
// learner with no attempts, a learner whose last 2 attempts average at/above
// readyPct, and one below. Attempts arrive as a plain prop — the component
// fetches nothing, so tests drive every state without a storage adapter.
const exams: ExamDefinition[] = [1, 2].map((n) => ({
  id: `mock-${n}`,
  track: 't1',
  title: `ISTQB CTFL Mock Exam ${n}`,
  timeLimitMin: 60,
  passPct: 65,
  total: 40,
  multiSelectMax: 2,
  groups: [{ tag: 'ch1', count: 40 }],
}));

const track: Track = {
  id: 't1', title: 'ISTQB Foundation', description: 'D', order: 1,
  modules: [],
  readiness: { examIds: ['mock-1', 'mock-2'], passPct: 65, readyPct: 80 },
};

const bundle: ContentBundle = {
  tracks: [track], lessons: {}, questions: [], flashcards: [], exams,
  diagrams: {}, questionsByModule: {}, cardsByModule: {},
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

function renderSection(attempts: ExamAttempt[] = [], t: Track = track) {
  return render(
    <MemoryRouter>
      <ContentProvider seed={{ ...bundle, tracks: [t] }}>
        <ExamReadinessSection track={t} attempts={attempts} />
      </ContentProvider>
    </MemoryRouter>,
  );
}

describe('ExamReadinessSection', () => {
  it('renders the exam list and the no-reading message on fresh storage', () => {
    renderSection();
    // Every wired exam is an entry link with its blueprint summary.
    expect(screen.getByRole('link', { name: 'ISTQB CTFL Mock Exam 1' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'ISTQB CTFL Mock Exam 2' })).toBeTruthy();
    expect(screen.getAllByText(/40 questions · 60 min/)).toHaveLength(2);
    // No attempts → no readiness reading, no verdict wording, no history.
    expect(screen.getByText('Take 2 mock exams to get a readiness reading')).toBeTruthy();
    expect(screen.queryByText(/Ready for the real exam/)).toBeNull();
    expect(screen.queryByText(/average/)).toBeNull();
    expect(screen.queryByText(/Recent attempts/)).toBeNull();
  });

  it('shows the green ready flag when the last 2 attempts average ≥ readyPct', () => {
    renderSection([
      attempt(1, 'mock-1', 85, '02'),
      attempt(2, 'mock-2', 90, '03'),
    ]);
    const flag = screen.getByText('Ready for the real exam');
    expect(flag.className).toContain('flag ok');
    expect(screen.queryByText(/Not yet/)).toBeNull();
  });

  it('shows the not-ready verdict with the last-2 average below readyPct', () => {
    renderSection([
      attempt(1, 'mock-1', 60, '02'),
      attempt(2, 'mock-2', 70, '03'),
    ]);
    const flag = screen.getByText('Not yet — last 2 average 65%');
    expect(flag.className).toContain('flag warn');
    expect(screen.queryByText(/Ready for the real exam/)).toBeNull();
  });

  it('lists recent attempt history (score · date · exam), newest first', () => {
    renderSection([
      attempt(1, 'mock-1', 85, '02'),
      attempt(2, 'mock-2', 70, '03'),
    ]);
    expect(screen.getByText('Recent attempts')).toBeTruthy();
    const scoreLinks = screen.getAllByRole('link', { name: /\d+%/ });
    expect(scoreLinks.map((l) => l.textContent)).toEqual(['70%', '85%']);
    expect(screen.getByText(/· 2026-01-03 · ISTQB CTFL Mock Exam 2/)).toBeTruthy();
    expect(screen.getByText(/· 2026-01-02 · ISTQB CTFL Mock Exam 1/)).toBeTruthy();
  });

  it('needs 2 attempts even when the single one is excellent', () => {
    renderSection([attempt(1, 'mock-1', 100, '02')]);
    expect(screen.getByText('Take 2 mock exams to get a readiness reading')).toBeTruthy();
    expect(screen.getByText('Recent attempts')).toBeTruthy();
  });

  it('ignores attempts on exams outside the track readiness list', () => {
    renderSection([
      attempt(1, 'other-exam', 100, '02'),
      attempt(2, 'other-exam', 100, '03'),
    ]);
    expect(screen.getByText('Take 2 mock exams to get a readiness reading')).toBeTruthy();
    expect(screen.queryByText(/Ready for the real exam/)).toBeNull();
  });
});
