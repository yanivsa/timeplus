import { Env } from './types';

export const DEFAULT_EVIDENCE_RETENTION_DAYS = 14;

function safeDays(raw: string | undefined, fallback = DEFAULT_EVIDENCE_RETENTION_DAYS): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 365 ? Math.floor(parsed) : fallback;
}

export function retentionDaysFor(env: Env, mediaKind: string): number {
  if (mediaKind === 'video') return safeDays(env.EVIDENCE_VIDEO_RETENTION_DAYS, DEFAULT_EVIDENCE_RETENTION_DAYS);
  return safeDays(env.EVIDENCE_IMAGE_RETENTION_DAYS, DEFAULT_EVIDENCE_RETENTION_DAYS);
}

export function addDaysIso(days: number, from = new Date()): string {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function resolveEvidenceRetention(db: D1Database, submissionId: string, days = DEFAULT_EVIDENCE_RETENTION_DAYS): Promise<{ expiresAt: string }> {
  const now = new Date();
  const expiresAt = addDaysIso(days, now);
  const nowIso = now.toISOString();
  await db.batch([
    db.prepare(`UPDATE task_submissions SET retention_hold = 0, retention_resolved_at = ?, evidence_expires_at = ? WHERE id = ?`).bind(nowIso, expiresAt, submissionId),
    db.prepare(`UPDATE submission_evidence_assets SET expires_at = ? WHERE submission_id = ? AND deleted_at IS NULL`).bind(expiresAt, submissionId),
  ]);
  return { expiresAt };
}
