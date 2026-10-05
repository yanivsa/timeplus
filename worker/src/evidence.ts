import { getSessionUser } from './auth';
import { generateId } from './crypto';
import { sendNotification } from './notifications';
import { AuthUser, Env } from './types';

export type EvidenceMediaKind = 'image' | 'screenshot' | 'video';
export type EvidenceMediaSource = 'camera_capture' | 'gallery_upload' | 'unknown';
export type EvidenceAssetKind = 'original' | 'normalized' | 'contact_sheet' | 'keyframe';

const IMAGE_RETENTION_DAYS = 90;
const VIDEO_RETENTION_DAYS = 30;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

const MEDIA_KINDS = new Set<EvidenceMediaKind>(['image', 'screenshot', 'video']);
const MEDIA_SOURCES = new Set<EvidenceMediaSource>(['camera_capture', 'gallery_upload', 'unknown']);
const ASSET_KINDS = new Set<EvidenceAssetKind>(['original', 'normalized', 'contact_sheet', 'keyframe']);
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

function json(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function errorJson(message: string, status = 400): Response {
  return json({ success: false, error: message }, status);
}

function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeMediaKind(value: unknown): EvidenceMediaKind | null {
  const candidate = String(value || '') as EvidenceMediaKind;
  return MEDIA_KINDS.has(candidate) ? candidate : null;
}

function normalizeMediaSource(value: unknown): EvidenceMediaSource {
  const candidate = String(value || '') as EvidenceMediaSource;
  return MEDIA_SOURCES.has(candidate) ? candidate : 'unknown';
}

function normalizeAssetKind(value: unknown): EvidenceAssetKind | null {
  const candidate = String(value || '') as EvidenceAssetKind;
  return ASSET_KINDS.has(candidate) ? candidate : null;
}

function objectExtension(contentType: string): string {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'video/mp4') return 'mp4';
  if (contentType === 'video/webm') return 'webm';
  if (contentType === 'video/quicktime') return 'mov';
  return 'bin';
}

function looksLikeDeclaredMime(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === 'image/png') {
    return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (contentType === 'image/webp') {
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  if (contentType === 'video/webm') {
    return bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  }
  if (contentType === 'video/mp4' || contentType === 'video/quicktime') {
    return bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp';
  }
  return false;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
  return Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function hasEvidenceStorage(env: Env): boolean {
  return Boolean(env.EVIDENCE || env.EVIDENCE_KV);
}

async function putEvidenceObject(
  env: Env,
  key: string,
  body: ArrayBuffer,
  contentType: string,
  expiresAt: string,
  metadata: Record<string, string>
): Promise<void> {
  if (env.EVIDENCE) {
    await env.EVIDENCE.put(key, body, {
      httpMetadata: { contentType },
      customMetadata: metadata,
    });
    return;
  }
  if (env.EVIDENCE_KV) {
    const expiration = Math.floor(new Date(expiresAt).getTime() / 1000);
    await env.EVIDENCE_KV.put(key, body, { expiration, metadata: { contentType, ...metadata } });
    return;
  }
  throw new Error('Evidence storage is not configured');
}

async function getEvidenceObject(env: Env, key: string): Promise<ArrayBuffer | ReadableStream | null> {
  if (env.EVIDENCE) {
    const object = await env.EVIDENCE.get(key);
    return object?.body || null;
  }
  if (env.EVIDENCE_KV) {
    return env.EVIDENCE_KV.get(key, 'arrayBuffer');
  }
  return null;
}

async function deleteEvidenceObject(env: Env, key: string): Promise<void> {
  if (env.EVIDENCE) {
    await env.EVIDENCE.delete(key);
    return;
  }
  if (env.EVIDENCE_KV) {
    await env.EVIDENCE_KV.delete(key);
  }
}

async function getSubmissionForUser(db: D1Database, submissionId: string, user: AuthUser) {
  return db
    .prepare(
      `SELECT ts.*, ti.family_id, ti.template_id, ti.title AS task_title, ti.status AS task_status,
              ti.reward_minutes, ti.task_kind, c.name AS child_name
       FROM task_submissions ts
       JOIN task_instances ti ON ti.id = ts.task_instance_id
       JOIN children c ON c.id = ts.child_id
       WHERE ts.id = ? AND ti.family_id = ?`
    )
    .bind(submissionId, user.familyId)
    .first<any>();
}

async function createEvidenceSubmission(request: Request, env: Env, user: AuthUser): Promise<Response> {
  if (user.role !== 'child') return errorJson('פעולה זו זמינה לחשבון ילד בלבד', 403);
  if (!hasEvidenceStorage(env)) return errorJson('אחסון הראיות עדיין לא מופעל במערכת', 503);

  const body = (await request.json().catch(() => ({}))) as any;
  const taskInstanceId = String(body.taskInstanceId || '');
  const mediaKind = normalizeMediaKind(body.mediaKind);
  const mediaSource = normalizeMediaSource(body.mediaSource);
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) || null : null;

  if (!taskInstanceId || !mediaKind) return errorJson('חסרים פרטי משימה או סוג מדיה', 400);

  const task = await env.DB
    .prepare(
      `SELECT id, family_id, child_id, title, status, allow_video_proof
       FROM task_instances WHERE id = ? AND child_id = ? AND family_id = ?`
    )
    .bind(taskInstanceId, user.id, user.familyId)
    .first<any>();

  if (!task) return errorJson('המשימה לא נמצאה', 404);
  if (task.status !== 'open' && task.status !== 'rejected') {
    return errorJson('לא ניתן לצרף ראיה למשימה שכבר הוגשה או אושרה', 409);
  }
  if (mediaKind === 'video' && Number(task.allow_video_proof || 0) !== 1) {
    return errorJson('המשימה הזו עדיין לא מאפשרת הוכחת וידאו', 400);
  }

  const submissionId = generateId();
  const now = new Date().toISOString();
  const expiresAt = addDaysIso(mediaKind === 'video' ? VIDEO_RETENTION_DAYS : IMAGE_RETENTION_DAYS);

  await env.DB
    .prepare(
      `INSERT INTO task_submissions (
        id, task_instance_id, child_id, note, photo_object_key, status, submitted_at,
        verification_status, review_mode, media_kind, media_source, evidence_expires_at, retention_hold
      ) VALUES (?, ?, ?, ?, NULL, 'pending', ?, 'uploading', 'parent', ?, ?, ?, 0)`
    )
    .bind(submissionId, taskInstanceId, user.id, note, now, mediaKind, mediaSource, expiresAt)
    .run();

  await env.DB
    .prepare(
      `INSERT INTO audit_log (
        id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at
      ) VALUES (?, ?, 'child', ?, 'evidence_started', 'task_submission', ?, ?, ?)`
    )
    .bind(
      generateId(),
      user.familyId,
      user.id,
      submissionId,
      JSON.stringify({ taskInstanceId, mediaKind, mediaSource }),
      now
    )
    .run();

  return json({
    success: true,
    submissionId,
    mediaKind,
    mediaSource,
    evidenceExpiresAt: expiresAt,
    limits: {
      maxImageBytes: MAX_IMAGE_BYTES,
      maxVideoBytes: MAX_VIDEO_BYTES,
      maxVideoSeconds: 30,
    },
  });
}

async function uploadEvidenceAsset(
  request: Request,
  env: Env,
  user: AuthUser,
  submissionId: string,
  rawAssetKind: string
): Promise<Response> {
  if (user.role !== 'child') return errorJson('פעולה זו זמינה לחשבון ילד בלבד', 403);
  if (!hasEvidenceStorage(env)) return errorJson('אחסון הראיות עדיין לא מופעל במערכת', 503);

  const assetKind = normalizeAssetKind(rawAssetKind);
  if (!assetKind) return errorJson('סוג קובץ ראיה אינו תקין', 400);

  const submission = await getSubmissionForUser(env.DB, submissionId, user);
  if (!submission || submission.child_id !== user.id) return errorJson('ההגשה לא נמצאה', 404);
  if (submission.verification_status !== 'uploading') return errorJson('ההגשה כבר הושלמה', 409);

  const contentType = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  const isImage = IMAGE_MIME_TYPES.has(contentType);
  const isVideo = VIDEO_MIME_TYPES.has(contentType);
  if (!isImage && !isVideo) return errorJson('סוג הקובץ אינו נתמך', 415);

  if (assetKind !== 'original' && !isImage) {
    return errorJson('קובץ מעובד חייב להיות תמונה', 415);
  }
  if (submission.media_kind !== 'video' && isVideo) return errorJson('המשימה מצפה לתמונה ולא לווידאו', 415);
  if (submission.media_kind === 'video' && assetKind === 'original' && !isVideo) {
    return errorJson('קובץ הווידאו המקורי אינו בפורמט נתמך', 415);
  }

  const body = await request.arrayBuffer();
  const bytes = new Uint8Array(body);
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (bytes.byteLength <= 0) return errorJson('הקובץ ריק', 400);
  if (bytes.byteLength > maxBytes) {
    return errorJson(isVideo ? 'הווידאו גדול מ-25MB' : 'התמונה גדולה מ-8MB', 413);
  }
  if (!looksLikeDeclaredMime(bytes, contentType)) return errorJson('תוכן הקובץ אינו תואם לסוג שדווח', 415);

  const hash = await sha256Hex(body);
  const duplicate = await env.DB
    .prepare(
      `SELECT sea.id
       FROM submission_evidence_assets sea
       JOIN task_submissions prior_ts ON prior_ts.id = sea.submission_id
       WHERE prior_ts.child_id = ?
         AND sea.sha256 = ?
         AND sea.deleted_at IS NULL
         AND sea.submission_id <> ?
       ORDER BY sea.created_at DESC LIMIT 1`
    )
    .bind(user.id, hash, submissionId)
    .first<{ id: string }>();

  const now = new Date().toISOString();
  const yyyyMm = now.slice(0, 7);
  const assetId = generateId();
  const ext = objectExtension(contentType);
  const objectKey = `evidence/${user.familyId}/${user.id}/${yyyyMm}/${submissionId}/${assetKind}-${assetId}.${ext}`;
  const expiresAt = addDaysIso(isVideo ? VIDEO_RETENTION_DAYS : IMAGE_RETENTION_DAYS);

  await putEvidenceObject(env, objectKey, body, contentType, expiresAt, {
    familyId: user.familyId,
    childId: user.id,
    submissionId,
    assetKind,
    sha256: hash,
  });

  try {
    await env.DB
      .prepare(
        `INSERT INTO submission_evidence_assets (
          id, submission_id, kind, object_key, mime_type, byte_size, sha256,
          duplicate_of_asset_id, created_at, expires_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
      )
      .bind(
        assetId,
        submissionId,
        assetKind,
        objectKey,
        contentType,
        bytes.byteLength,
        hash,
        duplicate?.id || null,
        now,
        expiresAt
      )
      .run();

    if (assetKind === 'normalized' || assetKind === 'original') {
      await env.DB
        .prepare(`UPDATE task_submissions SET media_sha256 = ? WHERE id = ?`)
        .bind(hash, submissionId)
        .run();
    }
  } catch (err) {
    await deleteEvidenceObject(env, objectKey).catch(() => undefined);
    throw err;
  }

  return json({
    success: true,
    asset: {
      id: assetId,
      kind: assetKind,
      mimeType: contentType,
      byteSize: bytes.byteLength,
      sha256: hash,
      duplicate: Boolean(duplicate),
      expiresAt,
    },
  });
}

async function completeEvidenceSubmission(
  env: Env,
  user: AuthUser,
  ctx: ExecutionContext,
  submissionId: string
): Promise<Response> {
  if (user.role !== 'child') return errorJson('פעולה זו זמינה לחשבון ילד בלבד', 403);

  const submission = await getSubmissionForUser(env.DB, submissionId, user);
  if (!submission || submission.child_id !== user.id) return errorJson('ההגשה לא נמצאה', 404);

  if (submission.verification_status === 'needs_parent_review' && submission.task_status === 'submitted') {
    return json({ success: true, status: 'needs_parent_review', submissionId, idempotent: true });
  }
  if (submission.verification_status !== 'uploading') return errorJson('ההגשה כבר הושלמה', 409);

  const { results: assets } = await env.DB
    .prepare(
      `SELECT id, kind, mime_type, byte_size, sha256, duplicate_of_asset_id, expires_at
       FROM submission_evidence_assets
       WHERE submission_id = ? AND deleted_at IS NULL
       ORDER BY created_at ASC`
    )
    .bind(submissionId)
    .all<any>();

  const hasRequiredEvidence = submission.media_kind === 'video'
    ? assets.some((asset: any) => asset.kind === 'original')
    : assets.some((asset: any) => asset.kind === 'normalized' || asset.kind === 'original');

  if (!hasRequiredEvidence) return errorJson('לא הועלתה ראיה תקינה', 400);

  const now = new Date().toISOString();
  const taskUpdate = await env.DB
    .prepare(
      `UPDATE task_instances
       SET status = 'submitted', submitted_at = ?, updated_at = ?
       WHERE id = ? AND child_id = ? AND family_id = ? AND (status = 'open' OR status = 'rejected')`
    )
    .bind(now, now, submission.task_instance_id, user.id, user.familyId)
    .run();

  if (taskUpdate.meta.changes === 0) return errorJson('המשימה כבר נמצאת בטיפול', 409);

  const duplicateDetected = assets.some((asset: any) => Boolean(asset.duplicate_of_asset_id));
  const summary = duplicateDetected
    ? 'זוהתה ראיה זהה לראיה קודמת; נדרשת בדיקת הורה.'
    : 'הראיה נשמרה וממתינה לבדיקת הורה.';

  await env.DB
    .prepare(
      `UPDATE task_submissions
       SET verification_status = 'needs_parent_review', verification_route = 'none',
           verification_summary = ?, review_mode = 'parent'
       WHERE id = ?`
    )
    .bind(summary, submissionId)
    .run();

  await env.DB
    .prepare(
      `INSERT INTO audit_log (
        id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at
      ) VALUES (?, ?, 'child', ?, 'evidence_completed', 'task_submission', ?, ?, ?)`
    )
    .bind(
      generateId(),
      user.familyId,
      user.id,
      submissionId,
      JSON.stringify({
        taskInstanceId: submission.task_instance_id,
        mediaKind: submission.media_kind,
        mediaSource: submission.media_source,
        assetCount: assets.length,
        duplicateDetected,
      }),
      now
    )
    .run();

  ctx.waitUntil(
    sendNotification(env.DB, env, {
      familyId: user.familyId,
      recipientRole: 'parent',
      type: 'evidence_submitted',
      title: 'תיעוד ביצוע חדש לבדיקה',
      message: `${submission.child_name || 'הילד/ה'} שלח/ה תיעוד עבור "${submission.task_title}"`,
      entityType: 'task_submission',
      entityId: submissionId,
    }).catch((err) => console.error('Evidence parent notification failed:', err))
  );

  return json({
    success: true,
    submissionId,
    status: 'needs_parent_review',
    duplicateDetected,
    message: 'התיעוד נשמר ונשלח לבדיקה',
  });
}

async function getChildEvidence(env: Env, user: AuthUser, submissionId: string): Promise<Response> {
  if (user.role !== 'child') return errorJson('פעולה זו זמינה לחשבון ילד בלבד', 403);
  const submission = await getSubmissionForUser(env.DB, submissionId, user);
  if (!submission || submission.child_id !== user.id) return errorJson('ההגשה לא נמצאה', 404);

  const { results: assets } = await env.DB
    .prepare(
      `SELECT id, kind, mime_type, byte_size, sha256, duplicate_of_asset_id, created_at, expires_at, deleted_at
       FROM submission_evidence_assets WHERE submission_id = ? ORDER BY created_at ASC`
    )
    .bind(submissionId)
    .all();

  return json({ submission, assets });
}

async function listParentEvidence(env: Env, user: AuthUser, url: URL): Promise<Response> {
  if (user.role !== 'parent') return errorJson('פעולה זו מורשית להורים בלבד', 403);

  const requestedStatus = url.searchParams.get('status');
  const allowedStatuses = new Set(['uploading', 'needs_parent_review', 'verified', 'rejected_by_ai', 'ai_unavailable']);
  const status = requestedStatus && allowedStatuses.has(requestedStatus) ? requestedStatus : null;
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 40)));

  let sql = `SELECT ts.id, ts.task_instance_id, ts.child_id, ts.note, ts.status,
                    ts.submitted_at, ts.reviewed_at, ts.verification_status, ts.verification_summary,
                    ts.review_mode, ts.media_kind, ts.media_source, ts.media_sha256,
                    ts.evidence_expires_at, ts.retention_hold,
                    ti.title AS task_title, ti.reward_minutes, ti.task_kind, ti.status AS task_status,
                    c.name AS child_name, c.color AS child_color, c.avatar AS child_avatar,
                    (SELECT sea.id FROM submission_evidence_assets sea
                     WHERE sea.submission_id = ts.id AND sea.deleted_at IS NULL
                       AND sea.kind IN ('normalized','contact_sheet','keyframe','original')
                     ORDER BY CASE sea.kind WHEN 'normalized' THEN 1 WHEN 'contact_sheet' THEN 2 WHEN 'keyframe' THEN 3 ELSE 4 END,
                              sea.created_at ASC LIMIT 1) AS preview_asset_id,
                    (SELECT COUNT(*) FROM submission_evidence_assets sea
                     WHERE sea.submission_id = ts.id AND sea.deleted_at IS NULL) AS active_asset_count,
                    (SELECT MAX(CASE WHEN sea.duplicate_of_asset_id IS NOT NULL THEN 1 ELSE 0 END)
                     FROM submission_evidence_assets sea
                     WHERE sea.submission_id = ts.id) AS duplicate_detected
             FROM task_submissions ts
             JOIN task_instances ti ON ti.id = ts.task_instance_id
             JOIN children c ON c.id = ts.child_id
             WHERE ti.family_id = ? AND ts.media_kind IS NOT NULL`;
  const bindings: any[] = [user.familyId];
  if (status) {
    sql += ` AND ts.verification_status = ?`;
    bindings.push(status);
  }
  sql += ` ORDER BY ts.submitted_at DESC LIMIT ?`;
  bindings.push(limit);

  const { results: submissions } = await env.DB.prepare(sql).bind(...bindings).all<any>();
  const storage = await env.DB
    .prepare(
      `SELECT COALESCE(SUM(sea.byte_size), 0) AS active_bytes
       FROM submission_evidence_assets sea
       JOIN task_submissions ts ON ts.id = sea.submission_id
       JOIN task_instances ti ON ti.id = ts.task_instance_id
       WHERE ti.family_id = ? AND sea.deleted_at IS NULL`
    )
    .bind(user.familyId)
    .first<{ active_bytes: number }>();

  return json({
    submissions: submissions || [],
    storage: {
      activeBytes: Number(storage?.active_bytes || 0),
      backend: env.EVIDENCE ? 'r2' : 'kv',
      warningAtBytes: env.EVIDENCE ? 7 * 1024 * 1024 * 1024 : 750 * 1024 * 1024,
      videoRetentionReductionAtBytes: env.EVIDENCE ? 8 * 1024 * 1024 * 1024 : 850 * 1024 * 1024,
      videoStopAtBytes: env.EVIDENCE ? 9 * 1024 * 1024 * 1024 : 950 * 1024 * 1024,
    },
  });
}

async function getParentEvidenceDetail(env: Env, user: AuthUser, submissionId: string): Promise<Response> {
  if (user.role !== 'parent') return errorJson('פעולה זו מורשית להורים בלבד', 403);
  const submission = await getSubmissionForUser(env.DB, submissionId, user);
  if (!submission) return errorJson('ההגשה לא נמצאה', 404);

  const { results: assets } = await env.DB
    .prepare(
      `SELECT id, kind, mime_type, byte_size, sha256, duplicate_of_asset_id, created_at, expires_at, deleted_at
       FROM submission_evidence_assets WHERE submission_id = ? ORDER BY created_at ASC`
    )
    .bind(submissionId)
    .all();

  const { results: verificationAttempts } = await env.DB
    .prepare(
      `SELECT id, route, provider, model, status, latency_ms, result_json, created_at
       FROM ai_verification_attempts WHERE submission_id = ? ORDER BY created_at DESC`
    )
    .bind(submissionId)
    .all();

  const { results: audit } = await env.DB
    .prepare(
      `SELECT action, actor_type, actor_id, metadata_json, created_at
       FROM audit_log WHERE entity_type = 'task_submission' AND entity_id = ? ORDER BY created_at ASC`
    )
    .bind(submissionId)
    .all();

  return json({ submission, assets, verificationAttempts, audit });
}

async function streamParentEvidenceAsset(
  env: Env,
  user: AuthUser,
  submissionId: string,
  assetId: string
): Promise<Response> {
  if (user.role !== 'parent') return errorJson('פעולה זו מורשית להורים בלבד', 403);
  if (!hasEvidenceStorage(env)) return errorJson('אחסון הראיות עדיין לא מופעל במערכת', 503);

  const asset = await env.DB
    .prepare(
      `SELECT sea.object_key, sea.mime_type, sea.deleted_at
       FROM submission_evidence_assets sea
       JOIN task_submissions ts ON ts.id = sea.submission_id
       JOIN task_instances ti ON ti.id = ts.task_instance_id
       WHERE sea.id = ? AND sea.submission_id = ? AND ti.family_id = ?`
    )
    .bind(assetId, submissionId, user.familyId)
    .first<{ object_key: string; mime_type: string; deleted_at: string | null }>();

  if (!asset || asset.deleted_at) return errorJson('המדיה אינה זמינה עוד', 404);
  const objectBody = await getEvidenceObject(env, asset.object_key);
  if (!objectBody) return errorJson('המדיה אינה זמינה עוד', 404);

  return new Response(objectBody, {
    headers: {
      'Content-Type': asset.mime_type,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function cleanupExpiredEvidence(env: Env): Promise<{ deleted: number }> {
  if (!env.EVIDENCE) return { deleted: 0 };
  const now = new Date().toISOString();
  const { results: expired } = await env.DB
    .prepare(
      `SELECT sea.id, sea.object_key
       FROM submission_evidence_assets sea
       JOIN task_submissions ts ON ts.id = sea.submission_id
       WHERE sea.deleted_at IS NULL
         AND sea.expires_at IS NOT NULL
         AND sea.expires_at <= ?
         AND COALESCE(ts.retention_hold, 0) = 0
       ORDER BY sea.expires_at ASC LIMIT 200`
    )
    .bind(now)
    .all<{ id: string; object_key: string }>();

  let deleted = 0;
  for (const asset of expired || []) {
    try {
      await deleteEvidenceObject(env, asset.object_key);
      await env.DB
        .prepare(`UPDATE submission_evidence_assets SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`)
        .bind(now, asset.id)
        .run();
      deleted++;
    } catch (err) {
      console.error('Evidence cleanup failed for', asset.id, err);
    }
  }
  return { deleted };
}

export async function handleEvidenceRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();
  const isEvidencePath = path.startsWith('/api/child/evidence') || path.startsWith('/api/parent/evidence');
  if (!isEvidencePath) return null;

  const user = await getSessionUser(request, env.DB);
  if (!user) return errorJson('נדרשת התחברות למערכת', 401);

  if (path === '/api/child/evidence/start' && method === 'POST') {
    return createEvidenceSubmission(request, env, user);
  }

  const childAssetMatch = path.match(/^\/api\/child\/evidence\/([^/]+)\/asset\/([^/]+)$/);
  if (childAssetMatch && method === 'PUT') {
    return uploadEvidenceAsset(request, env, user, childAssetMatch[1], childAssetMatch[2]);
  }

  const childCompleteMatch = path.match(/^\/api\/child\/evidence\/([^/]+)\/complete$/);
  if (childCompleteMatch && method === 'POST') {
    return completeEvidenceSubmission(env, user, ctx, childCompleteMatch[1]);
  }

  const childGetMatch = path.match(/^\/api\/child\/evidence\/([^/]+)$/);
  if (childGetMatch && method === 'GET') {
    return getChildEvidence(env, user, childGetMatch[1]);
  }

  if (path === '/api/parent/evidence' && method === 'GET') {
    return listParentEvidence(env, user, url);
  }

  const parentMediaMatch = path.match(/^\/api\/parent\/evidence\/([^/]+)\/media\/([^/]+)$/);
  if (parentMediaMatch && method === 'GET') {
    return streamParentEvidenceAsset(env, user, parentMediaMatch[1], parentMediaMatch[2]);
  }

  const parentDetailMatch = path.match(/^\/api\/parent\/evidence\/([^/]+)$/);
  if (parentDetailMatch && method === 'GET') {
    return getParentEvidenceDetail(env, user, parentDetailMatch[1]);
  }

  return errorJson('נתיב evidence לא נמצא', 404);
}
