import { Env, AuthUser, Session } from './types';
import { generateRandomToken } from './crypto';

const SESSION_COOKIE_NAME = 'timeplus_session';
const SESSION_DURATION_DAYS = 30;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MINUTES = 15;

export function parseCookies(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [name, ...value] = part.trim().split('=');
    if (name) {
      cookies[name] = decodeURIComponent(value.join('='));
    }
  }
  return cookies;
}

export function createSessionCookie(token: string, maxAgeDays = SESSION_DURATION_DAYS): string {
  const maxAgeSec = maxAgeDays * 24 * 60 * 60;
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function checkRateLimit(
  db: D1Database,
  ipAddress: string,
  targetId: string
): Promise<{ allowed: boolean; remainingMinutes?: number }> {
  const windowStart = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000).toISOString();
  const row = await db
    .prepare(
      `SELECT COUNT(*) as failures FROM login_attempts 
       WHERE (ip_address = ? OR target_id = ?) 
       AND success = 0 
       AND attempted_at >= ?`
    )
    .bind(ipAddress, targetId, windowStart)
    .first<{ failures: number }>();

  const failures = row?.failures || 0;
  if (failures >= MAX_FAILED_ATTEMPTS) {
    return { allowed: false, remainingMinutes: LOCKOUT_WINDOW_MINUTES };
  }
  return { allowed: true };
}

export async function recordLoginAttempt(
  db: D1Database,
  ipAddress: string,
  targetRole: string,
  targetId: string,
  success: boolean
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO login_attempts (id, ip_address, target_role, target_id, success, attempted_at)
       VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
    )
    .bind(crypto.randomUUID(), ipAddress, targetRole, targetId, success ? 1 : 0)
    .run();
}

export async function createSession(
  db: D1Database,
  familyId: string,
  role: 'parent' | 'child',
  childId: string | null = null
): Promise<{ token: string; expiresAt: string }> {
  const token = generateRandomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await db
    .prepare(
      `INSERT INTO sessions (id, family_id, role, child_id, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
    )
    .bind(token, familyId, role, childId, expiresAt)
    .run();

  return { token, expiresAt };
}

export async function getSessionUser(
  request: Request,
  db: D1Database
): Promise<AuthUser | null> {
  let token: string | null = null;

  // 1. Check Cookie
  const cookieHeader = request.headers.get('Cookie');
  const cookies = parseCookies(cookieHeader);
  if (cookies[SESSION_COOKIE_NAME]) {
    token = cookies[SESSION_COOKIE_NAME];
  }

  // 2. Check Authorization Bearer header fallback
  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) return null;

  const nowIso = new Date().toISOString();
  const session = await db
    .prepare(
      `SELECT id, family_id, role, child_id, expires_at 
       FROM sessions 
       WHERE id = ? AND expires_at > ?`
    )
    .bind(token, nowIso)
    .first<Session>();

  if (!session) return null;

  if (session.role === 'parent') {
    const family = await db
      .prepare(`SELECT id, name FROM families WHERE id = ?`)
      .bind(session.family_id)
      .first<{ id: string; name: string }>();

    if (!family) return null;
    return {
      id: 'parent',
      name: 'הורים',
      role: 'parent',
      familyId: family.id,
    };
  } else if (session.role === 'child' && session.child_id) {
    const child = await db
      .prepare(`SELECT id, family_id, name, avatar, color FROM children WHERE id = ? AND family_id = ?`)
      .bind(session.child_id, session.family_id)
      .first<{ id: string; family_id: string; name: string; avatar: string; color: string }>();

    if (!child) return null;
    return {
      id: child.id,
      name: child.name,
      role: 'child',
      familyId: child.family_id,
      avatar: child.avatar,
      color: child.color,
    };
  }

  return null;
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare(`DELETE FROM sessions WHERE id = ?`).bind(token).run();
}
