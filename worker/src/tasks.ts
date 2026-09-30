import { TaskTemplate, TaskInstance, ScheduleType, TaskStatus } from './types';
import { generateId } from './crypto';
import { getIsraelDateString, getIsraelDayOfWeek, getIsraelDayDiff, getIsraelTimeString } from './timezone';
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
                reward_minutes, requires_photo, task_kind, status, due_date, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
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
              reward_minutes, requires_photo, task_kind, status, due_date, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
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
        `SELECT schedule_type, title, description, reward_minutes, requires_photo, task_kind
         FROM task_templates 
         WHERE id = ? AND is_active = 1 AND archived_at IS NULL`
      )
      .bind(instance.template_id)
      .first<{ schedule_type: string; title: string; description: string | null; reward_minutes: number; requires_photo: number; task_kind: 'mandatory' | 'bonus' }>();

    if (tpl && tpl.schedule_type === 'repeatable') {
      const nextInstanceId = generateId();
      await db
        .prepare(
          `INSERT INTO task_instances (
            id, family_id, template_id, child_id, title, description, 
            reward_minutes, requires_photo, task_kind, status, due_date, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`
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
  customRewardMinutes?: number
): Promise<{ success: boolean; error?: string; minutesAwarded?: number; xpAwarded?: number }> {
  // Guarded fetch
  const instance = await db
    .prepare(`SELECT * FROM task_instances WHERE id = ? AND family_id = ?`)
    .bind(instanceId, parentFamilyId)
    .first<TaskInstance>();

  if (!instance) {
    return { success: false, error: 'המשימה לא נמצאה' };
  }

  if (instance.status === 'approved') {
    return { success: false, error: 'המשימה כבר אושרה בעבר' };
  }

  if (instance.status !== 'submitted') {
    return { success: false, error: 'ניתן לאשר רק משימות שהוגשו' };
  }

  const rewardMinutes =
    instance.task_kind === 'mandatory'
      ? 0
      : typeof customRewardMinutes === 'number' && !isNaN(customRewardMinutes)
      ? Math.max(0, customRewardMinutes)
      : instance.reward_minutes;

  const now = new Date().toISOString();
  const todayIsrael = getIsraelDateString();

  // Guarded atomic update: ONLY approve if status is still 'submitted'
  const updateRes = await db
    .prepare(
      `UPDATE task_instances 
       SET status = 'approved', reward_minutes = ?, reviewed_at = ?, reviewed_by = 'parent', updated_at = ? 
       WHERE id = ? AND status = 'submitted'`
    )
    .bind(rewardMinutes, now, now, instanceId)
    .run();

  if (updateRes.meta.changes === 0) {
    return { success: false, error: 'המשימה אינה ממתינה לאישור או שכבר אושרה' };
  }

  // Update submission status
  await db
    .prepare(
      `UPDATE task_submissions 
       SET status = 'approved', reviewed_at = ? 
       WHERE task_instance_id = ? AND status = 'pending'`
    )
    .bind(now, instanceId)
    .run();

  // Fetch current child balance
  const child = await db
    .prepare(`SELECT available_minutes, name FROM children WHERE id = ?`)
    .bind(instance.child_id)
    .first<{ available_minutes: number; name: string }>();

  const previousBalance = child?.available_minutes || 0;
  const newBalance = previousBalance + rewardMinutes;

  // 1. Credit minutes only for bonus tasks. Mandatory tasks award XP only.
  if (rewardMinutes > 0) {
    await db
      .prepare(`UPDATE children SET available_minutes = ?, updated_at = ? WHERE id = ?`)
      .bind(newBalance, now, instance.child_id)
      .run();

    const txId = generateId();
    await db
      .prepare(
        `INSERT INTO minute_transactions (
          id, family_id, child_id, type, amount, balance_after, reason, task_instance_id, created_by, created_at
        ) VALUES (?, ?, ?, 'earn', ?, ?, ?, ?, 'parent', ?)`
      )
      .bind(
        txId,
        parentFamilyId,
        instance.child_id,
        rewardMinutes,
        newBalance,
        `אישור משימה: ${instance.title}`,
        instanceId,
        now
      )
      .run();
  }

  // 2. Calculate and award XP & Gamification progress.
  // task reward_minutes also acts as the effort weight for mandatory tasks.
  const xpAwarded = calculateTaskXp(instance.reward_minutes, instance.requires_photo === 1);

  // Get or initialize child progress
  let progress = await db
    .prepare(`SELECT * FROM child_progress WHERE child_id = ?`)
    .bind(instance.child_id)
    .first<{
      level: number;
      xp: number;
      current_streak_days: number;
      best_streak_days: number;
      last_active_date: string | null;
    }>();

  if (!progress) {
    progress = {
      level: 1,
      xp: 0,
      current_streak_days: 0,
      best_streak_days: 0,
      last_active_date: null,
    };
    await db
      .prepare(
        `INSERT INTO child_progress (child_id, family_id, level, xp, current_streak_days, best_streak_days, last_active_date, updated_at)
         VALUES (?, ?, 1, 0, 0, 0, NULL, ?)`
      )
      .bind(instance.child_id, parentFamilyId, now)
      .run();
  }

  const oldXp = progress.xp;
  const newXp = oldXp + xpAwarded;
  const oldRank = getRankDetails(oldXp);
  const newRank = getRankDetails(newXp);
  const isLevelUp = newRank.level > oldRank.level;

  // Calculate streak based on local Israel date
  let newStreak = progress.current_streak_days;
  if (!progress.last_active_date) {
    newStreak = 1;
  } else {
    const diff = getIsraelDayDiff(progress.last_active_date, todayIsrael);
    if (diff === 1) {
      newStreak += 1;
    } else if (diff === 0) {
      // Already active today, streak remains same
    } else {
      // Missed more than a day, friendly reset to 1
      newStreak = 1;
    }
  }

  const bestStreak = Math.max(progress.best_streak_days, newStreak);

  await db
    .prepare(
      `UPDATE child_progress 
       SET level = ?, xp = ?, current_streak_days = ?, best_streak_days = ?, last_active_date = ?, updated_at = ?
       WHERE child_id = ?`
    )
    .bind(newRank.level, newXp, newStreak, bestStreak, todayIsrael, now, instance.child_id)
    .run();

  // 4. Create Reward Event for child celebration screen
  const rewardEventId = generateId();
  await db
    .prepare(
      `INSERT INTO reward_events (
        id, family_id, child_id, type, title, body, minutes_delta, xp_delta, 
        level_before, level_after, streak_days, task_instance_id, seen_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`
    )
    .bind(
      rewardEventId,
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
      now
    )
    .run();

  // 5. In-app notification for child
  await db
    .prepare(
      `INSERT INTO notifications (
        id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
      ) VALUES (?, ?, 'child', ?, 'task_approved', ?, ?, 'task_instance', ?, ?)`
    )
    .bind(
      generateId(),
      parentFamilyId,
      instance.child_id,
      rewardMinutes > 0 ? `משימה אושרה! +${rewardMinutes} דק'` : 'משימת חובה אושרה! ⭐',
      rewardMinutes > 0
        ? `המשימה "${instance.title}" אושרה! נוספו ${rewardMinutes} דקות לחשבונך.`
        : `המשימה "${instance.title}" אושרה! קיבלת ${xpAwarded} XP.`,
      instanceId,
      now
    )
    .run();

  // 6. Audit log
  await db
    .prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, 'parent', 'parent', 'task_approved', 'task_instance', ?, ?, ?)`
    )
    .bind(
      generateId(),
      parentFamilyId,
      instanceId,
      JSON.stringify({ rewardMinutes, xpAwarded, newBalance, levelUp: isLevelUp }),
      now
    )
    .run();

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
