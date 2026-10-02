import { generateId } from './crypto';

type SessionMode = 'approved' | 'self';

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
  mode?: SessionMode;
};

const SELF_REVIEW_MARKER = 'child_self';

const ALLOWED_SELF_SOURCES = new Set([
  'playstation',
  'vr',
  'tv',
  'computer',
  'tablet',
  'phone',
  'youtube',
  'other',
]);

function remainingNow(row: SessionRow): number {
  if (row.status !== 'running' || !row.last_resumed_at) return Math.max(0, row.remaining_seconds);
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(row.last_resumed_at).getTime()) / 1000));
  return Math.max(0, row.remaining_seconds - elapsed);
}

function elapsedNow(row: SessionRow, remaining: number): number {
  return Math.max(0, Math.min(row.allocated_seconds, row.allocated_seconds - remaining));
}

async function recordSelfUsage(
  db: D1Database,
  row: SessionRow,
  remaining: number
): Promise<{ spentMinutes: number; newBalance?: number }> {
  if ((row.mode || 'approved') !== 'self') return { spentMinutes: 0 };

  const usedSeconds = elapsedNow(row, remaining);
  if (usedSeconds <= 0) return { spentMinutes: 0 };

  // The wallet is minute-based. Any started minute counts as one minute.
  const requestedCharge = Math.max(1, Math.ceil(usedSeconds / 60));

  const child = await db.prepare(
    `SELECT available_minutes FROM children WHERE id=? AND family_id=?`
  ).bind(row.child_id, row.family_id).first<{ available_minutes: number }>();

  if (!child) return { spentMinutes: 0 };

  // A child self-report can never push the wallet below zero.
  const spentMinutes = Math.min(requestedCharge, Math.max(0, child.available_minutes));
  if (spentMinutes <= 0) return { spentMinutes: 0, newBalance: child.available_minutes };

  const now = new Date().toISOString();
  const newBalance = child.available_minutes - spentMinutes;
  const usageLogId = generateId();

  await db.batch([
    db.prepare(
      `UPDATE children SET available_minutes=?, updated_at=? WHERE id=? AND family_id=?`
    ).bind(newBalance, now, row.child_id, row.family_id),
    db.prepare(
      `INSERT INTO screen_usage_logs
        (id,family_id,child_id,screen_time_request_id,source,minutes,reason,created_by,created_at)
       VALUES (?,?,?,NULL,?,?,?,'child',?)`
    ).bind(
      usageLogId,
      row.family_id,
      row.child_id,
      row.source,
      spentMinutes,
      'דיווח עצמי באמצעות טיימר',
      now
    ),
    db.prepare(
      `INSERT INTO minute_transactions
        (id,family_id,child_id,type,amount,balance_after,reason,screen_usage_log_id,created_by,created_at)
       VALUES (?,?,?,'spend',?,?,?,?, 'child',?)`
    ).bind(
      generateId(),
      row.family_id,
      row.child_id,
      -spentMinutes,
      newBalance,
      `ניצול זמן עצמי: ${row.source} (${spentMinutes} דק')`,
      usageLogId,
      now
    ),
    db.prepare(
      `INSERT INTO audit_log
        (id,family_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json,created_at)
       VALUES (?,?,'child',?,'self_screen_usage_logged','screen_usage_log',?,?,?)`
    ).bind(
      generateId(),
      row.family_id,
      row.child_id,
      usageLogId,
      JSON.stringify({
        source: row.source,
        usedSeconds,
        chargedMinutes: spentMinutes,
        balanceAfter: newBalance,
      }),
      now
    ),
  ]);

  return { spentMinutes, newBalance };
}

async function claimAndFinishExpiredSession(
  db: D1Database,
  row: SessionRow
): Promise<boolean> {
  const now = new Date().toISOString();

  // Claim the expiry atomically. Only the request that changes the row may
  // charge self-reported usage, preventing duplicate deductions if the cron
  // and a foreground refresh discover the same expiry at the same time.
  const claimed = await db.prepare(
    `UPDATE screen_sessions
     SET status='finished', remaining_seconds=0, ended_at=?, updated_at=?
     WHERE id=? AND status='running'`
  ).bind(now, now, row.id).run();

  const changes = Number((claimed as any)?.meta?.changes || 0);
  if (changes <= 0) return false;

  try {
    await recordSelfUsage(db, row, 0);
    return true;
  } catch (err) {
    // Make the expiry retryable if billing/logging unexpectedly fails.
    await db.prepare(
      `UPDATE screen_sessions
       SET status='running', ended_at=NULL, updated_at=?
       WHERE id=? AND status='finished'`
    ).bind(new Date().toISOString(), row.id).run();
    throw err;
  }
}

async function normalizeExpired(
  db: D1Database,
  row: SessionRow | null
): Promise<(SessionRow & { remaining_now: number; elapsed_now: number }) | null> {
  if (!row) return null;

  const remaining = remainingNow(row);
  const elapsed = elapsedNow(row, remaining);

  if (row.status === 'running' && remaining <= 0) {
    const finished = await claimAndFinishExpiredSession(db, row);
    const now = new Date().toISOString();

    return {
      ...row,
      status: 'finished',
      remaining_seconds: 0,
      ended_at: finished ? now : row.ended_at,
      remaining_now: 0,
      elapsed_now: row.allocated_seconds,
    };
  }

  return { ...row, remaining_now: remaining, elapsed_now: elapsed };
}

export type ExpiredScreenSession = {
  id: string;
  familyId: string;
  childId: string;
  source: string;
  mode: SessionMode;
};

export async function finalizeExpiredScreenSessions(
  db: D1Database
): Promise<ExpiredScreenSession[]> {
  const { results } = await db.prepare(
    `SELECT s.*,
       CASE WHEN r.reviewed_by=? THEN 'self' ELSE 'approved' END AS mode
     FROM screen_sessions s
     LEFT JOIN screen_time_requests r ON r.id=s.screen_time_request_id
     WHERE s.status='running'`
  ).bind(SELF_REVIEW_MARKER).all<SessionRow>();

  const expired: ExpiredScreenSession[] = [];

  for (const row of results || []) {
    if (remainingNow(row) > 0) continue;

    const finished = await claimAndFinishExpiredSession(db, row);
    if (!finished) continue;

    expired.push({
      id: row.id,
      familyId: row.family_id,
      childId: row.child_id,
      source: row.source,
      mode: row.mode || 'approved',
    });
  }

  return expired;
}

export async function getScreenSessionState(db: D1Database, familyId: string, childId: string) {
  const active = await db.prepare(
    `SELECT s.*,
       CASE WHEN r.reviewed_by=? THEN 'self' ELSE 'approved' END AS mode
     FROM screen_sessions s
     LEFT JOIN screen_time_requests r ON r.id=s.screen_time_request_id
     WHERE s.family_id=? AND s.child_id=? AND s.status IN ('running','paused')
     ORDER BY s.created_at DESC LIMIT 1`
  ).bind(SELF_REVIEW_MARKER, familyId, childId).first<SessionRow>();

  const normalized = await normalizeExpired(db, active || null);

  const { results: readyRequests } = await db.prepare(
    `SELECT r.id, r.approved_minutes, r.source, r.reviewed_at
     FROM screen_time_requests r
     LEFT JOIN screen_sessions s ON s.screen_time_request_id = r.id
     WHERE r.family_id=? AND r.child_id=? AND r.status='approved'
       AND r.approved_minutes > 0 AND s.id IS NULL
     ORDER BY r.reviewed_at DESC LIMIT 5`
  ).bind(familyId, childId).all();

  return {
    activeSession: normalized && ['running', 'paused'].includes(normalized.status) ? normalized : null,
    readyRequests: readyRequests || [],
    serverNowMs: Date.now(),
  };
}

export async function getFamilyActiveScreenSessions(
  db: D1Database,
  familyId: string
) {
  const { results } = await db.prepare(
    `SELECT s.*, c.name AS child_name, c.color AS child_color,
       CASE WHEN r.reviewed_by=? THEN 'self' ELSE 'approved' END AS mode
     FROM screen_sessions s
     JOIN children c ON c.id=s.child_id
     LEFT JOIN screen_time_requests r ON r.id=s.screen_time_request_id
     WHERE s.family_id=? AND s.status IN ('running','paused')
     ORDER BY s.created_at DESC`
  ).bind(SELF_REVIEW_MARKER, familyId).all<SessionRow & { child_name: string; child_color: string }>();

  const activeSessions = [];
  for (const row of results || []) {
    const normalized = await normalizeExpired(db, row);
    if (normalized && ['running', 'paused'].includes(normalized.status)) {
      activeSessions.push({
        ...normalized,
        child_name: row.child_name,
        child_color: row.child_color,
      });
    }
  }

  return activeSessions;
}

export async function startScreenSession(
  db: D1Database,
  familyId: string,
  childId: string,
  requestId: string
) {
  const existingActive = await db.prepare(
    `SELECT id FROM screen_sessions
     WHERE family_id=? AND child_id=? AND status IN ('running','paused') LIMIT 1`
  ).bind(familyId, childId).first();
  if (existingActive) return { success: false, error: 'כבר קיים טיימר פעיל' };

  const request = await db.prepare(
    `SELECT id, approved_minutes, source FROM screen_time_requests
     WHERE id=? AND family_id=? AND child_id=? AND status='approved' AND approved_minutes > 0`
  ).bind(requestId, familyId, childId).first<{ id: string; approved_minutes: number; source: string }>();
  if (!request) return { success: false, error: 'בקשת זמן מסך מאושרת לא נמצאה' };

  const already = await db.prepare(
    `SELECT id FROM screen_sessions WHERE screen_time_request_id=?`
  ).bind(requestId).first();
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

export async function startSelfScreenSession(
  db: D1Database,
  familyId: string,
  childId: string,
  source: string
) {
  if (!ALLOWED_SELF_SOURCES.has(source)) {
    return { success: false, error: 'מקור זמן המסך אינו תקין' };
  }

  const existingActive = await db.prepare(
    `SELECT id FROM screen_sessions
     WHERE family_id=? AND child_id=? AND status IN ('running','paused') LIMIT 1`
  ).bind(familyId, childId).first();
  if (existingActive) return { success: false, error: 'כבר קיים טיימר פעיל' };

  const child = await db.prepare(
    `SELECT available_minutes FROM children WHERE id=? AND family_id=?`
  ).bind(childId, familyId).first<{ available_minutes: number }>();

  const availableMinutes = Math.max(0, Number(child?.available_minutes || 0));
  if (availableMinutes <= 0) {
    return { success: false, error: 'אין כרגע דקות זמינות לניצול' };
  }

  const now = new Date().toISOString();
  const requestId = generateId();
  const sessionId = generateId();
  const seconds = availableMinutes * 60;

  // screen_sessions currently requires a request id. This hidden cancelled request
  // is only a technical anchor and is excluded from normal approval flows.
  await db.batch([
    db.prepare(
      `INSERT INTO screen_time_requests
        (id,family_id,child_id,requested_minutes,approved_minutes,source,status,requested_at,reviewed_at,reviewed_by)
       VALUES (?,?,?,0,NULL,?,'cancelled',?,?,?)`
    ).bind(requestId, familyId, childId, source, now, now, SELF_REVIEW_MARKER),
    db.prepare(
      `INSERT INTO screen_sessions
        (id,family_id,child_id,screen_time_request_id,source,allocated_seconds,remaining_seconds,status,started_at,last_resumed_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,'running',?,?,?,?)`
    ).bind(sessionId, familyId, childId, requestId, source, seconds, seconds, now, now, now, now),
    db.prepare(
      `INSERT INTO audit_log
        (id,family_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json,created_at)
       VALUES (?,?,'child',?,'self_screen_usage_started','screen_session',?,?,?)`
    ).bind(
      generateId(),
      familyId,
      childId,
      sessionId,
      JSON.stringify({ source, maxMinutes: availableMinutes }),
      now
    ),
  ]);

  return { success: true, id: sessionId, maxMinutes: availableMinutes };
}

export async function pauseScreenSession(db: D1Database, familyId: string, childId: string) {
  const row = await db.prepare(
    `SELECT s.*,
       CASE WHEN r.reviewed_by=? THEN 'self' ELSE 'approved' END AS mode
     FROM screen_sessions s
     LEFT JOIN screen_time_requests r ON r.id=s.screen_time_request_id
     WHERE s.family_id=? AND s.child_id=? AND s.status='running'
     ORDER BY s.created_at DESC LIMIT 1`
  ).bind(SELF_REVIEW_MARKER, familyId, childId).first<SessionRow>();
  if (!row) return { success: false, error: 'אין טיימר פעיל' };

  const remaining = remainingNow(row);
  const now = new Date().toISOString();

  if (remaining <= 0) {
    await claimAndFinishExpiredSession(db, row);
    return { success: true, remainingSeconds: 0, status: 'finished', spentMinutes: 0 };
  }

  const paused = await db.prepare(
    `UPDATE screen_sessions
     SET status='paused', remaining_seconds=?, paused_at=?, updated_at=?
     WHERE id=? AND status='running'`
  ).bind(remaining, now, now, row.id).run();

  if (Number((paused as any)?.meta?.changes || 0) <= 0) {
    return { success: false, error: 'הטיימר השתנה, נסה שוב' };
  }

  return { success: true, remainingSeconds: remaining, status: 'paused', spentMinutes: 0 };
}

export async function resumeScreenSession(db: D1Database, familyId: string, childId: string) {
  const row = await db.prepare(
    `SELECT * FROM screen_sessions
     WHERE family_id=? AND child_id=? AND status='paused'
     ORDER BY created_at DESC LIMIT 1`
  ).bind(familyId, childId).first<SessionRow>();
  if (!row) return { success: false, error: 'אין טיימר מושהה' };
  if (row.remaining_seconds <= 0) return { success: false, error: 'זמן המסך הסתיים' };

  const now = new Date().toISOString();
  await db.prepare(
    `UPDATE screen_sessions
     SET status='running', last_resumed_at=?, paused_at=NULL, updated_at=?
     WHERE id=? AND status='paused'`
  ).bind(now, now, row.id).run();

  return { success: true };
}

export async function stopScreenSession(db: D1Database, familyId: string, childId: string) {
  const row = await db.prepare(
    `SELECT s.*,
       CASE WHEN r.reviewed_by=? THEN 'self' ELSE 'approved' END AS mode
     FROM screen_sessions s
     LEFT JOIN screen_time_requests r ON r.id=s.screen_time_request_id
     WHERE s.family_id=? AND s.child_id=? AND s.status IN ('running','paused')
     ORDER BY s.created_at DESC LIMIT 1`
  ).bind(SELF_REVIEW_MARKER, familyId, childId).first<SessionRow>();
  if (!row) return { success: false, error: 'אין טיימר פעיל' };

  const remaining = remainingNow(row);
  const now = new Date().toISOString();

  // Claim the stop before billing so a simultaneous expiry sweep cannot
  // charge the same self-reported session twice.
  const stopped = await db.prepare(
    `UPDATE screen_sessions
     SET status='stopped', remaining_seconds=?, ended_at=?, updated_at=?
     WHERE id=? AND status IN ('running','paused')`
  ).bind(remaining, now, now, row.id).run();

  if (Number((stopped as any)?.meta?.changes || 0) <= 0) {
    return { success: false, error: 'הטיימר כבר הסתיים או השתנה' };
  }

  try {
    const usage = await recordSelfUsage(db, row, remaining);

    return {
      success: true,
      remainingSeconds: remaining,
      mode: row.mode || 'approved',
      spentMinutes: usage.spentMinutes,
      newBalance: usage.newBalance,
    };
  } catch (err) {
    // Restore the previous state so the user can retry if billing/logging fails.
    await db.prepare(
      `UPDATE screen_sessions
       SET status=?, remaining_seconds=?, ended_at=?, updated_at=?
       WHERE id=? AND status='stopped'`
    ).bind(
      row.status,
      row.remaining_seconds,
      row.ended_at,
      new Date().toISOString(),
      row.id
    ).run();
    throw err;
  }
}
