from pathlib import Path

path = Path('worker/src/tasks.ts')
text = path.read_text(encoding='utf-8')
text = text.replace(
    "import { getIsraelDateString, getIsraelDayOfWeek, getIsraelDayDiff, getIsraelTimeString } from './timezone';",
    "import { getIsraelDateString, getIsraelDateOffset, getIsraelDayOfWeek, getIsraelTimeString } from './timezone';",
    1,
)
start = text.index('export async function approveTask(')
end = text.index('export async function rejectTask(', start)

replacement = r'''export async function approveTask(
  db: D1Database,
  instanceId: string,
  parentFamilyId: string,
  customRewardMinutes?: number,
  actor: 'parent' | 'system' = 'parent'
): Promise<{ success: boolean; error?: string; minutesAwarded?: number; xpAwarded?: number }> {
  const instance = await db
    .prepare(`SELECT * FROM task_instances WHERE id = ? AND family_id = ?`)
    .bind(instanceId, parentFamilyId)
    .first<TaskInstance>();

  if (!instance) return { success: false, error: 'המשימה לא נמצאה' };
  if (instance.status === 'approved') return { success: false, error: 'המשימה כבר אושרה בעבר' };
  if (instance.status !== 'submitted') return { success: false, error: 'ניתן לאשר רק משימות שהוגשו' };

  const rewardMinutes =
    instance.task_kind === 'mandatory'
      ? 0
      : typeof customRewardMinutes === 'number' && !isNaN(customRewardMinutes)
      ? Math.max(0, customRewardMinutes)
      : instance.reward_minutes;

  const storedRewardMinutes = instance.task_kind === 'mandatory' ? instance.reward_minutes : rewardMinutes;
  const now = new Date().toISOString();
  const todayIsrael = getIsraelDateString();
  const yesterdayIsrael = getIsraelDateOffset(-1);
  const approvalOperationId = generateId();
  const txId = rewardMinutes > 0 ? generateId() : null;
  const xpAwarded = calculateTaskXp(instance.reward_minutes, instance.requires_photo === 1);
  const operationGuard = `EXISTS (
    SELECT 1 FROM task_instances ti
    WHERE ti.id = ? AND ti.family_id = ? AND ti.status = 'approved'
      AND ti.approval_operation_id = ?
  )`;
  const levelForXp = (xpExpression: string) => `CASE
    WHEN ${xpExpression} >= 2000 THEN 8
    WHEN ${xpExpression} >= 1400 THEN 7
    WHEN ${xpExpression} >= 1000 THEN 6
    WHEN ${xpExpression} >= 700 THEN 5
    WHEN ${xpExpression} >= 450 THEN 4
    WHEN ${xpExpression} >= 250 THEN 3
    WHEN ${xpExpression} >= 100 THEN 2
    ELSE 1 END`;
  const previousLevelSql = levelForXp(`MAX(0, cp.xp - ${Number(xpAwarded)})`);
  const rankTitleSql = `CASE cp.level
    WHEN 8 THEN 'שליט הנצח'
    WHEN 7 THEN 'רב-מג הזמן'
    WHEN 6 THEN 'שומר הממדים'
    WHEN 5 THEN 'אמן הזמן'
    WHEN 4 THEN 'קוסם שעה'
    WHEN 3 THEN 'מכוון הכוכבים'
    WHEN 2 THEN 'מחזיק השעון'
    ELSE 'שוליית הזמן' END`;

  const approvalStatements = [
    db.prepare(
      `UPDATE task_instances
       SET status = 'approved', reward_minutes = ?, reviewed_at = ?, reviewed_by = ?,
           approval_operation_id = ?, updated_at = ?
       WHERE id = ? AND family_id = ? AND status = 'submitted'`
    ).bind(storedRewardMinutes, now, actor, approvalOperationId, now, instanceId, parentFamilyId),
    db.prepare(
      `UPDATE task_submissions
       SET status = 'approved', reviewed_at = ?
       WHERE task_instance_id = ? AND status = 'pending' AND ${operationGuard}`
    ).bind(now, instanceId, instanceId, parentFamilyId, approvalOperationId),
  ];

  if (rewardMinutes > 0 && txId) {
    approvalStatements.push(
      db.prepare(
        `UPDATE children
         SET available_minutes = available_minutes + ?, updated_at = ?
         WHERE id = ? AND family_id = ? AND ${operationGuard}`
      ).bind(rewardMinutes, now, instance.child_id, parentFamilyId, instanceId, parentFamilyId, approvalOperationId),
      db.prepare(
        `INSERT INTO minute_transactions (
          id, family_id, child_id, type, amount, balance_after, reason, task_instance_id, created_by, created_at
        )
        SELECT ?, ?, c.id, 'earn', ?, c.available_minutes, ?, ?, ?, ?
        FROM children c
        WHERE c.id = ? AND c.family_id = ? AND ${operationGuard}`
      ).bind(
        txId,
        parentFamilyId,
        rewardMinutes,
        `אישור משימה: ${instance.title}`,
        instanceId,
        actor,
        now,
        instance.child_id,
        parentFamilyId,
        instanceId,
        parentFamilyId,
        approvalOperationId
      )
    );
  }

  approvalStatements.push(
    db.prepare(
      `INSERT OR IGNORE INTO child_progress (
        child_id, family_id, level, xp, current_streak_days, best_streak_days, last_active_date, updated_at
      )
      SELECT ?, ?, 1, 0, 0, 0, NULL, ? WHERE ${operationGuard}`
    ).bind(instance.child_id, parentFamilyId, now, instanceId, parentFamilyId, approvalOperationId),
    db.prepare(
      `UPDATE child_progress
       SET xp = xp + ?,
           current_streak_days = CASE
             WHEN last_active_date IS NULL THEN 1
             WHEN last_active_date = ? THEN current_streak_days
             WHEN last_active_date = ? THEN current_streak_days + 1
             ELSE 1 END,
           last_active_date = ?,
           updated_at = ?
       WHERE child_id = ? AND family_id = ? AND ${operationGuard}`
    ).bind(
      xpAwarded,
      todayIsrael,
      yesterdayIsrael,
      todayIsrael,
      now,
      instance.child_id,
      parentFamilyId,
      instanceId,
      parentFamilyId,
      approvalOperationId
    ),
    db.prepare(
      `UPDATE child_progress
       SET level = ${levelForXp('xp')},
           best_streak_days = MAX(best_streak_days, current_streak_days),
           updated_at = ?
       WHERE child_id = ? AND family_id = ? AND ${operationGuard}`
    ).bind(now, instance.child_id, parentFamilyId, instanceId, parentFamilyId, approvalOperationId),
    db.prepare(
      `INSERT INTO reward_events (
        id, family_id, child_id, type, title, body, minutes_delta, xp_delta,
        level_before, level_after, streak_days, task_instance_id, seen_at, created_at
      )
      SELECT ?, ?, cp.child_id,
             CASE WHEN cp.level > ${previousLevelSql} THEN 'level_up' ELSE 'task_approved' END,
             CASE WHEN cp.level > ${previousLevelSql}
                  THEN printf('עלית לרמה %d! %s', cp.level, ${rankTitleSql})
                  ELSE ? END,
             ?, ?, ?, ${previousLevelSql}, cp.level, cp.current_streak_days, ?, NULL, ?
      FROM child_progress cp
      WHERE cp.child_id = ? AND cp.family_id = ? AND ${operationGuard}`
    ).bind(
      generateId(),
      parentFamilyId,
      `כל הכבוד! ${instance.title} אושר`,
      rewardMinutes > 0
        ? `קיבלת ${rewardMinutes} דקות מסך ו-${xpAwarded} נקודות קסם!`
        : `קיבלת ${xpAwarded} נקודות קסם על משימת חובה!`,
      rewardMinutes,
      xpAwarded,
      instanceId,
      now,
      instance.child_id,
      parentFamilyId,
      instanceId,
      parentFamilyId,
      approvalOperationId
    ),
    db.prepare(
      `INSERT INTO notifications (
        id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
      )
      SELECT ?, ?, 'child', ?, 'task_approved', ?, ?, 'task_instance', ?, ? WHERE ${operationGuard}`
    ).bind(
      generateId(),
      parentFamilyId,
      instance.child_id,
      rewardMinutes > 0 ? `משימה אושרה! +${rewardMinutes} דק'` : 'משימת חובה אושרה! ⭐',
      rewardMinutes > 0
        ? `המשימה "${instance.title}" אושרה! נוספו ${rewardMinutes} דקות לחשבונך.`
        : `המשימה "${instance.title}" אושרה! קיבלת ${xpAwarded} XP.`,
      instanceId,
      now,
      instanceId,
      parentFamilyId,
      approvalOperationId
    ),
    db.prepare(
      `INSERT INTO audit_log (
        id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at
      )
      SELECT ?, ?, ?, ?, 'task_approved', 'task_instance', ?, ?, ? WHERE ${operationGuard}`
    ).bind(
      generateId(),
      parentFamilyId,
      actor === 'system' ? 'system' : 'parent',
      actor === 'system' ? 'ai_verifier' : 'parent',
      instanceId,
      JSON.stringify({ rewardMinutes, xpAwarded, approvalOperationId }),
      now,
      instanceId,
      parentFamilyId,
      approvalOperationId
    )
  );

  const approvalResults = await db.batch(approvalStatements);
  if (Number((approvalResults[0] as any)?.meta?.changes || 0) === 0) {
    return { success: false, error: 'המשימה אינה ממתינה לאישור או שכבר אושרה' };
  }

  return { success: true, minutesAwarded: rewardMinutes, xpAwarded };
}

'''

path.write_text(text[:start] + replacement + text[end:], encoding='utf-8')
print('task approval made atomic and concurrency-safe')
