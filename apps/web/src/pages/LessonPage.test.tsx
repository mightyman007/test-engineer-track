import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { LessonPage } from './LessonPage.js';
import { ContentProvider } from '../lib/content-context.js';
import { SessionProvider } from '../state/session.js';
import type { ContentBundle } from 'tet-core';
import type { StorageAdapter } from 'tet-storage';

const bundle: ContentBundle = {
  tracks: [{
    id: 't1', title: 'T', description: 'D', order: 1,
    modules: [{ id: 'm1', track: 't1', title: 'M1', order: 1, source: 'x', quizPool: 'x', deck: 'x', lessonIds: ['l1', 'l2'] }],
    readiness: { examIds: [], passPct: 65, readyPct: 80 },
  }],
  lessons: {
    l1: {
      id: 'l1', module: 'm1', title: 'What is Testing?', minutes: 10, objectives: ['FL-1.1.1'],
      videos: [{ title: 'Intro', url: 'https://www.youtube.com/watch?v=aircAruvnKk' }],
      diagrams: [{ title: 'D1', file: 'diagrams/x.svg' }],
      body: '## Testing fundamentals\n\n![D1](diagrams/x.svg)\n\nLearn about [CNNs](https://www.youtube.com/watch?v=aircAruvnKk).',
    },
    l2: { id: 'l2', module: 'm1', title: 'Next Lesson', minutes: 5, objectives: [], videos: [{ title: 'v', url: 'https://www.youtube.com/watch?v=aircAruvnKk' }], diagrams: [{ title: 'd', file: 'diagrams/x.svg' }], body: 'body' },
    l3: {
      id: 'l3', module: 'm1', title: 'With a Demo', minutes: 8, objectives: [],
      videos: [{ title: 'v', url: 'https://www.youtube.com/watch?v=aircAruvnKk' }],
      diagrams: [{ title: 'd', file: 'diagrams/x.svg' }],
      demo: 'perceptron',
      body: '## Try it\n\nThe demo appears below this body.',
    },
    l4: {
      id: 'l4', module: 'm1', title: 'Mandatory First', minutes: 12, objectives: [],
      videos: [
        { title: 'Video One', url: 'https://www.youtube.com/watch?v=O96fE1E-rf8' },
        { title: 'Video Two', url: 'https://www.youtube.com/watch?v=ukLnPbIffxE' },
      ],
      diagrams: [{ title: 'd', file: 'diagrams/x.svg' }],
      videosFirst: true,
      mandatoryVideos: true,
      body: '## Body heading\n\nThis body renders below the videos.',
    },
  },
  questions: [], flashcards: [], exams: [], diagrams: { 'diagrams/x.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>' },
  questionsByModule: {}, cardsByModule: {},
};

const writes: unknown[] = [];
const adapter: Partial<StorageAdapter> = {
  getSession: () => Promise.resolve(null),
  getProgress: () => Promise.resolve({}),
  putProgress: async (entries) => { writes.push(entries); },
};

function mount(lesson = 'l1') {
  return render(
    <MemoryRouter initialEntries={[`/lesson/${lesson}`]}>
      <SessionProvider adapter={adapter as StorageAdapter}>
        <ContentProvider seed={bundle}>
          <Routes>
            <Route path="/lesson/:lessonId" element={<LessonPage />} />
          </Routes>
        </ContentProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe('LessonPage', () => {
  it('renders title, inline SVG diagram, embedded video, and external term link', async () => {
    mount();
    await waitFor(() => expect(screen.getByRole('heading', { name: /what is testing/i })).toBeTruthy());
    expect(document.querySelector('svg')).toBeTruthy();
    expect(document.querySelector('iframe[title="Intro"]')).toBeTruthy();
    const a = document.querySelector('a[href*="aircAruvnKk"]')!;
    expect(a.getAttribute('target')).toBe('_blank');
    // No demo declared on this lesson → no demo controls.
    expect(screen.queryByRole('button', { name: /train/i })).toBeNull();
  });

  it('marks the lesson complete and writes progress', async () => {
    mount();
    await waitFor(() => expect(screen.getByRole('button', { name: /mark lesson complete/i })).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: /mark lesson complete/i }));
    await waitFor(() => expect(writes).toHaveLength(1));
    expect((writes[0] as Array<{ itemId: string; status: string }>)[0]).toMatchObject({ itemId: 'l1', status: 'done' });
  });

  it('renders the demo component named in the lesson frontmatter below the body', async () => {
    mount('l3');
    await waitFor(() => expect(screen.getByRole('heading', { name: /with a demo/i })).toBeTruthy());
    // The lesson body's own heading renders, then the perceptron demo follows.
    expect(screen.getByRole('heading', { name: /try it/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /train/i })).toBeTruthy();
    expect(screen.getByText(/step 0 · loss/)).toBeTruthy();
  });

  it('renders videos above the body when the lesson declares videosFirst', async () => {
    mount('l4');
    await waitFor(() => expect(screen.getByRole('heading', { name: /mandatory first/i })).toBeTruthy());
    const firstVideo = document.querySelector('iframe[title="Video One"]')!;
    const bodyHeading = screen.getByRole('heading', { name: /body heading/i });
    // DOCUMENT_POSITION_FOLLOWING: bodyHeading comes after firstVideo in tree order.
    expect(firstVideo.compareDocumentPosition(bodyHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('gates completion on acknowledging every mandatory video', async () => {
    const writesBefore = writes.length;
    mount('l4');
    const complete = await waitFor(() => {
      const b = screen.getByRole('button', { name: /mark lesson complete/i }) as HTMLButtonElement;
      expect(b.disabled).toBe(true);
      return b;
    });
    await userEvent.click(screen.getByRole('checkbox', { name: /i've watched video one/i }));
    expect(complete.disabled).toBe(true);
    await userEvent.click(screen.getByRole('checkbox', { name: /i've watched video two/i }));
    expect(complete.disabled).toBe(false);
    await userEvent.click(complete);
    await waitFor(() => expect(writes.length).toBe(writesBefore + 1));
    expect((writes[writes.length - 1] as Array<{ itemId: string; status: string }>)[0]).toMatchObject({ itemId: 'l4', status: 'done' });
  });

  it('keeps completion ungated for lessons without mandatoryVideos', async () => {
    mount('l2');
    const complete = await waitFor(() => screen.getByRole('button', { name: /mark lesson complete/i }) as HTMLButtonElement);
    expect((complete as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
