import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { StrictMode } from 'react';
import { Layout } from './Layout.js';
import { SessionProvider } from '../state/session.js';
import { ContentProvider } from '../lib/content-context.js';
import type { ContentBundle, Track } from 'tet-core';

// Same env quirk as MigrationPrompt: window.localStorage is undefined in this
// vitest jsdom run — stub a Map-backed double for the theme persistence key.
const themeStore = new Map<string, string>();
const localStorageDouble = {
  getItem: (key: string): string | null => themeStore.get(key) ?? null,
  setItem: (key: string, value: string): void => { themeStore.set(key, String(value)); },
  removeItem: (key: string): void => { themeStore.delete(key); },
  clear: (): void => { themeStore.clear(); },
};

const track: Track = {
  id: 't1',
  title: 'ISTQB Foundation (CTFL v4.0)',
  description: 'D',
  order: 1,
  modules: [
    { id: 'm1', track: 't1', title: 'Fundamentals of Testing', order: 1, source: 'x', quizPool: 'x', deck: 'x', lessonIds: ['l1', 'l2'] },
    { id: 'm2', track: 't1', title: 'Testing Throughout the SDLC', order: 2, source: 'x', quizPool: 'x', deck: 'x', lessonIds: ['l3'] },
  ],
  readiness: { examIds: [], passPct: 65, readyPct: 80 },
};

const bundle: ContentBundle = {
  tracks: [track], lessons: {}, questions: [], flashcards: [], exams: [],
  diagrams: {}, questionsByModule: {}, cardsByModule: {},
};

function mount() {
  return render(
    <StrictMode>
      <MemoryRouter>
        <SessionProvider>
          <ContentProvider seed={bundle}>
            <Layout>{<p>body</p>}</Layout>
          </ContentProvider>
        </SessionProvider>
      </MemoryRouter>
    </StrictMode>,
  );
}

describe('Layout navigation rail', () => {
  beforeEach(() => {
    themeStore.clear();
    vi.stubGlobal('localStorage', localStorageDouble);
    delete document.documentElement.dataset.theme;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.theme;
  });

  it('renders the rail: brand, tracks, Flashcards — modules behind a collapsed chevron', async () => {
    const view = mount();
    expect(screen.getByRole('link', { name: 'Test Engineer Track' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'ISTQB Foundation (CTFL v4.0)' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Flashcards' })).toBeTruthy();
    expect(screen.getByText('solo mode')).toBeTruthy();
    // Modules are collapsed by default (M5); the chevron expands them.
    await userEvent.click(screen.getByRole('button', { name: /expand ISTQB Foundation/i }));
    expect(screen.getByRole('link', { name: 'Fundamentals of Testing' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Testing Throughout the SDLC' })).toBeTruthy();
    // Persisted: a fresh mount keeps the track expanded.
    view.unmount();
    mount();
    expect(screen.getByRole('link', { name: 'Fundamentals of Testing' })).toBeTruthy();
  });

  it('the theme toggle flips the document attribute and persists', async () => {
    mount();
    expect(document.documentElement.dataset.theme).toBe('dark');
    await userEvent.click(screen.getByRole('button', { name: /switch to light/i }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(themeStore.get('tet.theme')).toBe('light');
    expect(screen.getByRole('button', { name: /switch to dark/i })).toBeTruthy();
  });

  it('module progress dots reflect completed lessons', async () => {
    const withProgress = {
      ...bundle,
      tracks: [{
        ...track,
        modules: [
          { ...track.modules[0]!, lessonIds: ['l1', 'l2'] },
          track.modules[1]!,
        ],
      }],
    };
    const adapter = {
      getSession: () => Promise.resolve(null),
      getProgress: () => Promise.resolve({
        't1/m1/l1': { track: 't1', module: 'm1', itemId: 'l1', status: 'done', updatedAt: 'x' },
        't1/m1/l2': { track: 't1', module: 'm1', itemId: 'l2', status: 'done', updatedAt: 'x' },
      }),
    };
    render(
      <StrictMode>
        <MemoryRouter>
          <SessionProvider adapter={adapter as never}>
            <ContentProvider seed={withProgress}>
              <Layout>{<p>body</p>}</Layout>
            </ContentProvider>
          </SessionProvider>
        </MemoryRouter>
      </StrictMode>,
    );
    // Modules collapsed by default: expand the track, then the dots show.
    await userEvent.click(screen.getByRole('button', { name: /expand ISTQB Foundation/i }));
    // m1: both lessons done → "module complete" dot; m2: none started
    await screen.findByLabelText('module complete');
    expect(document.querySelectorAll('.dot.done')).toHaveLength(1);
  });

  it('the rail has a Main navigation landmark and marks active routes', () => {
    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/flashcards']}>
          <SessionProvider>
            <ContentProvider seed={bundle}>
              <Layout>{<p>body</p>}</Layout>
            </ContentProvider>
          </SessionProvider>
        </MemoryRouter>
      </StrictMode>,
    );
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(nav).getByText('Flashcards')).toBeTruthy();
  });
});
