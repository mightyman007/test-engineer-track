import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyStoredTheme, getTheme, setTheme, toggleTheme } from './theme.js';

// The theme module reads the global `localStorage`, which is undefined in this
// vitest jsdom env — stub a Map-backed double (house pattern, MigrationPrompt).
const themeStore = new Map<string, string>();
const localStorageDouble = {
  getItem: (key: string): string | null => themeStore.get(key) ?? null,
  setItem: (key: string, value: string): void => { themeStore.set(key, String(value)); },
  removeItem: (key: string): void => { themeStore.delete(key); },
  clear: (): void => { themeStore.clear(); },
};

afterEach(() => {
  themeStore.clear();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.theme;
});

describe('theme', () => {
  beforeEach(() => {
    themeStore.clear();
    vi.stubGlobal('localStorage', localStorageDouble);
    delete document.documentElement.dataset.theme;
  });

  it('defaults to dark', () => {
    expect(getTheme()).toBe('dark');
  });

  it('setTheme persists and sets the document attribute', () => {
    setTheme('light');
    expect(themeStore.get('tet.theme')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(getTheme()).toBe('light');
  });

  it('applyStoredTheme applies dark without a stored preference', () => {
    applyStoredTheme();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('toggleTheme flips dark → light → dark and persists', () => {
    expect(toggleTheme()).toBe('light');
    expect(getTheme()).toBe('light');
    expect(toggleTheme()).toBe('dark');
    expect(getTheme()).toBe('dark');
  });

  it('ignores corrupt stored values (falls back to dark)', () => {
    themeStore.set('tet.theme', 'blue');
    expect(getTheme()).toBe('dark');
  });
});
