import { TaskTemplate, TaskInstance, ScheduleType, TaskStatus } from './types';
import { generateId } from './crypto';
import { getIsraelDateString, getIsraelDateOffset, getIsraelDayOfWeek, getIsraelTimeString } from './timezone';
import { calculateTaskXp, getRankDetails } from './gamification';

export async function ensureDailyTaskInstances(
  db: D1Database,
  familyId: string,
  targetDateStr: string = getIsraelDateString()
): Promise<number> {
  const [y, m, d] = targetDateStr.split('-').map(Number);
  const targetDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = getIsraelDayOfWeek(targetDate);

  // Fetch active templates for family
  const { results: templates } = await db
    .prepare(
      `SELECT * FROM task_templates 
       WHERE family_id = ? AND is_active = 1 AND archived_at IS NULL`
    )
    .bind(familyId)
    .all<TaskTemplate>();

  let createdCount = 0;

  for (const tpl of templates) {
    let shouldGenerate = false;
    if (tpl.schedule_type === 'daily' || tpl.schedule_type === 'repeatable') {
      shouldGenerate = true;
    } else if (tpl.schedule_type === 'weekly' || tpl.schedule_type === 'custom') {
      if (tpl.days_of_week) {
        try {
          const days = JSON.parse(tpl.days_of_week) as number[];
          shouldGenerate = Array.isArray(days) && days.some((day) => Number.isInteger(day) && day >= 0 && day <= 6) && days.includes(dayOfWeek);
        } catch {
          shouldGenerate = false;
        }
      }
    } else if (tpl.schedule_type === 'one_time') {
      shouldGenerate = !!tpl.one_time_date && tpl.one_time_date === targetDateStr;
    }

    if (!shouldGenerate) continue;

    // Get assigned children
    const { results: assignments } = await db
      .prepare(`SELECT child_id FROM task_template_children WHERE template_id = ?`)
      .bind(tpl.id)
      .all<{ child_id: string }>();

    for (const assignment of assignments) {
      if (tpl.schedule_type === 'repeatable') {
        // For repeatable tasks, ensure there is always at least one 'open' instance available
        const existingOpen = await db
          .prepare(
            `SELECT id FROM task_instances 
             WHERE template_id = ? AND child_id = ? AND status = 'open'`
          )
          .bind(tpl.id, assignment.child_id)
          .first();

        if (!existingOpen) {
          const instanceId = generateId();
          await db
            .prepare(
              `INSERT INTO task_instances (
                id, family_id, template_id, child_id, title, description, 
                reward_minutes, requires_photo, task_kind, verification_mode, verification_rules_json,
                allow_video_proof, auto_approve_enabled, max_daily_auto_awards, status, due_date, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
            )
            .bind(
              instanceId,
              familyId,
              tpl.id,
              assignment.child_id,
              tpl.title,
              tpl.description,
              tpl.reward_minutes,
              tpl.requires_photo,
              tpl.task_kind || 'bonus',
              tpl.verification_mode || 'manual',
              tpl.verification_rules_json || null,
              Number(tpl.allow_video_proof || 0),
              Number(tpl.auto_approve_enabled || 0),
              tpl.max_daily_auto_awards ?? null,
              targetDateStr
            )
            .run();
          createdCount++;
        }
        continue;
      }

      // Check if instance already exists for this template, child, and date
      const existing = await db
        .prepare(
          `SELECT id FROM task_instances 
           WHERE template_id = ? AND child_id = ? AND due_date = ?`
        )
        .bind(tpl.id, assignment.child_id, targetDateStr)
        .first();

      if (!existing) {
        const instanceId = generateId();
        await db
          .prepare(
            `INSERT INTO task_instances (
              id, family_id, template_id, child_id, title, description, 
              reward_minutes, requires_photo, task_kind, verification_mode, verification_rules_json, allow_video_proof, auto_approve_enabled, max_daily_auto_awards, status, due_date, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
          )
          .bind(
            instanceId,
            familyId,
            tpl.id,
            assignment.child_id,
            tpl.title,
            tpl.description,
            tpl.reward_minutes,
            tpl.requires_photo,
            tpl.task_kind || 'bonus',
            tpl.verification_mode || 'manual',
            tpl.verification_rules_json || null,
            Number(tpl.allow_video_proof || 0),
            Number(tpl.auto_approve_enabled || 0),
            tpl.max_daily_auto_awards ?? null,
            targetDateStr
          )
          .run();
        createdCount++;
      }
    }
  }

  return createdCount;
}

export async function submitTask(
  db: D1Database,
  instanceId: string,
  childId: string,
  note: string | null = null,
  photoObjectKey: string | null = null
): Promise<{ success: boolean; error?: string }> {
  // Guarded state check
  const instance = await db
    .prepare(`SELECT * FROM task_instances WHERE id = ? AND child_id = ?`)
    .bind(instanceId, childId)
    .first<TaskInstance>();

  if (!instance) {
    return { success: false, error: 'המשימה לא נמצאה' };
  }

  if (instance.status !== 'open' && instance.status !== 'rejected') {
    return { success: false, error: 'לא ניתן להגיש משימה שכבר הוגשה או אושרה' };
  }

  if (instance.template_id) {
    const window = await db.prepare(
      `SELECT time_window_start, time_window_end FROM task_templates WHERE id = ?`
    ).bind(instance.template_id).first<{ time_window_start: string | null; time_window_end: string | null }>();
    const nowLocal = getIsraelTimeString();
    if (window?.time_window_start && nowLocal < window.time_window_start) {
      return { success: false, error: `המשימה נפתחת בשעה ${window.time_window_start}` };
    }
    if (window?.time_window_end && nowLocal > window.time_window_end) {
      return { success: false, error: `חלון הזמן למשימה הסתיים בשעה ${window.time_window_end}` };
    }
  }

  const submissionId = generateId();
  const now = new Date().toISOString();

  // Atomically update instance status
  const updateRes = await db
    .prepare(
      `UPDATE task_instances 
       SET status = 'submitted', submitted_at = ?, updated_at = ? 
       WHERE id = ? AND (status = 'open' OR status = 'rejected')`
    )
    .bind(now, now, instanceId)
    .run();

  if (updateRes.meta.changes === 0) {
    return { success: false, error: 'המשימה כבר נמצאת בטיפול' };
  }

  // Record submission
  await db
    .prepare(
      `INSERT INTO task_submissions (
        id, task_instance_id, child_id, note, photo_object_key, status, submitted_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?)`
    )
    .bind(submissionId, instanceId, childId, note, photoObjectKey, now)
    .run();

  // Fetch child name for notification
  const child = await db
    .prepare(`SELECT name FROM children WHERE id = ?`)
    .bind(childId)
    .first<{ name: string }>();

  const childName = child?.name || 'הילד';

  // Create notification for parents
  await db
    .prepare(
      `INSERT INTO notifications (
        id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
      ) VALUES (?, ?, 'parent', NULL, 'task_submitted', ?, ?, 'task_instance', ?, ?)`
    )
    .bind(
      generateId(),
      instance.family_id,
      `משימה חדשה לאישור: ${instance.title}`,
      `${childName} הגיש/ה את המשימה "${instance.title}"`,
      instanceId,
      now
    )
    .run();

  // Audit log
  await db
    .prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, 'child', ?, 'task_submitted', 'task_instance', ?, ?, ?)`
    )
    .bind(
      generateId(),
      instance.family_id,
      childId,
      instanceId,
      JSON.stringify({ note, hasPhoto: !!photoObjectKey }),
      now
    )
    .run();

  // If this task was generated from a repeatable template, spawn the next open instance immediately
  if (instance.template_id) {
    const tpl = await db
      .prepare(
        `SELECT schedule_type, title, description, reward_minutes, requires_photo, task_kind, verification_mode, verification_rules_json, allow_video_proof, auto_approve_enabled, max_daily_auto_awards
         FROM task_templates 
         WHERE id = ? AND is_active = 1 AND archived_at IS NULL`
      )
      .bind(instance.template_id)
      .first<{ schedule_type: string; title: string; description: string | null; reward_minutes: number; requires_photo: number; task_kind: 'mandatory' | 'bonus'; verification_mode: 'manual' | 'ai_media'; verification_rules_json: string | null; allow_video_proof: number; auto_approve_enabled: number; max_daily_auto_awards: number | null }>();

    if (tpl && tpl.schedule_type === 'repeatable') {
      const nextInstanceId = generateId();
      await db
        .prepare(
          `INSERT INTO task_instances (
            id, family_id, template_id, child_id, title, description, 
            reward_minutes, requires_photo, task_kind, verification_mode, verification_rules_json,
            allow_video_proof, auto_approve_enabled, max_daily_auto_awards, status, due_date, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`
        )
        .bind(
          nextInstanceId,
          instance.family_id,
          instance.template_id,
          childId,
          tpl.title,
          tpl.description,
          tpl.reward_minutes,
          tpl.requires_photo,
          tpl.task_kind || 'bonus',
          tpl.verification_mode || 'manual',
          tpl.verification_rules_json || null,
          Number(tpl.allow_video_proof || 0),
          Number(tpl.auto_approve_enabled || 0),
          tpl.max_daily_auto_awards ?? null,
          getIsraelDateString(),
          now,
          now
        )
        .run();
    }
  }

  return { success: true };
}

export async function approveTask(
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

export async function rejectTask(
  db: D1Database,
  instanceId: string,
  parentFamilyId: string,
  reason: string | null = null
): Promise<{ success: boolean; error?: string }> {
  const instance = await db
    .prepare(`SELECT * FROM task_instances WHERE id = ? AND family_id = ?`)
    .bind(instanceId, parentFamilyId)
    .first<TaskInstance>();

  if (!instance) {
    return { success: false, error: 'המשימה לא נמצאה' };
  }

  if (instance.status !== 'submitted') {
    return { success: false, error: 'ניתן לדחות רק משימות שממתינות לאישור' };
  }

  const now = new Date().toISOString();

  const updateRes = await db
    .prepare(
      `UPDATE task_instances 
       SET status = 'rejected', reviewed_at = ?, reviewed_by = 'parent', updated_at = ? 
       WHERE id = ? AND status = 'submitted'`
    )
    .bind(now, now, instanceId)
    .run();

  if (updateRes.meta.changes === 0) {
    return { success: false, error: 'המשימה אינה ממתינה לאישור' };
  }

  await db
    .prepare(
      `UPDATE task_submissions 
       SET status = 'rejected', reviewed_at = ? 
       WHERE task_instance_id = ? AND status = 'pending'`
    )
    .bind(now, instanceId)
    .run();

  // Notification to child
  await db
    .prepare(
      `INSERT INTO notifications (
        id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
      ) VALUES (?, ?, 'child', ?, 'task_rejected', ?, ?, 'task_instance', ?, ?)`
    )
    .bind(
      generateId(),
      parentFamilyId,
      instance.child_id,
      `המשימה לא אושרה: ${instance.title}`,
      reason || 'המשימה לא אושרה על ידי ההורים. ניתן להגיש שוב.',
      instanceId,
      now
    )
    .run();

  // Audit log
  await db
    .prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, 'parent', 'parent', 'task_rejected', 'task_instance', ?, ?, ?)`
    )
    .bind(
      generateId(),
      parentFamilyId,
      instanceId,
      JSON.stringify({ reason }),
      now
    )
    .run();

  return { success: true };
}
