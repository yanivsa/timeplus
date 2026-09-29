import { MinuteTransaction, ScreenTimeRequest, ScreenUsageLog, ScreenTimeSource } from './types';
import { generateId } from './crypto';
import { getIsraelDateString, getIsraelStartOfWeek, getIsraelStartOfMonth } from './timezone';

export async function requestScreenTime(
  db: D1Database,
  familyId: string,
  childId: string,
  minutes: number,
  source: ScreenTimeSource
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  if (minutes <= 0) {
    return { success: false, error: 'כמות הדקות חייבת להיות גדולה מאפס' };
  }

  // Check child's available balance: Child cannot independently overspend
  const child = await db
    .prepare(`SELECT available_minutes, name FROM children WHERE id = ? AND family_id = ?`)
    .bind(childId, familyId)
    .first<{ available_minutes: number; name: string }>();

  if (!child) {
    return { success: false, error: 'הילד לא נמצא' };
  }

  if (child.available_minutes < minutes) {
    return {
      success: false,
      error: `אין מספיק דקות בארנק (יתרה נוכחית: ${child.available_minutes} דקות, התבקש: ${minutes} דקות)`,
    };
  }

  const requestId = generateId();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO screen_time_requests (
        id, family_id, child_id, requested_minutes, source, status, requested_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?)`
    )
    .bind(requestId, familyId, childId, minutes, source, now)
    .run();

  // Create notification for parents
  await db
    .prepare(
      `INSERT INTO notifications (
        id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
      ) VALUES (?, ?, 'parent', NULL, 'screen_requested', ?, ?, 'screen_request', ?, ?)`
    )
    .bind(
      generateId(),
      familyId,
      `בקשת זמן מסך: ${minutes} דקות`,
      `${child.name} מבקש/ת ${minutes} דקות ל-${source}`,
      requestId,
      now
    )
    .run();

  // Audit log
  await db
    .prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, 'child', ?, 'screen_time_requested', 'screen_time_request', ?, ?, ?)`
    )
    .bind(
      generateId(),
      familyId,
      childId,
      requestId,
      JSON.stringify({ minutes, source }),
      now
    )
    .run();

  return { success: true, requestId };
}

export async function reviewScreenTimeRequest(
  db: D1Database,
  requestId: string,
  parentFamilyId: string,
  approved: boolean,
  customMinutes?: number
): Promise<{ success: boolean; error?: string; deductedMinutes?: number }> {
  const req = await db
    .prepare(`SELECT * FROM screen_time_requests WHERE id = ? AND family_id = ?`)
    .bind(requestId, parentFamilyId)
    .first<ScreenTimeRequest>();

  if (!req) {
    return { success: false, error: 'הבקשה לא נמצאה' };
  }

  if (req.status !== 'pending') {
    return { success: false, error: 'הבקשה כבר טופלה בעבר' };
  }

  const now = new Date().toISOString();

  if (!approved) {
    // Rejection
    const updateRes = await db
      .prepare(
        `UPDATE screen_time_requests 
         SET status = 'rejected', reviewed_at = ?, reviewed_by = 'parent' 
         WHERE id = ? AND status = 'pending'`
      )
      .bind(now, requestId)
      .run();

    if (updateRes.meta.changes === 0) {
      return { success: false, error: 'הבקשה כבר טופלה' };
    }

    await db
      .prepare(
        `INSERT INTO notifications (
          id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
        ) VALUES (?, ?, 'child', ?, 'screen_rejected', 'בקשת זמן מסך לא אושרה', 'ההורים לא אישרו את בקשת זמן המסך כעת.', 'screen_request', ?, ?)`
      )
      .bind(generateId(), parentFamilyId, req.child_id, requestId, now)
      .run();

    await db
      .prepare(
        `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
         VALUES (?, ?, 'parent', 'parent', 'screen_time_rejected', 'screen_time_request', ?, '{}', ?)`
      )
      .bind(generateId(), parentFamilyId, requestId, now)
      .run();

    return { success: true, deductedMinutes: 0 };
  }

  // Approval
  const finalMinutes =
    typeof customMinutes === 'number' && !isNaN(customMinutes) && customMinutes > 0
      ? customMinutes
      : req.requested_minutes;

  // Guarded update: ONLY update if still 'pending'
  const updateRes = await db
    .prepare(
      `UPDATE screen_time_requests 
       SET status = 'approved', approved_minutes = ?, reviewed_at = ?, reviewed_by = 'parent' 
       WHERE id = ? AND status = 'pending'`
    )
    .bind(finalMinutes, now, requestId)
    .run();

  if (updateRes.meta.changes === 0) {
    return { success: false, error: 'הבקשה כבר טופלה' };
  }

  // Update child balance
  const child = await db
    .prepare(`SELECT available_minutes FROM children WHERE id = ?`)
    .bind(req.child_id)
    .first<{ available_minutes: number }>();

  const prevBalance = child?.available_minutes || 0;
  const newBalance = prevBalance - finalMinutes;

  await db
    .prepare(`UPDATE children SET available_minutes = ?, updated_at = ? WHERE id = ?`)
    .bind(newBalance, now, req.child_id)
    .run();

  // Create usage log
  const usageLogId = generateId();
  await db
    .prepare(
      `INSERT INTO screen_usage_logs (
        id, family_id, child_id, screen_time_request_id, source, minutes, reason, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'אישור בקשת מסך', 'parent', ?)`
    )
    .bind(usageLogId, parentFamilyId, req.child_id, requestId, req.source, finalMinutes, now)
    .run();

  // Create spend transaction
  await db
    .prepare(
      `INSERT INTO minute_transactions (
        id, family_id, child_id, type, amount, balance_after, reason, screen_usage_log_id, screen_time_request_id, created_by, created_at
      ) VALUES (?, ?, ?, 'spend', ?, ?, ?, ?, ?, 'parent', ?)`
    )
    .bind(
      generateId(),
      parentFamilyId,
      req.child_id,
      -finalMinutes,
      newBalance,
      `זמן מסך: ${req.source} (${finalMinutes} דק')`,
      usageLogId,
      requestId,
      now
    )
    .run();

  // Notification for child
  await db
    .prepare(
      `INSERT INTO notifications (
        id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
      ) VALUES (?, ?, 'child', ?, 'screen_approved', ?, ?, 'screen_request', ?, ?)`
    )
    .bind(
      generateId(),
      parentFamilyId,
      req.child_id,
      `זמן מסך אושר! (${finalMinutes} דקות)`,
      `תהנה! נוכו ${finalMinutes} דקות עבור ${req.source}.`,
      requestId,
      now
    )
    .run();

  // Audit log
  await db
    .prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, 'parent', 'parent', 'screen_time_approved', 'screen_time_request', ?, ?, ?)`
    )
    .bind(
      generateId(),
      parentFamilyId,
      requestId,
      JSON.stringify({ finalMinutes, source: req.source, newBalance }),
      now
    )
    .run();

  return { success: true, deductedMinutes: finalMinutes };
}

export async function logManualScreenUsage(
  db: D1Database,
  familyId: string,
  childId: string,
  minutes: number,
  source: ScreenTimeSource,
  reason: string | null = null
): Promise<{ success: boolean; error?: string; warning?: string; newBalance?: number }> {
  if (minutes <= 0) {
    return { success: false, error: 'הדקות לניצול חייבות להיות מספר חיובי' };
  }

  const child = await db
    .prepare(`SELECT available_minutes, name FROM children WHERE id = ? AND family_id = ?`)
    .bind(childId, familyId)
    .first<{ available_minutes: number; name: string }>();

  if (!child) {
    return { success: false, error: 'הילד לא נמצא' };
  }

  // Load family settings for debt warning threshold
  const settings = await db
    .prepare(`SELECT warning_debt_threshold FROM family_settings WHERE family_id = ?`)
    .bind(familyId)
    .first<{ warning_debt_threshold: number }>();

  const threshold = settings?.warning_debt_threshold ?? -60;
  const now = new Date().toISOString();
  const prevBalance = child.available_minutes;
  const newBalance = prevBalance - minutes;

  let warning: string | undefined;
  if (newBalance < threshold) {
    warning = `שים לב: היתרה החדשה (${newBalance} דקות) חורגת מסף האזהרה המשפחתי (${threshold} דקות)`;
  }

  await db
    .prepare(`UPDATE children SET available_minutes = ?, updated_at = ? WHERE id = ?`)
    .bind(newBalance, now, childId)
    .run();

  const usageLogId = generateId();
  await db
    .prepare(
      `INSERT INTO screen_usage_logs (
        id, family_id, child_id, screen_time_request_id, source, minutes, reason, created_by, created_at
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, 'parent', ?)`
    )
    .bind(usageLogId, familyId, childId, source, minutes, reason, now)
    .run();

  await db
    .prepare(
      `INSERT INTO minute_transactions (
        id, family_id, child_id, type, amount, balance_after, reason, screen_usage_log_id, created_by, created_at
      ) VALUES (?, ?, ?, 'spend', ?, ?, ?, ?, 'parent', ?)`
    )
    .bind(
      generateId(),
      familyId,
      childId,
      -minutes,
      newBalance,
      reason ? `ניצול מסך ידני: ${source} - ${reason}` : `ניצול מסך ידני: ${source}`,
      usageLogId,
      now
    )
    .run();

  // Audit log
  await db
    .prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, 'parent', 'parent', 'manual_screen_usage_logged', 'screen_usage_log', ?, ?, ?)`
    )
    .bind(
      generateId(),
      familyId,
      usageLogId,
      JSON.stringify({ minutes, source, reason, newBalance }),
      now
    )
    .run();

  return { success: true, warning, newBalance };
}

export async function adjustMinutes(
  db: D1Database,
  familyId: string,
  childId: string,
  minutesDelta: number,
  reason: string
): Promise<{ success: boolean; error?: string; warning?: string; newBalance?: number }> {
  if (minutesDelta === 0) {
    return { success: false, error: 'שינוי הדקות לא יכול להיות אפס' };
  }

  if (minutesDelta < 0 && (!reason || reason.trim() === '')) {
    return { success: false, error: 'הפחתת דקות דורשת ציון סיבה' };
  }

  const child = await db
    .prepare(`SELECT available_minutes, name FROM children WHERE id = ? AND family_id = ?`)
    .bind(childId, familyId)
    .first<{ available_minutes: number; name: string }>();

  if (!child) {
    return { success: false, error: 'הילד לא נמצא' };
  }

  const settings = await db
    .prepare(`SELECT warning_debt_threshold FROM family_settings WHERE family_id = ?`)
    .bind(familyId)
    .first<{ warning_debt_threshold: number }>();

  const threshold = settings?.warning_debt_threshold ?? -60;
  const now = new Date().toISOString();
  const prevBalance = child.available_minutes;
  const newBalance = prevBalance + minutesDelta;

  let warning: string | undefined;
  if (newBalance < threshold) {
    warning = `שים לב: היתרה החדשה (${newBalance} דקות) נמוכה מסף האזהרה (${threshold} דקות)`;
  }

  await db
    .prepare(`UPDATE children SET available_minutes = ?, updated_at = ? WHERE id = ?`)
    .bind(newBalance, now, childId)
    .run();

  const txId = generateId();
  await db
    .prepare(
      `INSERT INTO minute_transactions (
        id, family_id, child_id, type, amount, balance_after, reason, created_by, created_at
      ) VALUES (?, ?, ?, 'adjustment', ?, ?, ?, 'parent', ?)`
    )
    .bind(
      txId,
      familyId,
      childId,
      minutesDelta,
      newBalance,
      reason || (minutesDelta > 0 ? 'תוספת דקות ידנית' : 'הפחתת דקות ידנית'),
      now
    )
    .run();

  if (minutesDelta > 0) {
    // Reward event if bonus
    await db
      .prepare(
        `INSERT INTO reward_events (
          id, family_id, child_id, type, title, body, minutes_delta, xp_delta, seen_at, created_at
        ) VALUES (?, ?, ?, 'manual_bonus', ?, ?, ?, 0, NULL, ?)`
      )
      .bind(
        generateId(),
        familyId,
        childId,
        'קיבלת בונוס דקות!',
        `נוספו ${minutesDelta} דקות: ${reason}`,
        minutesDelta,
        now
      )
      .run();
  }

  // Audit log
  await db
    .prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, 'parent', 'parent', 'manual_minute_adjustment', 'minute_transaction', ?, ?, ?)`
    )
    .bind(
      generateId(),
      familyId,
      txId,
      JSON.stringify({ minutesDelta, reason, newBalance }),
      now
    )
    .run();

  return { success: true, warning, newBalance };
}

export async function correctUsage(
  db: D1Database,
  familyId: string,
  usageLogId: string,
  correctionReason: string
): Promise<{ success: boolean; error?: string; refundedMinutes?: number; newBalance?: number }> {
  const usage = await db
    .prepare(`SELECT * FROM screen_usage_logs WHERE id = ? AND family_id = ?`)
    .bind(usageLogId, familyId)
    .first<ScreenUsageLog>();

  if (!usage) {
    return { success: false, error: 'רשומת הניצול לא נמצאה' };
  }

  const child = await db
    .prepare(`SELECT available_minutes FROM children WHERE id = ?`)
    .bind(usage.child_id)
    .first<{ available_minutes: number }>();

  const prevBalance = child?.available_minutes || 0;
  const refundedMinutes = usage.minutes;
  const newBalance = prevBalance + refundedMinutes;
  const now = new Date().toISOString();

  // Update balance
  await db
    .prepare(`UPDATE children SET available_minutes = ?, updated_at = ? WHERE id = ?`)
    .bind(newBalance, now, usage.child_id)
    .run();

  // Create refund transaction (immutable ledger principle)
  const txId = generateId();
  await db
    .prepare(
      `INSERT INTO minute_transactions (
        id, family_id, child_id, type, amount, balance_after, reason, screen_usage_log_id, created_by, created_at
      ) VALUES (?, ?, ?, 'refund', ?, ?, ?, ?, 'parent', ?)`
    )
    .bind(
      txId,
      familyId,
      usage.child_id,
      refundedMinutes,
      newBalance,
      `זיכוי / תיקון רישום שגוי: ${correctionReason || 'תיקון ניצול מסך'}`,
      usageLogId,
      now
    )
    .run();

  // Audit log
  await db
    .prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, 'parent', 'parent', 'usage_corrected_refunded', 'screen_usage_log', ?, ?, ?)`
    )
    .bind(
      generateId(),
      familyId,
      usageLogId,
      JSON.stringify({ refundedMinutes, correctionReason, newBalance }),
      now
    )
    .run();

  return { success: true, refundedMinutes, newBalance };
}

export async function getChildWalletSummary(
  db: D1Database,
  childId: string
): Promise<{
  availableMinutes: number;
  earnedToday: number;
  spentToday: number;
  earnedThisWeek: number;
  spentThisWeek: number;
  earnedThisMonth: number;
  spentThisMonth: number;
}> {
  const child = await db
    .prepare(`SELECT available_minutes FROM children WHERE id = ?`)
    .bind(childId)
    .first<{ available_minutes: number }>();

  const availableMinutes = child?.available_minutes || 0;

  const todayIsrael = getIsraelDateString();
  const startOfWeek = getIsraelStartOfWeek();
  const startOfMonth = getIsraelStartOfMonth();

  // Today stats
  const todayRow = await db
    .prepare(
      `SELECT 
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as earned,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as spent
       FROM minute_transactions 
       WHERE child_id = ? AND date(created_at, '+3 hours') = ?`
    )
    .bind(childId, todayIsrael)
    .first<{ earned: number; spent: number }>();

  // Week stats
  const weekRow = await db
    .prepare(
      `SELECT 
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as earned,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as spent
       FROM minute_transactions 
       WHERE child_id = ? AND date(created_at, '+3 hours') >= ?`
    )
    .bind(childId, startOfWeek)
    .first<{ earned: number; spent: number }>();

  // Month stats
  const monthRow = await db
    .prepare(
      `SELECT 
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as earned,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as spent
       FROM minute_transactions 
       WHERE child_id = ? AND date(created_at, '+3 hours') >= ?`
    )
    .bind(childId, startOfMonth)
    .first<{ earned: number; spent: number }>();

  return {
    availableMinutes,
    earnedToday: todayRow?.earned || 0,
    spentToday: todayRow?.spent || 0,
    earnedThisWeek: weekRow?.earned || 0,
    spentThisWeek: weekRow?.spent || 0,
    earnedThisMonth: monthRow?.earned || 0,
    spentThisMonth: monthRow?.spent || 0,
  };
}
