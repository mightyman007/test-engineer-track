import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { StrictMode } from 'react';
import { Layout } from './Layout.js';
import { SessionProvider } from '../state/session.js';

// Same env quirk as MigrationPrompt: window.localStorage is undefined in this
// vitest jsdom run — stub a Map-backed double for the theme persistence key.
const themeStore = new Map<string, string>();
const localStorageDouble = {
  getItem: (key: string): string | null => themeStore.get(key) ?? null,
  setItem: (key: string, value: string): void => { themeStore.set(key, String(value)); },
  removeItem: (key: string): void => { themeStore.delete(key); },
  clear: (): void => { themeStore.clear(); },
};

// The theme toggle must (a) default to dark, (b) flip the document attribute
// and persist, (c) flip the icon — verified through the real Layout + provider.

function mount() {
  return render(
    <StrictMode>
      <MemoryRouter>
        <SessionProvider>
          <Layout>{<p>body</p>}</Layout>
        </SessionProvider>
      </MemoryRouter>
    </StrictMode>,
  );
}

describe('Layout theme toggle', () => {
  beforeEach(() => {
    themeStore.clear();
    vi.stubGlobal('localStorage', localStorageDouble);
    delete document.documentElement.dataset.theme;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete document.documentElement.dataset.theme;
  });

  it('defaults to dark and the toggle flips to light + persists', async () => {
    mount();
    expect(document.documentElement.dataset.theme).toBe('dark');
    await userEvent.click(screen.getByRole('button', { name: /switch to light/i }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(themeStore.get('tet.theme')).toBe('light');
    expect(screen.getByRole('button', { name: /switch to dark/i })).toBeTruthy();
  });

  it('survives StrictMode double-mount (default stays dark)', () => {
    mount();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(themeStore.has('tet.theme')).toBe(false);
  });
});
