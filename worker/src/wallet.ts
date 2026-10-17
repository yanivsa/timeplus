import { MinuteTransaction, ScreenTimeRequest, ScreenUsageLog, ScreenTimeSource } from './types';
import { generateId } from './crypto';
import { getIsraelDateString, getIsraelDateOffset, getIsraelStartOfWeek, getIsraelStartOfMonth, getIsraelUtcRange } from './timezone';

export async function requestScreenTime(
  db: D1Database,
  familyId: string,
  childId: string,
  minutes: number,
  source: ScreenTimeSource
): Promise<{ success: boolean; error?: string; requestId?: string }> {
  if (!Number.isSafeInteger(minutes) || minutes <= 0) {
    return { success: false, error: 'כמות הדקות חייבת להיות מספר שלם וגדול מאפס' };
  }

  // Check child's available balance: Child cannot independently overspend.
  // Approval performs the same check again against the current balance.
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

  const requestStatements: D1PreparedStatement[] = [
    db.prepare(
      `INSERT INTO screen_time_requests (
        id, family_id, child_id, requested_minutes, source, status, requested_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?)`
    ).bind(requestId, familyId, childId, minutes, source, now),
    db.prepare(
      `INSERT INTO notifications (
        id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
      ) VALUES (?, ?, 'parent', NULL, 'screen_requested', ?, ?, 'screen_request', ?, ?)`
    ).bind(
      generateId(),
      familyId,
      `בקשת זמן מסך: ${minutes} דקות`,
      `${child.name} מבקש/ת ${minutes} דקות ל-${source}`,
      requestId,
      now
    ),
    db.prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, 'child', ?, 'screen_time_requested', 'screen_time_request', ?, ?, ?)`
    ).bind(
      generateId(),
      familyId,
      childId,
      requestId,
      JSON.stringify({ minutes, source }),
      now
    ),
  ];

  // D1 batches are transactional, so a request can never exist without its
  // matching parent notification and audit record (or vice versa).
  await db.batch(requestStatements);

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

  if (!req) return { success: false, error: 'הבקשה לא נמצאה' };
  if (req.status !== 'pending') return { success: false, error: 'הבקשה כבר טופלה בעבר' };

  const now = new Date().toISOString();
  const reviewOperationId = generateId();

  if (!approved) {
    const rejectionGuard = `EXISTS (
      SELECT 1 FROM screen_time_requests r
      WHERE r.id = ? AND r.family_id = ? AND r.status = 'rejected'
        AND r.review_operation_id = ?
    )`;
    const rejectionStatements: D1PreparedStatement[] = [
      db.prepare(
        `UPDATE screen_time_requests
         SET status = 'rejected', reviewed_at = ?, reviewed_by = 'parent', review_operation_id = ?
         WHERE id = ? AND family_id = ? AND status = 'pending'`
      ).bind(now, reviewOperationId, requestId, parentFamilyId),
      db.prepare(
        `INSERT INTO notifications (
          id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
        )
        SELECT ?, ?, 'child', ?, 'screen_rejected', 'בקשת זמן מסך לא אושרה',
               'ההורים לא אישרו את בקשת זמן המסך כעת.', 'screen_request', ?, ?
        WHERE ${rejectionGuard}`
      ).bind(
        generateId(), parentFamilyId, req.child_id, requestId, now,
        requestId, parentFamilyId, reviewOperationId
      ),
      db.prepare(
        `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
         SELECT ?, ?, 'parent', 'parent', 'screen_time_rejected', 'screen_time_request', ?, ?, ?
         WHERE ${rejectionGuard}`
      ).bind(
        generateId(), parentFamilyId, requestId,
        JSON.stringify({ reviewOperationId }), now,
        requestId, parentFamilyId, reviewOperationId
      ),
    ];

    const rejectionResults = await db.batch(rejectionStatements);
    if (Number((rejectionResults[0] as any)?.meta?.changes || 0) === 0) {
      return { success: false, error: 'הבקשה כבר טופלה' };
    }
    return { success: true, deductedMinutes: 0 };
  }

  if (customMinutes !== undefined && (!Number.isSafeInteger(customMinutes) || customMinutes <= 0)) {
    return { success: false, error: 'מספר הדקות לאישור חייב להיות מספר שלם וגדול מאפס' };
  }
  const finalMinutes = customMinutes !== undefined ? customMinutes : req.requested_minutes;
  if (!Number.isSafeInteger(finalMinutes) || finalMinutes <= 0) {
    return { success: false, error: 'מספר הדקות בבקשה אינו תקין' };
  }

  const usageLogId = generateId();
  const txId = generateId();
  const spendReason = `זמן מסך: ${req.source} (${finalMinutes} דק')`;
  const approvalGuard = `EXISTS (
    SELECT 1 FROM screen_time_requests r
    WHERE r.id = ? AND r.family_id = ? AND r.status = 'approved'
      AND r.review_operation_id = ?
  )`;

  const results = await db.batch([
    db.prepare(
      `UPDATE screen_time_requests
       SET status = 'approved', approved_minutes = ?, reviewed_at = ?, reviewed_by = 'parent', review_operation_id = ?
       WHERE id = ? AND family_id = ? AND status = 'pending'
         AND EXISTS (
           SELECT 1 FROM children c
           WHERE c.id = screen_time_requests.child_id AND c.family_id = ?
             AND c.available_minutes >= ?
         )`
    ).bind(finalMinutes, now, reviewOperationId, requestId, parentFamilyId, parentFamilyId, finalMinutes),
    db.prepare(
      `UPDATE children
       SET available_minutes = available_minutes - ?, updated_at = ?
       WHERE id = ? AND family_id = ? AND available_minutes >= ?
         AND ${approvalGuard}`
    ).bind(
      finalMinutes, now, req.child_id, parentFamilyId, finalMinutes,
      requestId, parentFamilyId, reviewOperationId
    ),
    db.prepare(
      `INSERT INTO screen_usage_logs (
        id, family_id, child_id, screen_time_request_id, source, minutes, reason, created_by, created_at
      )
      SELECT ?, ?, ?, ?, ?, ?, 'אישור בקשת מסך', 'parent', ?
      WHERE ${approvalGuard}`
    ).bind(
      usageLogId, parentFamilyId, req.child_id, requestId, req.source, finalMinutes, now,
      requestId, parentFamilyId, reviewOperationId
    ),
    db.prepare(
      `INSERT INTO minute_transactions (
        id, family_id, child_id, type, amount, balance_after, reason, screen_usage_log_id, screen_time_request_id, created_by, created_at
      )
      SELECT ?, ?, c.id, 'spend', ?, c.available_minutes, ?, ?, ?, 'parent', ?
      FROM children c
      WHERE c.id = ? AND c.family_id = ? AND ${approvalGuard}`
    ).bind(
      txId, parentFamilyId, -finalMinutes, spendReason, usageLogId, requestId, now,
      req.child_id, parentFamilyId,
      requestId, parentFamilyId, reviewOperationId
    ),
    db.prepare(
      `INSERT INTO notifications (
        id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
      )
      SELECT ?, ?, 'child', ?, 'screen_approved', ?, ?, 'screen_request', ?, ?
      WHERE ${approvalGuard}`
    ).bind(
      generateId(), parentFamilyId, req.child_id,
      `זמן מסך אושר! (${finalMinutes} דקות)`,
      `תהנה! נוכו ${finalMinutes} דקות עבור ${req.source}.`,
      requestId, now,
      requestId, parentFamilyId, reviewOperationId
    ),
    db.prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       SELECT ?, ?, 'parent', 'parent', 'screen_time_approved', 'screen_time_request', ?, ?, ?
       WHERE ${approvalGuard}`
    ).bind(
      generateId(), parentFamilyId, requestId,
      JSON.stringify({ finalMinutes, source: req.source, reviewOperationId }),
      now,
      requestId, parentFamilyId, reviewOperationId
    ),
  ]);

  if (Number((results[0] as any)?.meta?.changes || 0) === 0) {
    const current = await db.prepare(
      `SELECT r.status, c.available_minutes
       FROM screen_time_requests r
       LEFT JOIN children c ON c.id = r.child_id AND c.family_id = r.family_id
       WHERE r.id = ? AND r.family_id = ?`
    ).bind(requestId, parentFamilyId).first<{ status: string; available_minutes: number | null }>();

    if (current?.status === 'pending' && Number(current.available_minutes ?? -1) < finalMinutes) {
      return {
        success: false,
        error: `אין מספיק דקות בארנק לאישור הבקשה (יתרה נוכחית: ${Number(current.available_minutes ?? 0)} דקות)`,
      };
    }
    return { success: false, error: 'הבקשה כבר טופלה' };
  }

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
  if (!Number.isSafeInteger(minutes) || minutes <= 0) {
    return { success: false, error: 'הדקות לניצול חייבות להיות מספר שלם וחיובי' };
  }

  const child = await db
    .prepare(`SELECT id FROM children WHERE id = ? AND family_id = ?`)
    .bind(childId, familyId)
    .first<{ id: string }>();
  if (!child) return { success: false, error: 'הילד לא נמצא' };

  const settings = await db
    .prepare(`SELECT warning_debt_threshold FROM family_settings WHERE family_id = ?`)
    .bind(familyId)
    .first<{ warning_debt_threshold: number }>();
  const threshold = settings?.warning_debt_threshold ?? -60;
  const now = new Date().toISOString();
  const usageLogId = generateId();
  const txId = generateId();
  const ledgerReason = reason ? `ניצול מסך ידני: ${source} - ${reason}` : `ניצול מסך ידני: ${source}`;

  await db.batch([
    db.prepare(
      `UPDATE children SET available_minutes = available_minutes - ?, updated_at = ? WHERE id = ? AND family_id = ?`
    ).bind(minutes, now, childId, familyId),
    db.prepare(
      `INSERT INTO screen_usage_logs (
        id, family_id, child_id, screen_time_request_id, source, minutes, reason, created_by, created_at
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, 'parent', ?)`
    ).bind(usageLogId, familyId, childId, source, minutes, reason, now),
    db.prepare(
      `INSERT INTO minute_transactions (
        id, family_id, child_id, type, amount, balance_after, reason, screen_usage_log_id, created_by, created_at
      )
      SELECT ?, ?, c.id, 'spend', ?, c.available_minutes, ?, ?, 'parent', ?
      FROM children c WHERE c.id = ? AND c.family_id = ?`
    ).bind(txId, familyId, -minutes, ledgerReason, usageLogId, now, childId, familyId),
    db.prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, 'parent', 'parent', 'manual_screen_usage_logged', 'screen_usage_log', ?, ?, ?)`
    ).bind(generateId(), familyId, usageLogId, JSON.stringify({ minutes, source, reason }), now),
  ]);

  const updated = await db.prepare(`SELECT available_minutes FROM children WHERE id = ? AND family_id = ?`)
    .bind(childId, familyId).first<{ available_minutes: number }>();
  const newBalance = Number(updated?.available_minutes || 0);
  const warning = newBalance < threshold
    ? `שים לב: היתרה החדשה (${newBalance} דקות) חורגת מסף האזהרה המשפחתי (${threshold} דקות)`
    : undefined;

  return { success: true, warning, newBalance };
}

export async function adjustMinutes(
  db: D1Database,
  familyId: string,
  childId: string,
  minutesDelta: number,
  reason: string
): Promise<{ success: boolean; error?: string; warning?: string; newBalance?: number }> {
  if (!Number.isSafeInteger(minutesDelta) || minutesDelta === 0) {
    return { success: false, error: 'שינוי הדקות חייב להיות מספר שלם ושונה מאפס' };
  }
  if (minutesDelta < 0 && (!reason || reason.trim() === '')) {
    return { success: false, error: 'הפחתת דקות דורשת ציון סיבה' };
  }

  const child = await db
    .prepare(`SELECT id FROM children WHERE id = ? AND family_id = ?`)
    .bind(childId, familyId)
    .first<{ id: string }>();
  if (!child) return { success: false, error: 'הילד לא נמצא' };

  const settings = await db
    .prepare(`SELECT warning_debt_threshold FROM family_settings WHERE family_id = ?`)
    .bind(familyId)
    .first<{ warning_debt_threshold: number }>();
  const threshold = settings?.warning_debt_threshold ?? -60;
  const now = new Date().toISOString();
  const txId = generateId();
  const ledgerReason = reason || (minutesDelta > 0 ? 'תוספת דקות ידנית' : 'הפחתת דקות ידנית');
  const statements = [
    db.prepare(`UPDATE children SET available_minutes = available_minutes + ?, updated_at = ? WHERE id = ? AND family_id = ?`)
      .bind(minutesDelta, now, childId, familyId),
    db.prepare(
      `INSERT INTO minute_transactions (
        id, family_id, child_id, type, amount, balance_after, reason, created_by, created_at
      )
      SELECT ?, ?, c.id, 'adjustment', ?, c.available_minutes, ?, 'parent', ?
      FROM children c WHERE c.id = ? AND c.family_id = ?`
    ).bind(txId, familyId, minutesDelta, ledgerReason, now, childId, familyId),
  ];

  if (minutesDelta > 0) {
    statements.push(
      db.prepare(
        `INSERT INTO reward_events (
          id, family_id, child_id, type, title, body, minutes_delta, xp_delta, seen_at, created_at
        ) VALUES (?, ?, ?, 'manual_bonus', ?, ?, ?, 0, NULL, ?)`
      ).bind(generateId(), familyId, childId, 'קיבלת בונוס דקות!', `נוספו ${minutesDelta} דקות: ${reason}`, minutesDelta, now)
    );
  }

  statements.push(
    db.prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, 'parent', 'parent', 'manual_minute_adjustment', 'minute_transaction', ?, ?, ?)`
    ).bind(generateId(), familyId, txId, JSON.stringify({ minutesDelta, reason }), now)
  );

  await db.batch(statements);

  const updated = await db.prepare(`SELECT available_minutes FROM children WHERE id = ? AND family_id = ?`)
    .bind(childId, familyId).first<{ available_minutes: number }>();
  const newBalance = Number(updated?.available_minutes || 0);
  const warning = newBalance < threshold
    ? `שים לב: היתרה החדשה (${newBalance} דקות) נמוכה מסף האזהרה (${threshold} דקות)`
    : undefined;

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
  if (!usage) return { success: false, error: 'רשומת הניצול לא נמצאה' };

  const now = new Date().toISOString();
  const correctionId = generateId();
  const txId = generateId();
  const refundedMinutes = Number(usage.minutes || 0);
  const refundReason = `זיכוי / תיקון רישום שגוי: ${correctionReason || 'תיקון ניצול מסך'}`;

  const results = await db.batch([
    db.prepare(
      `INSERT OR IGNORE INTO screen_usage_corrections (
        id, usage_log_id, family_id, child_id, transaction_id, correction_reason, corrected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(correctionId, usageLogId, familyId, usage.child_id, txId, correctionReason || null, now),
    db.prepare(
      `UPDATE children
       SET available_minutes = available_minutes + ?, updated_at = ?
       WHERE id = ? AND family_id = ?
         AND EXISTS (
           SELECT 1 FROM screen_usage_corrections c
           WHERE c.id = ? AND c.usage_log_id = ?
         )`
    ).bind(refundedMinutes, now, usage.child_id, familyId, correctionId, usageLogId),
    db.prepare(
      `INSERT INTO minute_transactions (
        id, family_id, child_id, type, amount, balance_after, reason, screen_usage_log_id, created_by, created_at
      )
      SELECT ?, ?, c.id, 'refund', ?, c.available_minutes, ?, ?, 'parent', ?
      FROM children c
      WHERE c.id = ? AND c.family_id = ?
        AND EXISTS (
          SELECT 1 FROM screen_usage_corrections correction
          WHERE correction.id = ? AND correction.usage_log_id = ?
        )`
    ).bind(txId, familyId, refundedMinutes, refundReason, usageLogId, now, usage.child_id, familyId, correctionId, usageLogId),
    db.prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       SELECT ?, ?, 'parent', 'parent', 'usage_corrected_refunded', 'screen_usage_log', ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM screen_usage_corrections c WHERE c.id = ? AND c.usage_log_id = ?
       )`
    ).bind(
      generateId(), familyId, usageLogId,
      JSON.stringify({ refundedMinutes, correctionReason, correctionId }), now,
      correctionId, usageLogId
    ),
  ]);

  if (Number((results[0] as any)?.meta?.changes || 0) === 0) {
    return { success: false, error: 'רשומת הניצול כבר תוקנה בעבר' };
  }

  const child = await db.prepare(`SELECT available_minutes FROM children WHERE id = ? AND family_id = ?`)
    .bind(usage.child_id, familyId).first<{ available_minutes: number }>();
  const newBalance = Number(child?.available_minutes || 0);
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
  const tomorrowIsrael = getIsraelDateOffset(1);
  const startOfWeek = getIsraelStartOfWeek();
  const startOfMonth = getIsraelStartOfMonth();
  const todayRange = getIsraelUtcRange(todayIsrael, tomorrowIsrael);
  const weekRange = getIsraelUtcRange(startOfWeek, tomorrowIsrael);
  const monthRange = getIsraelUtcRange(startOfMonth, tomorrowIsrael);

  const summarize = async (startUtc: string, endUtc: string) => db
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as earned,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as spent
       FROM minute_transactions
       WHERE child_id = ? AND created_at >= ? AND created_at < ?`
    )
    .bind(childId, startUtc, endUtc)
    .first<{ earned: number; spent: number }>();

  const [todayRow, weekRow, monthRow] = await Promise.all([
    summarize(todayRange.startUtc, todayRange.endUtc),
    summarize(weekRange.startUtc, weekRange.endUtc),
    summarize(monthRange.startUtc, monthRange.endUtc),
  ]);

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
