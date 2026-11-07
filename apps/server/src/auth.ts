import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getCookie } from 'hono/cookie';
import type { Context, Next } from 'hono';
import type { DB } from './db.js';

export const COOKIE = 'tet_session';
const SESSION_DAYS = 30;

export type AppEnv = { Variables: { db: DB; user: AuthedUser } };

export interface AuthedUser {
  id: number; username: string; displayName: string; role: 'admin' | 'learner';
}

export function hashPassword(pw: string): string { return bcrypt.hashSync(pw, 10); }
export function verifyPassword(pw: string, hash: string): boolean { return bcrypt.compareSync(pw, hash); }

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createSession(db: DB, userId: number): { token: string; expiresAt: string } {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .run(tokenHash(token), userId, expiresAt);
  return { token, expiresAt };
}

export function sessionCookie(token: string, expiresAt: string): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}`;
}
export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function userFromCookie(db: DB, c: Context): AuthedUser | null {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  const row = db.prepare(`
    SELECT u.id, u.username, u.display_name AS displayName, u.role, s.expires_at AS expiresAt
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?`).get(tokenHash(token)) as
    { id: number; username: string; displayName: string; role: 'admin' | 'learner'; expiresAt: string } | undefined;
  if (!row || new Date(row.expiresAt) < new Date()) return null;
  return { id: row.id, username: row.username, displayName: row.displayName, role: row.role };
}

export function requireAuth() {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = userFromCookie(c.get('db'), c);
    if (!user) return c.json({ error: 'unauthorized' }, 401);
    c.set('user', user);
    await next();
  };
}

export function requireAdmin() {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = userFromCookie(c.get('db'), c);
    if (!user) return c.json({ error: 'unauthorized' }, 401);
    if (user.role !== 'admin') return c.json({ error: 'forbidden' }, 403);
    c.set('user', user);
    await next();
  };
}
