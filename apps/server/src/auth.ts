import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getCookie } from 'hono/cookie';
import type { Context, Next } from 'hono';
import type { DataStore } from './store/index.js';

export const COOKIE = 'tet_session';
const SESSION_DAYS = 30;

export type AppEnv = { Variables: { store: DataStore; user: AuthedUser } };

export interface AuthedUser {
  id: number; username: string; displayName: string; role: 'admin' | 'learner';
}

export function hashPassword(pw: string): string { return bcrypt.hashSync(pw, 10); }
export function verifyPassword(pw: string, hash: string): boolean { return bcrypt.compareSync(pw, hash); }

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(store: DataStore, userId: number): Promise<{ token: string; expiresAt: string }> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await store.insertSession({ tokenHash: tokenHash(token), userId, expiresAt });
  return { token, expiresAt };
}

export function sessionCookie(token: string, expiresAt: string): string {
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${new Date(expiresAt).toUTCString()}`;
}
export function clearCookie(): string {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function userFromCookie(store: DataStore, c: Context): Promise<AuthedUser | null> {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  const row = await store.getSessionByTokenHash(tokenHash(token));
  if (!row || new Date(row.expiresAt) < new Date()) return null;
  return { id: row.id, username: row.username, displayName: row.displayName, role: row.role };
}

export function requireAuth() {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = await userFromCookie(c.get('store'), c);
    if (!user) return c.json({ error: 'unauthorized' }, 401);
    c.set('user', user);
    await next();
  };
}

export function requireAdmin() {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = await userFromCookie(c.get('store'), c);
    if (!user) return c.json({ error: 'unauthorized' }, 401);
    if (user.role !== 'admin') return c.json({ error: 'forbidden' }, 403);
    c.set('user', user);
    await next();
  };
}
