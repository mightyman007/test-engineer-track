import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContentProvider } from './content-context.js';

// The provider fetches content.json when unseeded (the real app path). Tests
// stub global fetch — the LoginPage.test.tsx house pattern — so the REAL
// loadContent runs and the error wording it produces is asserted verbatim.

// An all-empty bundle is schema-valid (every field required, none min-1), so
// it exercises the full parse path without content fixtures.
const okBundle = {
  tracks: [], lessons: {}, questions: [], flashcards: [], exams: [],
  diagrams: {}, questionsByModule: {}, cardsByModule: {},
};

// Minimal fetch response double: loadContent only reads ok/status before
// deciding, and json() only after ok.
const jsonResponse = (body: unknown) => ({ ok: true, status: 200, json: () => Promise.resolve(body) });
const statusResponse = (status: number) => ({ ok: false, status, json: () => Promise.resolve({}) });

afterEach(() => vi.unstubAllGlobals());

describe('ContentProvider failure path (M5 Task 1)', () => {
  it('renders an error card instead of hanging when the fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('network down'))));
    render(
      <ContentProvider>
        <p>CHILD MARKER</p>
      </ContentProvider>,
    );
    // The old behavior kept "Loading curriculum…" forever; now an alert-role
    // error card names the failure and offers Retry, and children never mount.
    const alert = await waitFor(() => screen.getByRole('alert'));
    expect(alert.textContent).toContain('network down');
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
    expect(screen.queryByText('CHILD MARKER')).toBeNull();
    expect(screen.queryByText(/loading curriculum/i)).toBeNull();
  });

  it('distinguishes a fetch failure from a parse failure in the message', async () => {
    // 404 → fetch-failed wording (the deep-link refresh on a static host).
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(statusResponse(404))));
    const { unmount } = render(
      <ContentProvider>
        <p>CHILD MARKER</p>
      </ContentProvider>,
    );
    await waitFor(() => expect(screen.getByText(/content\.json fetch failed: 404/)).toBeTruthy());
    unmount();

    // Schema-invalid JSON → parse-failed wording (a corrupt bundle).
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(jsonResponse({ broken: true }))));
    render(
      <ContentProvider>
        <p>CHILD MARKER</p>
      </ContentProvider>,
    );
    await waitFor(() => expect(screen.getByText(/content\.json parse failed:/)).toBeTruthy());
  });

  it('renders error state and retries — recovery when the refetch succeeds', async () => {
    let fail = true;
    vi.stubGlobal('fetch', vi.fn(() =>
      fail
        ? Promise.reject(new Error('offline'))
        : Promise.resolve(jsonResponse(okBundle)),
    ));
    render(
      <ContentProvider>
        <p>CHILD MARKER</p>
      </ContentProvider>,
    );
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    // Children mount once the retry load succeeds; the error card is gone.
    await waitFor(() => expect(screen.getByText('CHILD MARKER')).toBeTruthy());
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
