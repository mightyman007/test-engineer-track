import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { DataStore } from './types.js';

const STATE = { ease: 2.5, intervalDays: 1, dueAt: '2026-11-08T00:00:00Z', reps: 1, lapses: 0 };

/**
 * The storage-parity behavioral suite. `drivers` names every DataStore
 * implementation the suite must prove equivalent; each test runs once per
 * driver against a FRESH store. `make` may be async (the real-Postgres driver
 * wipes its tables before handing the store over). `skip` marks drivers that
 * only run when their backing engine is available (opt-in).
 */
export function runStoreParitySuite(
  drivers: Array<[string, () => DataStore | Promise<DataStore>]>,
  options: { skip?: boolean } = {},
): void {
  const suite = options.skip ? describe.skipIf(options.skip) : describe;
  suite.each(drivers)('DataStore parity — %s', (name, make) => {
    let store: DataStore;
    beforeEach(async () => { store = await make(); });
    afterEach(async () => { await store.close(); });

    // ---- users ----
    it('creates a user and reads it back by username / id', async () => {
      const id = await store.createUser({
        username: 'ada', displayName: 'Ada', passwordHash: 'h1', role: 'admin', createdAt: '2026-11-07T00:00:00Z',
      });
      expect(id).toBeGreaterThan(0);
      const byName = await store.getUserByUsername('ada');
      expect(byName).toMatchObject({ id, username: 'ada', displayName: 'Ada', passwordHash: 'h1', role: 'admin' });
      expect(byName!.identityId).toBeNull();
      expect(byName!.email).toBeNull();
      expect(byName!.authProvider).toBe('local');
      expect(byName!.lastSeenAt).toBeNull();
      const byId = await store.getUserById(id);
      expect(byId!.username).toBe('ada');
      expect(await store.getUserByUsername('nobody')).toBeNull();
      expect(await store.getUserById(99999)).toBeNull();
    });

    it('counts users', async () => {
      expect(await store.countUsers()).toBe(0);
      await store.createUser({ username: 'a1', displayName: 'A', passwordHash: 'h', role: 'admin', createdAt: 't0' });
      await store.createUser({ username: 'a2', displayName: 'B', passwordHash: 'h', role: 'learner', createdAt: 't0' });
      expect(await store.countUsers()).toBe(2);
    });

    it('rejects a duplicate username', async () => {
      const input = { username: 'dup', displayName: 'D', passwordHash: 'h', role: 'learner' as const, createdAt: 't0' };
      await store.createUser(input);
      await expect(store.createUser(input)).rejects.toThrow();
    });

    it('touches last_seen_at and resets passwords (false when user missing)', async () => {
      const id = await store.createUser({ username: 'u1', displayName: 'U', passwordHash: 'h', role: 'learner', createdAt: 't0' });
      await store.updateUserLogin(id, '2026-11-07T12:00:00Z');
      expect((await store.getUserById(id))!.lastSeenAt).toBe('2026-11-07T12:00:00Z');
      expect(await store.updateUserPassword(id, 'h2')).toBe(true);
      expect((await store.getUserById(id))!.passwordHash).toBe('h2');
      expect(await store.updateUserPassword(424242, 'h3')).toBe(false);
    });

    // ---- SSO identity (M6 flow against the store) ----
    it('provisions an SSO identity and finds it back (identity_id unique)', async () => {
      const id = await store.createUser({
        username: 'sso-ident', displayName: 'SSO', passwordHash: 'sso:no-password', role: 'admin', createdAt: 't0',
        identity: { identityId: 'identity-1', email: 'a@applied.co', authProvider: 'ondana-sso' },
      });
      const found = await store.getUserByIdentityId('identity-1');
      expect(found!.id).toBe(id);
      expect(found!.email).toBe('a@applied.co');
      expect(await store.getUserByIdentityId('identity-other')).toBeNull();
      // Same identity again → the unique index rejects a second provision.
      await expect(store.createUser({
        username: 'sso-again', displayName: 'X', passwordHash: 'sso:no-password', role: 'learner', createdAt: 't0',
        identity: { identityId: 'identity-1', email: null, authProvider: 'ondana-sso' },
      })).rejects.toThrow();
    });

    it('updateUserSso refreshes the name and COALESCEs the email', async () => {
      const id = await store.createUser({
        username: 'sso-x', displayName: 'Old', passwordHash: 'sso:no-password', role: 'learner', createdAt: 't0',
        identity: { identityId: 'identity-2', email: 'first@applied.co', authProvider: 'ondana-sso' },
      });
      await store.updateUserSso(id, 'New', null, '2026-11-07T00:00:00Z');
      let row = await store.getUserById(id);
      expect(row!.displayName).toBe('New');          // display_name always refreshed
      expect(row!.email).toBe('first@applied.co');   // null email must NOT wipe the stored one
      expect(row!.lastSeenAt).toBe('2026-11-07T00:00:00Z');
      await store.updateUserSso(id, 'Newer', 'second@applied.co', '2026-11-08T00:00:00Z');
      row = await store.getUserById(id);
      expect(row!.displayName).toBe('Newer');
      expect(row!.email).toBe('second@applied.co');
    });

    // ---- sessions ----
    it('stores and joins sessions by token hash; deletes all sessions for a user', async () => {
      const id = await store.createUser({ username: 'sess', displayName: 'S', passwordHash: 'h', role: 'learner', createdAt: 't0' });
      await store.insertSession({ tokenHash: 'hash1', userId: id, expiresAt: '2026-12-07T00:00:00Z' });
      const row = await store.getSessionByTokenHash('hash1');
      expect(row).toMatchObject({ id, username: 'sess', displayName: 'S', role: 'learner', expiresAt: '2026-12-07T00:00:00Z' });
      // expiry stays server-side: the store returns it verbatim, the route compares
      expect((await store.getSessionByTokenHash('hash1'))!.expiresAt).toBe('2026-12-07T00:00:00Z');
      expect(await store.getSessionByTokenHash('nope')).toBeNull();
      await store.insertSession({ tokenHash: 'hash2', userId: id, expiresAt: '2026-12-08T00:00:00Z' });
      await store.deleteSessionsForUser(id);
      expect(await store.getSessionByTokenHash('hash1')).toBeNull();
      expect(await store.getSessionByTokenHash('hash2')).toBeNull();
    });

    // ---- invites ----
    it('creates invites, lists newest first, and consumes a use atomically on register', async () => {
      const admin = await store.createUser({ username: 'adm', displayName: 'A', passwordHash: 'h', role: 'admin', createdAt: 't0' });
      await store.createInvite({ code: 'FIRST', createdBy: admin, usesLeft: 5, expiresAt: null });
      await store.createInvite({ code: 'SECOND', createdBy: admin, usesLeft: 1, expiresAt: '2027-01-01T00:00:00Z' });
      const invites = await store.listInvites();
      expect(invites.map((i) => i.code)).toEqual(['SECOND', 'FIRST']); // newest first
      expect(invites[0]).toMatchObject({ usesLeft: 1, expiresAt: '2027-01-01T00:00:00Z', createdBy: admin });

      const got = await store.getInviteByCode('FIRST');
      expect(got!.usesLeft).toBe(5);
      expect(await store.getInviteByCode('MISSING')).toBeNull();

      const newId = await store.createUser({
        username: 'invited', displayName: 'I', passwordHash: 'h', role: 'learner', createdAt: 't1', inviteCode: 'FIRST',
      });
      expect(newId).toBeGreaterThan(0);
      expect((await store.getInviteByCode('FIRST'))!.usesLeft).toBe(4); // one use burned, atomically
    });

    // ---- progress ----
    it('upserts progress entries (latest wins per key)', async () => {
      const id = await store.createUser({ username: 'p1', displayName: 'P', passwordHash: 'h', role: 'learner', createdAt: 't0' });
      await store.putProgress(id, [
        { key: 't1/m1/l1', track: 't1', module: 'm1', itemId: 'l1', status: 'done', updatedAt: '2026-11-07T00:00:00Z' },
        { key: 't1/m1/l2', track: 't1', module: 'm1', itemId: 'l2', status: 'in-progress', updatedAt: '2026-11-07T00:00:01Z' },
      ]);
      await store.putProgress(id, [
        { key: 't1/m1/l1', track: 't1', module: 'm1', itemId: 'l1', status: 'in-progress', updatedAt: '2026-11-08T00:00:00Z' },
      ]);
      const rows = await store.getProgress(id);
      expect(rows).toHaveLength(2);
      const l1 = rows.find((r) => r.key === 't1/m1/l1')!;
      expect(l1).toEqual({ key: 't1/m1/l1', track: 't1', module: 'm1', itemId: 'l1', status: 'in-progress', updatedAt: '2026-11-08T00:00:00Z' });
      expect(await store.getProgress(99999)).toEqual([]);
    });

    // ---- quiz attempts ----
    it('records quiz attempts idempotently and lists newest first with module filter', async () => {
      const id = await store.createUser({ username: 'q1', displayName: 'Q', passwordHash: 'h', role: 'learner', createdAt: 't0' });
      const a1 = { attemptId: 'qa1', module: 'm1', score: 8, max: 10, perQuestion: { q1: true }, createdAt: '2026-11-07T01:00:00Z' };
      expect(await store.recordQuizAttempt(id, a1)).toBe(true);
      expect(await store.recordQuizAttempt(id, a1)).toBe(false); // duplicate replay
      await store.recordQuizAttempt(id, { attemptId: 'qa2', module: 'm2', score: 5, max: 10, perQuestion: {}, createdAt: '2026-11-07T02:00:00Z' });
      const all = await store.getQuizAttempts(id);
      expect(all.map((a) => a.attemptId)).toEqual(['qa2', 'qa1']); // created_at DESC
      expect(all[0]).toEqual({ attemptId: 'qa2', module: 'm2', score: 5, max: 10, perQuestion: {}, createdAt: '2026-11-07T02:00:00Z' });
      const filtered = await store.getQuizAttempts(id, 'm1');
      expect(filtered.map((a) => a.attemptId)).toEqual(['qa1']);
      expect(await store.getQuizAttempts(id, 'nope')).toEqual([]);
    });

    // ---- exam attempts ----
    it('records exam attempts idempotently with boolean pass state', async () => {
      const id = await store.createUser({ username: 'e1', displayName: 'E', passwordHash: 'h', role: 'learner', createdAt: 't0' });
      const a1 = {
        attemptId: 'ea1', examId: 'ISTQB-1', score: 30, max: 40, passed: true, scorePct: 75,
        perTag: { ch1: { correct: 7, total: 8 } }, responses: { q1: [0] },
        createdAt: '2026-11-07T02:00:00Z', durationSec: 1800,
      };
      expect(await store.recordExamAttempt(id, a1)).toBe(true);
      expect(await store.recordExamAttempt(id, a1)).toBe(false);
      await store.recordExamAttempt(id, { ...a1, attemptId: 'ea2', examId: 'ISTQB-2', passed: false, scorePct: 40, createdAt: '2026-11-07T03:00:00Z' });
      const rows = await store.getExamAttempts(id);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ ...a1, attemptId: 'ea2', examId: 'ISTQB-2', passed: false, scorePct: 40, createdAt: '2026-11-07T03:00:00Z' });
      expect(rows[1]!.passed).toBe(true); // boolean, not 0/1
      expect(rows[1]!.perTag).toEqual({ ch1: { correct: 7, total: 8 } });
      expect(rows[1]!.responses).toEqual({ q1: [0] });
      expect((await store.getExamAttempts(id, 'ISTQB-2')).map((r) => r.attemptId)).toEqual(['ea2']);
    });

    // ---- reviews ----
    it('records card reviews (audit + state upsert, latest wins)', async () => {
      const id = await store.createUser({ username: 'r1', displayName: 'R', passwordHash: 'h', role: 'learner', createdAt: 't0' });
      await store.recordCardReview(id, { cardId: 'c1', grade: 'good', state: STATE, createdAt: '2026-11-07T03:00:00Z' });
      await store.recordCardReview(id, { cardId: 'c1', grade: 'good', state: { ...STATE, intervalDays: 6, reps: 2 }, createdAt: '2026-11-08T03:00:00Z' });
      await store.recordCardReview(id, { cardId: 'c2', grade: 'again', state: { ...STATE, intervalDays: 1 }, createdAt: '2026-11-08T04:00:00Z' });
      const rows = await store.getReviewState(id);
      expect(rows).toHaveLength(2);
      expect(rows.find((r) => r.cardId === 'c1')).toEqual({ cardId: 'c1', ease: 2.5, intervalDays: 6, dueAt: '2026-11-08T00:00:00Z', reps: 2, lapses: 0 });
    });

    // ---- exam drafts ----
    it('roundtrips exam drafts as raw JSON strings', async () => {
      const id = await store.createUser({ username: 'd1', displayName: 'D', passwordHash: 'h', role: 'learner', createdAt: 't0' });
      expect(await store.getExamDraft(id, 'e1')).toBeNull();
      await store.putExamDraft(id, 'e1', '{"responses":{"q1":[0]}}', '2026-11-07T00:00:00Z');
      expect(await store.getExamDraft(id, 'e1')).toBe('{"responses":{"q1":[0]}}');
      await store.putExamDraft(id, 'e1', '{"responses":{"q1":[1]}}', '2026-11-07T01:00:00Z');
      expect(await store.getExamDraft(id, 'e1')).toBe('{"responses":{"q1":[1]}}');
      await store.deleteExamDraft(id, 'e1');
      expect(await store.getExamDraft(id, 'e1')).toBeNull();
      await store.deleteExamDraft(id, 'e1'); // idempotent
    });

    // ---- import ----
    it('imports migratable data idempotently in one transaction', async () => {
      const id = await store.createUser({ username: 'imp', displayName: 'I', passwordHash: 'h', role: 'learner', createdAt: 't0' });
      const payload = {
        progress: [{ key: 't1/m1/l1', track: 't1', module: 'm1', itemId: 'l1', status: 'done' as const, updatedAt: '2026-11-07T00:00:00Z' }],
        quizAttempts: [{ attemptId: 'qa1', module: 'm1', score: 8, max: 10, perQuestion: {}, createdAt: '2026-11-07T01:00:00Z' }],
        examAttempts: [{
          attemptId: 'ea1', examId: 'e1', score: 2, max: 4, passed: true, scorePct: 50,
          perTag: { ch1: { correct: 1, total: 2 } }, responses: { q1: [0] },
          createdAt: '2026-11-07T02:00:00Z', durationSec: 600,
        }],
        cardStates: [{ cardId: 'c1', state: STATE }],
      };
      await store.importAll(id, payload);
      await store.importAll(id, payload); // same ids → no duplicates
      expect(await store.getProgress(id)).toHaveLength(1);
      expect(await store.getQuizAttempts(id)).toHaveLength(1);
      expect(await store.getExamAttempts(id)).toHaveLength(1);
      const states = await store.getReviewState(id);
      expect(states).toHaveLength(1);
      expect(states[0]!.reps).toBe(1);
    });

    // ---- roster aggregates ----
    it('computes roster aggregates (counts, best percentages, tracked vs reviewed)', async () => {
      const admin = await store.createUser({ username: 'adm', displayName: 'Admin', passwordHash: 'h', role: 'admin', createdAt: 't0' });
      const learner = await store.createUser({ username: 'lea', displayName: 'L', passwordHash: 'h', role: 'learner', createdAt: 't0' });
      await store.recordQuizAttempt(learner, { attemptId: 'qa1', module: 'm1', score: 9, max: 10, perQuestion: {}, createdAt: '2026-11-07T01:00:00Z' });
      await store.recordQuizAttempt(learner, { attemptId: 'qa2', module: 'm1', score: 2, max: 3, perQuestion: {}, createdAt: '2026-11-07T01:30:00Z' });
      // A second user whose ONLY attempt has a fractional percentage, pinning the
      // ROUND(66.66…)=67 path (SQLite does it in SQL; the PG driver maps it).
      const mid = await store.createUser({ username: 'mid', displayName: 'M', passwordHash: 'h', role: 'learner', createdAt: 't0' });
      await store.recordQuizAttempt(mid, { attemptId: 'qa1', module: 'm1', score: 2, max: 3, perQuestion: {}, createdAt: '2026-11-07T01:00:00Z' });
      await store.recordExamAttempt(learner, {
        attemptId: 'ea1', examId: 'e1', score: 30, max: 40, passed: true, scorePct: 87.5,
        perTag: {}, responses: {}, createdAt: '2026-11-07T02:00:00Z', durationSec: 1200,
      });
      await store.recordCardReview(learner, { cardId: 'c1', grade: 'good', state: STATE, createdAt: '2026-11-07T03:00:00Z' });
      await store.recordCardReview(learner, { cardId: 'c1', grade: 'good', state: { ...STATE, reps: 2 }, createdAt: '2026-11-07T04:00:00Z' });

      const rows = await store.getRoster();
      expect(rows.map((r) => r.username)).toEqual(['adm', 'lea', 'mid']); // ordered by username
      const lea = rows[1]!;
      expect(lea).toEqual({
        id: learner, username: 'lea', displayName: 'L', role: 'learner', lastSeenAt: null,
        quizAttempts: 2,
        bestQuizPct: 90,        // MAX over the per-attempt percentages: 9/10 beats 2/3
        examAttempts: 1,
        bestExamPct: 87.5,      // raw, NOT rounded
        cardsTracked: 1,        // distinct cards with state
        cardsReviewed: 2,       // raw review events
      });
      expect(rows[2]!.bestQuizPct).toBe(67); // ROUND(200/3) — integer-valued in both engines
      const adm = rows[0]!;
      expect(adm.quizAttempts).toBe(0);
      expect(adm.bestQuizPct).toBeNull();
      expect(adm.bestExamPct).toBeNull();
      expect(adm.cardsTracked).toBe(0);
      expect(adm.cardsReviewed).toBe(0);
      expect(adm.id).toBe(admin);
    });

    it('roster of an empty deployment is empty', async () => {
      expect(await store.getRoster()).toEqual([]);
    });

    it('close is idempotent', async () => {
      await store.close();
      await store.close();
    });
  });
}
