import { generateId } from './crypto';

type SessionRow = {
  id: string;
  family_id: string;
  child_id: string;
  screen_time_request_id: string;
  source: string;
  allocated_seconds: number;
  remaining_seconds: number;
  status: 'running' | 'paused' | 'finished' | 'stopped';
  started_at: string;
  last_resumed_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

function remainingNow(row: SessionRow): number {
  if (row.status !== 'running' || !row.last_resumed_at) return Math.max(0, row.remaining_seconds);
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(row.last_resumed_at).getTime()) / 1000));
  return Math.max(0, row.remaining_seconds - elapsed);
}

async function normalizeExpired(db: D1Database, row: SessionRow | null): Promise<(SessionRow & { remaining_now: number }) | null> {
  if (!row) return null;
  const remaining = remainingNow(row);
  if (row.status === 'running' && remaining <= 0) {
    const now = new Date().toISOString();
    await db.prepare(
      `UPDATE screen_sessions SET status='finished', remaining_seconds=0, ended_at=?, updated_at=? WHERE id=? AND status='running'`
    ).bind(now, now, row.id).run();
    return { ...row, status: 'finished', remaining_seconds: 0, ended_at: now, remaining_now: 0 };
  }
  return { ...row, remaining_now: remaining };
}

export async function getScreenSessionState(db: D1Database, familyId: string, childId: string) {
  const active = await db.prepare(
    `SELECT * FROM screen_sessions WHERE family_id=? AND child_id=? AND status IN ('running','paused') ORDER BY created_at DESC LIMIT 1`
  ).bind(familyId, childId).first<SessionRow>();

  const normalized = await normalizeExpired(db, active || null);

  const { results: readyRequests } = await db.prepare(
    `SELECT r.id, r.approved_minutes, r.source, r.reviewed_at
     FROM screen_time_requests r
     LEFT JOIN screen_sessions s ON s.screen_time_request_id = r.id
     WHERE r.family_id=? AND r.child_id=? AND r.status='approved' AND r.approved_minutes > 0 AND s.id IS NULL
     ORDER BY r.reviewed_at DESC LIMIT 5`
  ).bind(familyId, childId).all();

  return {
    activeSession: normalized && ['running', 'paused'].includes(normalized.status) ? normalized : null,
    readyRequests: readyRequests || [],
  };
}

export async function startScreenSession(db: D1Database, familyId: string, childId: string, requestId: string) {
  const existingActive = await db.prepare(
    `SELECT id FROM screen_sessions WHERE family_id=? AND child_id=? AND status IN ('running','paused') LIMIT 1`
  ).bind(familyId, childId).first();
  if (existingActive) return { success: false, error: 'כבר קיים טיימר פעיל' };

  const request = await db.prepare(
    `SELECT id, approved_minutes, source FROM screen_time_requests
     WHERE id=? AND family_id=? AND child_id=? AND status='approved' AND approved_minutes > 0`
  ).bind(requestId, familyId, childId).first<{ id: string; approved_minutes: number; source: string }>();
  if (!request) return { success: false, error: 'בקשת זמן מסך מאושרת לא נמצאה' };

  const already = await db.prepare(`SELECT id FROM screen_sessions WHERE screen_time_request_id=?`).bind(requestId).first();
  if (already) return { success: false, error: 'זמן המסך הזה כבר הופעל בעבר' };

  const now = new Date().toISOString();
  const seconds = request.approved_minutes * 60;
  const id = generateId();
  await db.prepare(
    `INSERT INTO screen_sessions
      (id,family_id,child_id,screen_time_request_id,source,allocated_seconds,remaining_seconds,status,started_at,last_resumed_at,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,'running',?,?,?,?)`
  ).bind(id, familyId, childId, requestId, request.source, seconds, seconds, now, now, now, now).run();

  return { success: true, id };
}

export async function pauseScreenSession(db: D1Database, familyId: string, childId: string) {
  const row = await db.prepare(
    `SELECT * FROM screen_sessions WHERE family_id=? AND child_id=? AND status='running' ORDER BY created_at DESC LIMIT 1`
  ).bind(familyId, childId).first<SessionRow>();
  if (!row) return { success: false, error: 'אין טיימר פעיל' };

  const remaining = remainingNow(row);
  const now = new Date().toISOString();
  const status = remaining <= 0 ? 'finished' : 'paused';
  await db.prepare(
    `UPDATE screen_sessions SET status=?, remaining_seconds=?, paused_at=?, ended_at=CASE WHEN ?='finished' THEN ? ELSE ended_at END, updated_at=? WHERE id=? AND status='running'`
  ).bind(status, remaining, now, status, now, now, row.id).run();
  return { success: true, remainingSeconds: remaining, status };
}

export async function resumeScreenSession(db: D1Database, familyId: string, childId: string) {
  const row = await db.prepare(
    `SELECT * FROM screen_sessions WHERE family_id=? AND child_id=? AND status='paused' ORDER BY created_at DESC LIMIT 1`
  ).bind(familyId, childId).first<SessionRow>();
  if (!row) return { success: false, error: 'אין טיימר מושהה' };
  if (row.remaining_seconds <= 0) return { success: false, error: 'זמן המסך הסתיים' };

  const now = new Date().toISOString();
  await db.prepare(
    `UPDATE screen_sessions SET status='running', last_resumed_at=?, paused_at=NULL, updated_at=? WHERE id=? AND status='paused'`
  ).bind(now, now, row.id).run();
  return { success: true };
}

export async function stopScreenSession(db: D1Database, familyId: string, childId: string) {
  const row = await db.prepare(
    `SELECT * FROM screen_sessions WHERE family_id=? AND child_id=? AND status IN ('running','paused') ORDER BY created_at DESC LIMIT 1`
  ).bind(familyId, childId).first<SessionRow>();
  if (!row) return { success: false, error: 'אין טיימר פעיל' };

  const remaining = remainingNow(row);
  const now = new Date().toISOString();
  await db.prepare(
    `UPDATE screen_sessions SET status='stopped', remaining_seconds=?, ended_at=?, updated_at=? WHERE id=? AND status IN ('running','paused')`
  ).bind(remaining, now, now, row.id).run();
  return { success: true, remainingSeconds: remaining };
}
