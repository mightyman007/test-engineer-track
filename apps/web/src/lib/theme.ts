export type Theme = 'dark' | 'light';
const KEY = 'tet.theme';

/** Dark is the product default; a stored preference wins. */
export function getTheme(): Theme {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
  return stored === 'light' ? 'light' : 'dark';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(KEY, theme);
  document.documentElement.dataset.theme = theme;
}

/** Apply the stored/default theme before first paint (called from index.html). */
export function applyStoredTheme(): void {
  document.documentElement.dataset.theme = getTheme();
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
