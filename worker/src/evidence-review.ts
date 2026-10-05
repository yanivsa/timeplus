import { getSessionUser } from './auth';
import { generateId } from './crypto';
import { approveTask } from './tasks';
import { Env } from './types';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

function errorJson(message: string, status = 400): Response {
  return json({ success: false, error: message }, status);
}

export async function handleEvidenceReviewRequest(
  request: Request,
  env: Env
): Promise<Response | null> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/parent\/evidence\/([^/]+)\/approve$/);
  if (!match || request.method.toUpperCase() !== 'POST') return null;

  const user = await getSessionUser(request, env.DB);
  if (!user) return errorJson('נדרשת התחברות למערכת', 401);
  if (user.role !== 'parent') return errorJson('פעולה זו מורשית להורים בלבד', 403);

  const submissionId = match[1];
  const submission = await env.DB
    .prepare(
      `SELECT ts.id, ts.task_instance_id, ts.status, ti.family_id, ti.child_id, ti.title
       FROM task_submissions ts
       JOIN task_instances ti ON ti.id = ts.task_instance_id
       WHERE ts.id = ? AND ti.family_id = ? AND ts.media_kind IS NOT NULL`
    )
    .bind(submissionId, user.familyId)
    .first<any>();

  if (!submission) return errorJson('הגשת הראיה לא נמצאה', 404);

  const body = (await request.json().catch(() => ({}))) as any;
  const customReward = body.rewardMinutes !== undefined ? Number(body.rewardMinutes) : undefined;
  const result = await approveTask(env.DB, submission.task_instance_id, user.familyId, customReward);
  if (!result.success) return errorJson(result.error || 'אישור המשימה נכשל', 400);

  const now = new Date().toISOString();
  await env.DB
    .prepare(
      `UPDATE task_submissions
       SET verification_status = 'verified', review_mode = 'parent', reviewed_at = ?
       WHERE id = ?`
    )
    .bind(now, submissionId)
    .run();

  if ((result.minutesAwarded || 0) > 0) {
    await env.DB
      .prepare(
        `UPDATE minute_transactions
         SET evidence_submission_id = ?
         WHERE id = (
           SELECT id FROM minute_transactions
           WHERE task_instance_id = ? AND evidence_submission_id IS NULL
           ORDER BY created_at DESC LIMIT 1
         )`
      )
      .bind(submissionId, submission.task_instance_id)
      .run();
  }

  await env.DB
    .prepare(
      `INSERT INTO audit_log (
        id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at
      ) VALUES (?, ?, 'parent', 'parent', 'evidence_parent_approved', 'task_submission', ?, ?, ?)`
    )
    .bind(
      generateId(),
      user.familyId,
      submissionId,
      JSON.stringify({
        taskInstanceId: submission.task_instance_id,
        minutesAwarded: result.minutesAwarded || 0,
        xpAwarded: result.xpAwarded || 0,
      }),
      now
    )
    .run();

  return json({
    success: true,
    message: 'התיעוד והמשימה אושרו בהצלחה',
    minutesAwarded: result.minutesAwarded || 0,
    xpAwarded: result.xpAwarded || 0,
  });
}
