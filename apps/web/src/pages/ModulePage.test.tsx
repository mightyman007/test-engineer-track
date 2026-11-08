import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ModulePage } from './ModulePage.js';
import { ContentProvider } from '../lib/content-context.js';
import { SessionProvider } from '../state/session.js';
import type { ContentBundle, ExamDefinition, LessonMeta, Module, Track } from 'tet-core';
import type { StorageAdapter } from 'tet-storage';

// ModulePage's section gating (M5 Task 2): the readiness hub REPLACES the
// Practice card ONLY when a module has no question pool of its own AND the
// track actually wires readiness exams. Every other combination keeps the
// normal Practice card — an empty-pool module on an exam-less track must not
// lose its quiz/flashcard entry just because its pool is empty.

const lesson = (id: string, moduleId: string): LessonMeta => ({
  id, module: moduleId, title: `Lesson ${id}`, minutes: 5,
  objectives: [], videos: [], diagrams: [], body: '',
});

const modules: Module[] = [
  { id: 'm1', track: 't1', title: 'Question Module', order: 1, source: 'x', quizPool: 'x', deck: 'x', lessonIds: ['l1'] },
  { id: 'm2', track: 't1', title: 'Readiness Hub', order: 2, source: 'x', quizPool: 'x', deck: 'x', lessonIds: ['l2'] },
];

const exam: ExamDefinition = {
  id: 'e1', track: 't1', title: 'Mock Exam 1', timeLimitMin: 45,
  passPct: 65, total: 30, multiSelectMax: 2, groups: [{ tag: 'ch1', count: 30 }],
};

const wiredTrack: Track = {
  id: 't1', title: 'T', description: 'D', order: 1, modules,
  readiness: { examIds: ['e1'], passPct: 65, readyPct: 80 },
};
// Same modules, but the track wires no exams — the AI-track-before-M4 shape.
const examlessTrack: Track = { ...wiredTrack, readiness: { examIds: [], passPct: 65, readyPct: 80 } };

const baseBundle = (track: Track, exams: ExamDefinition[]): ContentBundle => ({
  tracks: [track],
  lessons: { l1: lesson('l1', 'm1'), l2: lesson('l2', 'm2') },
  questions: [], flashcards: [], exams,
  diagrams: {},
  questionsByModule: { m1: ['q1'], m2: [] },
  cardsByModule: { m1: ['c1'], m2: [] },
});

const wiredBundle = baseBundle(wiredTrack, [exam]);
const examlessBundle = baseBundle(examlessTrack, []);

const adapter: Partial<StorageAdapter> = {
  getSession: () => Promise.resolve(null),
  getProgress: () => Promise.resolve({}),
  getQuizAttempts: () => Promise.resolve([]),
  getExamAttempts: () => Promise.resolve([]),
};

function renderModule(moduleId: string, bundle: ContentBundle) {
  return render(
    <MemoryRouter initialEntries={[`/module/${moduleId}`]}>
      <SessionProvider adapter={adapter as StorageAdapter}>
        <ContentProvider seed={bundle}>
          <Routes>
            <Route path="/module/:moduleId" element={<ModulePage />} />
          </Routes>
        </ContentProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('ModulePage section gating', () => {
  it('empty-pool module on an exam-wired track: readiness hub replaces Practice', async () => {
    renderModule('m2', wiredBundle);
    await waitFor(() => expect(screen.getByRole('heading', { name: /readiness hub/i })).toBeTruthy());
    expect(screen.getByRole('heading', { name: /take a mock exam/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Mock Exam 1' })).toBeTruthy();
    // The whole Practice card is replaced — quiz AND flashcards entries gone.
    expect(screen.queryByRole('link', { name: /module quiz/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /flashcards/i })).toBeNull();
    expect(screen.queryByRole('heading', { name: /practice/i })).toBeNull();
  });

  it('question-bearing module on an exam-wired track: normal Practice card', async () => {
    renderModule('m1', wiredBundle);
    await waitFor(() => expect(screen.getByRole('heading', { name: /question module/i })).toBeTruthy());
    expect(screen.getByRole('heading', { name: /practice/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /module quiz/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /flashcards/i })).toBeTruthy();
    // A module with its own pool never gets the hub, even on a wired track.
    expect(screen.queryByRole('heading', { name: /take a mock exam/i })).toBeNull();
  });

  it('empty-pool module on an exam-less track: normal Practice card', async () => {
    // The examIds conjunct: an empty pool alone must not promote the hub —
    // there are no exams to list, so the module would dead-end with neither
    // quiz nor exams.
    renderModule('m2', examlessBundle);
    await waitFor(() => expect(screen.getByRole('heading', { name: /readiness hub/i })).toBeTruthy());
    expect(screen.getByRole('heading', { name: /practice/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /module quiz/i })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /take a mock exam/i })).toBeNull();
  });
});
