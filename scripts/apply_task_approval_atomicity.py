from pathlib import Path

path = Path('worker/src/tasks.ts')
text = path.read_text(encoding='utf-8')
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
  const approvalOperationId = generateId();
  const txId = rewardMinutes > 0 ? generateId() : null;
  const xpAwarded = calculateTaskXp(instance.reward_minutes, instance.requires_photo === 1);

  const existingProgress = await db
    .prepare(`SELECT level, xp, current_streak_days, best_streak_days, last_active_date FROM child_progress WHERE child_id = ?`)
    .bind(instance.child_id)
    .first<{
      level: number;
      xp: number;
      current_streak_days: number;
      best_streak_days: number;
      last_active_date: string | null;
    }>();

  const progress = existingProgress || {
    level: 1,
    xp: 0,
    current_streak_days: 0,
    best_streak_days: 0,
    last_active_date: null,
  };
  const oldXp = Number(progress.xp || 0);
  const newXp = oldXp + xpAwarded;
  const oldRank = getRankDetails(oldXp);
  const newRank = getRankDetails(newXp);
  const isLevelUp = newRank.level > oldRank.level;

  let newStreak = Number(progress.current_streak_days || 0);
  if (!progress.last_active_date) {
    newStreak = 1;
  } else {
    const diff = getIsraelDayDiff(progress.last_active_date, todayIsrael);
    if (diff === 1) newStreak += 1;
    else if (diff !== 0) newStreak = 1;
  }
  const bestStreak = Math.max(Number(progress.best_streak_days || 0), newStreak);
  const operationGuard = `EXISTS (
    SELECT 1 FROM task_instances ti
    WHERE ti.id = ? AND ti.family_id = ? AND ti.status = 'approved'
      AND ti.approval_operation_id = ?
  )`;

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
    ).bind(
      instance.child_id,
      parentFamilyId,
      now,
      instanceId,
      parentFamilyId,
      approvalOperationId
    ),
    db.prepare(
      `UPDATE child_progress
       SET level = ?, xp = ?, current_streak_days = ?, best_streak_days = ?, last_active_date = ?, updated_at = ?
       WHERE child_id = ? AND family_id = ? AND ${operationGuard}`
    ).bind(
      newRank.level,
      newXp,
      newStreak,
      bestStreak,
      todayIsrael,
      now,
      instance.child_id,
      parentFamilyId,
      instanceId,
      parentFamilyId,
      approvalOperationId
    ),
    db.prepare(
      `INSERT INTO reward_events (
        id, family_id, child_id, type, title, body, minutes_delta, xp_delta,
        level_before, level_after, streak_days, task_instance_id, seen_at, created_at
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ? WHERE ${operationGuard}`
    ).bind(
      generateId(),
      parentFamilyId,
      instance.child_id,
      isLevelUp ? 'level_up' : 'task_approved',
      isLevelUp ? `עלית לרמה ${newRank.level}! ${newRank.rankTitle}` : `כל הכבוד! ${instance.title} אושר`,
      rewardMinutes > 0
        ? `קיבלת ${rewardMinutes} דקות מסך ו-${xpAwarded} נקודות קסם!`
        : `קיבלת ${xpAwarded} נקודות קסם על משימת חובה!`,
      rewardMinutes,
      xpAwarded,
      oldRank.level,
      newRank.level,
      newStreak,
      instanceId,
      now,
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
      JSON.stringify({ rewardMinutes, xpAwarded, levelUp: isLevelUp, approvalOperationId }),
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
print('task approval made fully atomic')
