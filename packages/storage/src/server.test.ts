import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createServerAdapter } from './server.js';
import type { QuizAttempt } from './types.js';

const attempt: QuizAttempt = {
  attemptId: 'a1', module: 'm1', score: 1, max: 2,
  perQuestion: { q1: true }, createdAt: '2026-11-07T00:00:00Z',
};

/**
 * Fetch stub that answers each call with the next scripted status (defaulting
 * to 200 with a JSON body) — lets tests drive exact 401/4xx/5xx sequences.
 */
function scriptedFetch(script: number[]): { fetchLike: typeof fetch; calls: () => number } {
  const statuses = [...script];
  let count = 0;
  const fetchLike = vi.fn(async () => {
    count++;
    const status = statuses.length > 0 ? statuses.shift()! : 200;
    return new Response(status === 200 ? '[]' : 'body', { status });
  }) as unknown as typeof fetch;
  return { fetchLike, calls: () => count };
}

function adapterWith(script: number[]) {
  const { fetchLike, calls } = scriptedFetch(script);
  const reAuthCalls = { count: 0 };
  const adapter = createServerAdapter({
    serverUrl: 'http://srv',
    fetchLike,
    onUnauthorized: async () => { reAuthCalls.count++; },
  });
  return { adapter, calls, reAuthCalls };
}

describe('ServerAdapter non-2xx handling', () => {
  let errSpy: { mockRestore: () => void };
  beforeEach(() => { errSpy = vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { errSpy.mockRestore(); });

  it('throws on a fresh send that answers 5xx (callers surface the failure)', async () => {
    const { adapter } = adapterWith([500]);
    await expect(adapter.recordQuizAttempt(attempt)).rejects.toThrow(/request failed: 500/);
    expect(adapter.pendingWrites?.()).toBe(0); // fresh failures throw, never buffer
  });

  it('throws on a fresh send that answers 4xx', async () => {
    const { adapter } = adapterWith([400]);
    await expect(adapter.recordQuizAttempt(attempt)).rejects.toThrow(/request failed: 400/);
  });

  it('keeps a 5xx replay item at the head of the buffer (retryable)', async () => {
    // 401 buffers the write; the next drain answers 500 (stays queued); the
    // drain after that answers 200 and the item lands.
    const { adapter, calls } = adapterWith([401, 500, 200, 200]);
    await adapter.recordQuizAttempt(attempt); // 401 → buffered
    expect(adapter.pendingWrites?.()).toBe(1);

    expect(await adapter.getQuizAttempts()).toEqual([]); // drain attempt → 500 → item stays
    expect(adapter.pendingWrites?.()).toBe(1);           // NOT shifted out by the 500

    expect(await adapter.getQuizAttempts()).toEqual([]); // next drain → 200 → delivered
    expect(adapter.pendingWrites?.()).toBe(0);
    // Calls: 401 POST, 500 POST, GET, 200 POST, GET — the buffered POST was
    // replayed exactly once after its 500, never dropped.
    expect(calls()).toBe(5);
  });

  it('drops a 4xx replay item with a console.error (no head-of-line blocking)', async () => {
    const { adapter } = adapterWith([401, 400, 200]);
    await adapter.recordQuizAttempt(attempt); // 401 → buffered
    expect(adapter.pendingWrites?.()).toBe(1);

    expect(await adapter.getQuizAttempts()).toEqual([]); // drain: 400 → dropped, then GET succeeds
    expect(adapter.pendingWrites?.()).toBe(0);
    expect(errSpy).toHaveBeenCalledWith('[tet] dropped buffered write:', '/api/attempts/quiz', 400);
  });

  it('drainPending() flushes buffered writes on demand', async () => {
    const { adapter, calls } = adapterWith([401, 200]);
    await adapter.recordQuizAttempt(attempt); // 401 → buffered
    expect(adapter.pendingWrites?.()).toBe(1);
    await adapter.drainPending?.();
    expect(adapter.pendingWrites?.()).toBe(0);
    expect(calls()).toBe(2); // 401 POST + successful replay POST
  });
});
