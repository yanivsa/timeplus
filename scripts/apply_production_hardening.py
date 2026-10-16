from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    data = read(path)
    if new in data:
        return
    if old not in data:
        raise RuntimeError(f"pattern not found in {path}: {old[:120]!r}")
    write(path, data.replace(old, new, 1))


def replace_section(path: str, start: str, end: str, new_section: str) -> None:
    data = read(path)
    a = data.find(start)
    if a < 0:
        raise RuntimeError(f"start marker not found in {path}: {start!r}")
    b = data.find(end, a + len(start))
    if b < 0:
        raise RuntimeError(f"end marker not found in {path}: {end!r}")
    write(path, data[:a] + new_section.rstrip() + "\n\n" + data[b:])


def replace_inside(path: str, section_start: str, section_end: str, old: str, new: str) -> None:
    data = read(path)
    a = data.find(section_start)
    if a < 0:
        raise RuntimeError(f"section start not found in {path}: {section_start!r}")
    b = data.find(section_end, a + len(section_start))
    if b < 0:
        raise RuntimeError(f"section end not found in {path}: {section_end!r}")
    section = data[a:b]
    if new in section:
        return
    if old not in section:
        raise RuntimeError(f"inner pattern not found in {path}: {old[:120]!r}")
    section = section.replace(old, new, 1)
    write(path, data[:a] + section + data[b:])


# 1. Schema-level idempotency and concurrency guards.
write(
    "worker/migrations/0008_production_hardening.sql",
    """-- TIME+ production consistency hardening (2026-10-16)

ALTER TABLE screen_time_requests ADD COLUMN review_operation_id TEXT;
ALTER TABLE task_instances ADD COLUMN approval_operation_id TEXT;
ALTER TABLE task_instances ADD COLUMN submission_operation_id TEXT;

CREATE TABLE IF NOT EXISTS screen_usage_corrections (
  id TEXT PRIMARY KEY,
  usage_log_id TEXT NOT NULL UNIQUE,
  family_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  correction_reason TEXT,
  corrected_at TEXT NOT NULL,
  FOREIGN KEY(usage_log_id) REFERENCES screen_usage_logs(id) ON DELETE CASCADE,
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_screen_usage_corrections_family
  ON screen_usage_corrections (family_id, corrected_at);

-- Heal any pre-existing duplicate active timers before enforcing the invariant.
UPDATE screen_sessions AS older
SET status = 'stopped',
    ended_at = COALESCE(ended_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE older.status IN ('running','paused')
  AND EXISTS (
    SELECT 1
    FROM screen_sessions newer
    WHERE newer.child_id = older.child_id
      AND newer.status IN ('running','paused')
      AND (
        newer.created_at > older.created_at
        OR (newer.created_at = older.created_at AND newer.id > older.id)
      )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_screen_session_per_child
  ON screen_sessions (child_id)
  WHERE status IN ('running','paused');
""",
)

# 2. Fix parent child-details SQL alias and logout token revocation / duplicate reject notification.
replace_inside(
    "worker/src/index.ts",
    "if (pathname.match(/^\\/api\\/parent\\/children\\/[^/]+\\/details$/)",
    "if (pathname === '/api/parent/stats'",
    """FROM task_instances ti
           LEFT JOIN task_submissions ts ON ts.task_instance_id = ti.id AND ts.status = 'pending'""",
    """FROM task_instances ti
           LEFT JOIN task_templates tt ON tt.id = ti.template_id
           LEFT JOIN task_submissions ts ON ts.task_instance_id = ti.id AND ts.status = 'pending'""",
)

replace_section(
    "worker/src/index.ts",
    "    if (pathname === '/api/auth/logout' && method === 'POST') {",
    "    if (pathname === '/api/auth/me' && method === 'GET') {",
    r'''    if (pathname === '/api/auth/logout' && method === 'POST') {
      const cookieHeader = request.headers.get('Cookie');
      const cookies = parseCookies(cookieHeader);
      const cookieToken = cookies['timeplus_session'] || null;
      const authHeader = request.headers.get('Authorization');
      const bearerToken = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7).trim() || null
        : null;

      const tokensToRevoke = [...new Set([cookieToken, bearerToken].filter((token): token is string => Boolean(token)))];
      await Promise.all(tokensToRevoke.map((token) => deleteSession(env.DB, token)));

      return json({ success: true }, 200, { 'Set-Cookie': clearSessionCookie() });
    }''',
)

replace_inside(
    "worker/src/index.ts",
    "if (pathname.match(/^\\/api\\/parent\\/tasks\\/[^/]+\\/reject$/)",
    "if (pathname.match(/^\\/api\\/parent\\/screen-time",
    """                  entityType: 'task_instance',
                  entityId: instanceId,
                });""",
    """                  entityType: 'task_instance',
                  entityId: instanceId,
                  skipDbInsert: true,
                });""",
)

# 3. Approval financial mutation: task state, wallet and ledger are one guarded D1 batch.
replace_section(
    "worker/src/tasks.ts",
    "export async function approveTask(",
    "export async function rejectTask(",
    r'''export async function approveTask(
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
       WHERE task_instance_id = ? AND status = 'pending'
         AND EXISTS (
           SELECT 1 FROM task_instances ti
           WHERE ti.id = ? AND ti.family_id = ? AND ti.status = 'approved'
             AND ti.approval_operation_id = ?
         )`
    ).bind(now, instanceId, instanceId, parentFamilyId, approvalOperationId),
  ];

  if (rewardMinutes > 0 && txId) {
    approvalStatements.push(
      db.prepare(
        `UPDATE children
         SET available_minutes = available_minutes + ?, updated_at = ?
         WHERE id = ? AND family_id = ?
           AND EXISTS (
             SELECT 1 FROM task_instances ti
             WHERE ti.id = ? AND ti.status = 'approved' AND ti.approval_operation_id = ?
           )`
      ).bind(rewardMinutes, now, instance.child_id, parentFamilyId, instanceId, approvalOperationId),
      db.prepare(
        `INSERT INTO minute_transactions (
          id, family_id, child_id, type, amount, balance_after, reason, task_instance_id, created_by, created_at
        )
        SELECT ?, ?, c.id, 'earn', ?, c.available_minutes, ?, ?, ?, ?
        FROM children c
        WHERE c.id = ? AND c.family_id = ?
          AND EXISTS (
            SELECT 1 FROM task_instances ti
            WHERE ti.id = ? AND ti.status = 'approved' AND ti.approval_operation_id = ?
          )`
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
        approvalOperationId
      )
    );
  }

  const approvalResults = await db.batch(approvalStatements);
  if (Number((approvalResults[0] as any)?.meta?.changes || 0) === 0) {
    return { success: false, error: 'המשימה אינה ממתינה לאישור או שכבר אושרה' };
  }

  const child = await db
    .prepare(`SELECT available_minutes FROM children WHERE id = ? AND family_id = ?`)
    .bind(instance.child_id, parentFamilyId)
    .first<{ available_minutes: number }>();
  const newBalance = Number(child?.available_minutes || 0);

  const xpAwarded = calculateTaskXp(instance.reward_minutes, instance.requires_photo === 1);

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

  let newStreak = progress.current_streak_days;
  if (!progress.last_active_date) {
    newStreak = 1;
  } else {
    const diff = getIsraelDayDiff(progress.last_active_date, todayIsrael);
    if (diff === 1) newStreak += 1;
    else if (diff !== 0) newStreak = 1;
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

  await db
    .prepare(
      `INSERT INTO reward_events (
        id, family_id, child_id, type, title, body, minutes_delta, xp_delta,
        level_before, level_after, streak_days, task_instance_id, seen_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`
    )
    .bind(
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
      now
    )
    .run();

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

  await db
    .prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, ?, ?, 'task_approved', 'task_instance', ?, ?, ?)`
    )
    .bind(
      generateId(),
      parentFamilyId,
      actor === 'system' ? 'system' : 'parent',
      actor === 'system' ? 'ai_verifier' : 'parent',
      instanceId,
      JSON.stringify({ rewardMinutes, xpAwarded, newBalance, levelUp: isLevelUp, approvalOperationId }),
      now
    )
    .run();

  return { success: true, minutesAwarded: rewardMinutes, xpAwarded };
}''',
)

# 4. Wallet: make approvals, manual mutations and corrections arithmetic + atomic.
replace_section(
    "worker/src/wallet.ts",
    "export async function reviewScreenTimeRequest(",
    "export async function logManualScreenUsage(",
    r'''export async function reviewScreenTimeRequest(
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

  if (!approved) {
    const updateRes = await db
      .prepare(
        `UPDATE screen_time_requests
         SET status = 'rejected', reviewed_at = ?, reviewed_by = 'parent'
         WHERE id = ? AND family_id = ? AND status = 'pending'`
      )
      .bind(now, requestId, parentFamilyId)
      .run();

    if (updateRes.meta.changes === 0) return { success: false, error: 'הבקשה כבר טופלה' };

    await db.batch([
      db.prepare(
        `INSERT INTO notifications (
          id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
        ) VALUES (?, ?, 'child', ?, 'screen_rejected', 'בקשת זמן מסך לא אושרה', 'ההורים לא אישרו את בקשת זמן המסך כעת.', 'screen_request', ?, ?)`
      ).bind(generateId(), parentFamilyId, req.child_id, requestId, now),
      db.prepare(
        `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
         VALUES (?, ?, 'parent', 'parent', 'screen_time_rejected', 'screen_time_request', ?, '{}', ?)`
      ).bind(generateId(), parentFamilyId, requestId, now),
    ]);

    return { success: true, deductedMinutes: 0 };
  }

  const finalMinutes =
    typeof customMinutes === 'number' && Number.isFinite(customMinutes) && customMinutes > 0
      ? customMinutes
      : req.requested_minutes;
  const reviewOperationId = generateId();
  const usageLogId = generateId();
  const txId = generateId();
  const spendReason = `זמן מסך: ${req.source} (${finalMinutes} דק')`;

  const results = await db.batch([
    db.prepare(
      `UPDATE screen_time_requests
       SET status = 'approved', approved_minutes = ?, reviewed_at = ?, reviewed_by = 'parent', review_operation_id = ?
       WHERE id = ? AND family_id = ? AND status = 'pending'`
    ).bind(finalMinutes, now, reviewOperationId, requestId, parentFamilyId),
    db.prepare(
      `UPDATE children
       SET available_minutes = available_minutes - ?, updated_at = ?
       WHERE id = ? AND family_id = ?
         AND EXISTS (
           SELECT 1 FROM screen_time_requests r
           WHERE r.id = ? AND r.family_id = ? AND r.status = 'approved' AND r.review_operation_id = ?
         )`
    ).bind(finalMinutes, now, req.child_id, parentFamilyId, requestId, parentFamilyId, reviewOperationId),
    db.prepare(
      `INSERT INTO screen_usage_logs (
        id, family_id, child_id, screen_time_request_id, source, minutes, reason, created_by, created_at
      )
      SELECT ?, ?, ?, ?, ?, ?, 'אישור בקשת מסך', 'parent', ?
      WHERE EXISTS (
        SELECT 1 FROM screen_time_requests r
        WHERE r.id = ? AND r.family_id = ? AND r.status = 'approved' AND r.review_operation_id = ?
      )`
    ).bind(usageLogId, parentFamilyId, req.child_id, requestId, req.source, finalMinutes, now, requestId, parentFamilyId, reviewOperationId),
    db.prepare(
      `INSERT INTO minute_transactions (
        id, family_id, child_id, type, amount, balance_after, reason, screen_usage_log_id, screen_time_request_id, created_by, created_at
      )
      SELECT ?, ?, c.id, 'spend', ?, c.available_minutes, ?, ?, ?, 'parent', ?
      FROM children c
      WHERE c.id = ? AND c.family_id = ?
        AND EXISTS (
          SELECT 1 FROM screen_time_requests r
          WHERE r.id = ? AND r.family_id = ? AND r.status = 'approved' AND r.review_operation_id = ?
        )`
    ).bind(txId, parentFamilyId, -finalMinutes, spendReason, usageLogId, requestId, now, req.child_id, parentFamilyId, requestId, parentFamilyId, reviewOperationId),
    db.prepare(
      `INSERT INTO notifications (
        id, family_id, recipient_role, recipient_child_id, type, title, message, entity_type, entity_id, created_at
      )
      SELECT ?, ?, 'child', ?, 'screen_approved', ?, ?, 'screen_request', ?, ?
      WHERE EXISTS (
        SELECT 1 FROM screen_time_requests r
        WHERE r.id = ? AND r.review_operation_id = ?
      )`
    ).bind(
      generateId(), parentFamilyId, req.child_id,
      `זמן מסך אושר! (${finalMinutes} דקות)`,
      `תהנה! נוכו ${finalMinutes} דקות עבור ${req.source}.`,
      requestId, now, requestId, reviewOperationId
    ),
    db.prepare(
      `INSERT INTO audit_log (id, family_id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
       SELECT ?, ?, 'parent', 'parent', 'screen_time_approved', 'screen_time_request', ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM screen_time_requests r
         WHERE r.id = ? AND r.review_operation_id = ?
       )`
    ).bind(
      generateId(), parentFamilyId, requestId,
      JSON.stringify({ finalMinutes, source: req.source, reviewOperationId }),
      now, requestId, reviewOperationId
    ),
  ]);

  if (Number((results[0] as any)?.meta?.changes || 0) === 0) {
    return { success: false, error: 'הבקשה כבר טופלה' };
  }

  return { success: true, deductedMinutes: finalMinutes };
}''',
)

replace_section(
    "worker/src/wallet.ts",
    "export async function logManualScreenUsage(",
    "export async function adjustMinutes(",
    r'''export async function logManualScreenUsage(
  db: D1Database,
  familyId: string,
  childId: string,
  minutes: number,
  source: ScreenTimeSource,
  reason: string | null = null
): Promise<{ success: boolean; error?: string; warning?: string; newBalance?: number }> {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return { success: false, error: 'הדקות לניצול חייבות להיות מספר חיובי' };
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
}''',
)

replace_section(
    "worker/src/wallet.ts",
    "export async function adjustMinutes(",
    "export async function correctUsage(",
    r'''export async function adjustMinutes(
  db: D1Database,
  familyId: string,
  childId: string,
  minutesDelta: number,
  reason: string
): Promise<{ success: boolean; error?: string; warning?: string; newBalance?: number }> {
  if (!Number.isFinite(minutesDelta) || minutesDelta === 0) {
    return { success: false, error: 'שינוי הדקות לא יכול להיות אפס' };
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
}''',
)

replace_section(
    "worker/src/wallet.ts",
    "export async function correctUsage(",
    "export async function getChildWalletSummary(",
    r'''export async function correctUsage(
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
}''',
)

# 5. DST-aware wallet report boundaries.
write(
    "worker/src/timezone.ts",
    r'''export const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

export function getIsraelDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ISRAEL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export function getIsraelDayOfWeek(date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ISRAEL_TIMEZONE,
    weekday: 'short',
  });
  const weekday = formatter.format(date);
  switch (weekday) {
    case 'Sun': return 0;
    case 'Mon': return 1;
    case 'Tue': return 2;
    case 'Wed': return 3;
    case 'Thu': return 4;
    case 'Fri': return 5;
    case 'Sat': return 6;
    default: return 0;
  }
}

function shiftIsoDate(dateStr: string, daysOffset: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + daysOffset, 12, 0, 0));
  return shifted.toISOString().slice(0, 10);
}

export function getIsraelDateOffset(daysOffset: number, baseDate: Date = new Date()): string {
  return shiftIsoDate(getIsraelDateString(baseDate), daysOffset);
}

export function getIsraelDayDiff(olderDateStr: string, newerDateStr: string): number {
  const [y1, m1, d1] = olderDateStr.split('-').map(Number);
  const [y2, m2, d2] = newerDateStr.split('-').map(Number);
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

export function getIsraelStartOfWeek(date: Date = new Date()): string {
  return getIsraelDateOffset(-getIsraelDayOfWeek(date), date);
}

export function getIsraelStartOfMonth(date: Date = new Date()): string {
  return getIsraelDateString(date).substring(0, 8) + '01';
}

const israelDateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ISRAEL_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function israelLocalMidnightUtcIso(dateStr: string): string {
  const [targetYear, targetMonth, targetDay] = dateStr.split('-').map(Number);
  const targetWallClockAsUtc = Date.UTC(targetYear, targetMonth - 1, targetDay, 0, 0, 0);
  let guess = targetWallClockAsUtc;

  for (let i = 0; i < 4; i++) {
    const parts = israelDateTimeFormatter.formatToParts(new Date(guess));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const observedWallClockAsUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second)
    );
    const correction = targetWallClockAsUtc - observedWallClockAsUtc;
    guess += correction;
    if (Math.abs(correction) < 1000) break;
  }

  return new Date(guess).toISOString();
}

export function getIsraelUtcRange(
  startDateInclusive: string,
  endDateExclusive: string
): { startUtc: string; endUtc: string } {
  return {
    startUtc: israelLocalMidnightUtcIso(startDateInclusive),
    endUtc: israelLocalMidnightUtcIso(endDateExclusive),
  };
}

export function getIsraelTimeString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: ISRAEL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
''',
)

replace_once(
    "worker/src/wallet.ts",
    "import { getIsraelDateString, getIsraelStartOfWeek, getIsraelStartOfMonth } from './timezone';",
    "import { getIsraelDateString, getIsraelDateOffset, getIsraelStartOfWeek, getIsraelStartOfMonth, getIsraelUtcRange } from './timezone';",
)

wallet = read("worker/src/wallet.ts")
summary_start = wallet.find("export async function getChildWalletSummary(")
if summary_start < 0:
    raise RuntimeError("wallet summary marker missing")
wallet_summary = r'''export async function getChildWalletSummary(
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
'''
write("worker/src/wallet.ts", wallet[:summary_start] + wallet_summary)

# 6. Enforce one active timer and convert the DB race into the existing friendly error.
replace_once(
    "worker/src/screen-sessions.ts",
    """const SELF_REVIEW_MARKER = 'child_self';

const ALLOWED_SELF_SOURCES""",
    """const SELF_REVIEW_MARKER = 'child_self';

function isActiveSessionConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return /UNIQUE constraint failed: screen_sessions\\.child_id|idx_one_active_screen_session_per_child/i.test(message);
}

const ALLOWED_SELF_SOURCES""",
)

replace_once(
    "worker/src/screen-sessions.ts",
    """  await db.prepare(
    `INSERT INTO screen_sessions
      (id,family_id,child_id,screen_time_request_id,source,allocated_seconds,remaining_seconds,status,started_at,last_resumed_at,created_at,updated_at)
     VALUES (?,?,?,?,?,?,?,'running',?,?,?,?)`
  ).bind(id, familyId, childId, requestId, request.source, seconds, seconds, now, now, now, now).run();

  return { success: true, id };""",
    """  try {
    await db.prepare(
      `INSERT INTO screen_sessions
        (id,family_id,child_id,screen_time_request_id,source,allocated_seconds,remaining_seconds,status,started_at,last_resumed_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,'running',?,?,?,?)`
    ).bind(id, familyId, childId, requestId, request.source, seconds, seconds, now, now, now, now).run();
  } catch (error) {
    if (isActiveSessionConflict(error)) return { success: false, error: 'כבר קיים טיימר פעיל' };
    throw error;
  }

  return { success: true, id };""",
)

replace_once(
    "worker/src/screen-sessions.ts",
    """  await db.batch([
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

  return { success: true, id: sessionId, maxMinutes: availableMinutes };""",
    """  try {
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
  } catch (error) {
    if (isActiveSessionConflict(error)) return { success: false, error: 'כבר קיים טיימר פעיל' };
    throw error;
  }

  return { success: true, id: sessionId, maxMinutes: availableMinutes };""",
)

# 7. Evidence task/submission completion shares a unique operation claim inside one D1 batch.
replace_section(
    "worker/src/evidence.ts",
    "async function completeEvidenceSubmission(",
    "async function getChildEvidence(",
    r'''async function completeEvidenceSubmission(
  env: Env,
  user: AuthUser,
  ctx: ExecutionContext,
  submissionId: string
): Promise<Response> {
  if (user.role !== 'child') return errorJson('פעולה זו זמינה לחשבון ילד בלבד', 403);

  const submission = await getSubmissionForUser(env.DB, submissionId, user);
  if (!submission || submission.child_id !== user.id) return errorJson('ההגשה לא נמצאה', 404);

  if (['pending_ai', 'needs_parent_review', 'ai_unavailable', 'rejected_by_ai', 'verified'].includes(String(submission.verification_status || ''))) {
    return json({ success: true, status: submission.verification_status, submissionId, idempotent: true });
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

  const duplicateDetected = assets.some((asset: any) => Boolean(asset.duplicate_of_asset_id));
  const aiEligible = submission.verification_mode === 'ai_media' && String(env.AI_EVIDENCE_ENABLED || 'true') === 'true';
  const nextStatus = duplicateDetected ? 'needs_parent_review' : aiEligible ? 'pending_ai' : 'needs_parent_review';
  const summary = duplicateDetected
    ? 'זוהתה ראיה זהה לראיה קודמת; נדרשת בדיקת הורה.'
    : aiEligible
    ? 'הראיה נשמרה ונשלחה לאימות אוטומטי.'
    : 'הראיה נשמרה וממתינה לבדיקת הורה.';
  const now = new Date().toISOString();
  const operationId = generateId();

  const transitionResults = await env.DB.batch([
    env.DB.prepare(
      `UPDATE task_instances
       SET status = 'submitted', submitted_at = ?, submission_operation_id = ?, updated_at = ?
       WHERE id = ? AND child_id = ? AND family_id = ? AND (status = 'open' OR status = 'rejected')`
    ).bind(now, operationId, now, submission.task_instance_id, user.id, user.familyId),
    env.DB.prepare(
      `UPDATE task_submissions
       SET verification_status = ?, verification_route = ?, verification_summary = ?,
           review_mode = 'parent', retention_hold = 1
       WHERE id = ? AND verification_status = 'uploading'
         AND EXISTS (
           SELECT 1 FROM task_instances ti
           WHERE ti.id = ? AND ti.child_id = ? AND ti.family_id = ?
             AND ti.status = 'submitted' AND ti.submission_operation_id = ?
         )`
    ).bind(
      nextStatus,
      aiEligible && !duplicateDetected ? 'free_router' : 'none',
      summary,
      submissionId,
      submission.task_instance_id,
      user.id,
      user.familyId,
      operationId
    ),
  ]);

  if (
    Number((transitionResults[0] as any)?.meta?.changes || 0) === 0 ||
    Number((transitionResults[1] as any)?.meta?.changes || 0) === 0
  ) {
    return errorJson('המשימה כבר נמצאת בטיפול', 409);
  }

  if (aiEligible && !duplicateDetected) {
    ctx.waitUntil(verifyEvidenceSubmission(env, submissionId).catch(async (err) => {
      console.error('Evidence AI verification failed', err);
      await env.DB.prepare(
        `UPDATE task_submissions
         SET verification_status='ai_unavailable', review_mode='parent',
             verification_summary='שירות האימות לא היה זמין; התיעוד נשמר לבדיקה ידנית.'
         WHERE id=? AND verification_status='pending_ai'`
      ).bind(submissionId).run().catch(() => undefined);
    }));
  }

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
        operationId,
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
    status: nextStatus,
    duplicateDetected,
    message: aiEligible && !duplicateDetected ? 'התיעוד נשמר ונשלח לאימות' : 'התיעוד נשמר ונשלח לבדיקה',
  });
}''',
)

# 8. Persist bearer token privately in the Android app so cross-origin fallback can rehydrate auth.
write(
    "web/src/context/AuthContext.tsx",
    r'''import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '../types';
import { apiRequest, setApiToken } from '../services/api';
import { unregisterNativeFcmToken } from '../services/nativePush';

type NativeAuthBridge = {
  getAuthToken?: () => string;
  setAuthToken?: (token: string) => void;
  clearAuthToken?: () => void;
};

function getNativeAuthBridge(): NativeAuthBridge | null {
  if (typeof window === 'undefined') return null;
  return ((window as any).TimePlusAndroid as NativeAuthBridge | undefined) || null;
}

function restoreNativeAuthToken(): void {
  try {
    const token = getNativeAuthBridge()?.getAuthToken?.()?.trim();
    if (token) setApiToken(token);
  } catch {
    // Browser/PWA mode has no native bridge.
  }
}

function persistNativeAuthToken(token: string): void {
  try {
    getNativeAuthBridge()?.setAuthToken?.(token);
  } catch {
    // Best effort only; the web session still works.
  }
}

function clearNativeAuthToken(): void {
  try {
    getNativeAuthBridge()?.clearAuthToken?.();
  } catch {
    // Best effort only.
  }
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isInitialized: boolean;
  familyName: string;
  publicChildren: { id: string; name: string; avatar: string; color: string }[];
  login: (role: 'parent' | 'child', pin: string, childId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(true);
  const [familyName, setFamilyName] = useState('משפחה');
  const [publicChildren, setPublicChildren] = useState<{ id: string; name: string; avatar: string; color: string }[]>([]);

  const checkStatus = async () => {
    try {
      const res = await apiRequest<{
        initialized: boolean;
        familyName?: string;
        children?: { id: string; name: string; avatar: string; color: string }[];
      }>('/api/setup/status');
      setIsInitialized(res.initialized);
      if (res.familyName) setFamilyName(res.familyName);
      if (res.children) setPublicChildren(res.children);
    } catch (e) {
      console.error('Failed to check setup status', e);
    }
  };

  const refreshUser = async () => {
    try {
      const res = await apiRequest<{ success: boolean; user: AuthUser }>('/api/auth/me');
      if (res.success && res.user) setUser(res.user);
      else setUser(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      restoreNativeAuthToken();
      await checkStatus();
      await refreshUser();
    };
    init();
  }, []);

  const login = async (role: 'parent' | 'child', pin: string, childId?: string) => {
    const res = await apiRequest<{ success: boolean; user: AuthUser; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ role, pin, childId }),
    });
    if (res.success && res.user) {
      if (res.token) {
        setApiToken(res.token);
        persistNativeAuthToken(res.token);
      }
      setUser(res.user);
    }
  };

  const logout = async () => {
    try {
      await unregisterNativeFcmToken();
    } catch {
      // Best-effort cleanup; logout must still continue.
    }
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // The local/native credentials are still cleared below.
    }
    setApiToken(null);
    clearNativeAuthToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isInitialized, familyName, publicChildren, login, logout, refreshUser, checkStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
''',
)

replace_once(
    "android/app/src/main/java/com/yanivsa/timeplus/MainActivity.kt",
    """        private const val EXACT_ALARM_PROMPT_PREFS = \"timeplus_exact_alarm_prompt\"
        private const val KEY_LAST_EXACT_ALARM_PROMPT = \"last_prompt_at\"""",
    """        private const val EXACT_ALARM_PROMPT_PREFS = \"timeplus_exact_alarm_prompt\"
        private const val KEY_LAST_EXACT_ALARM_PROMPT = \"last_prompt_at\"
        private const val AUTH_PREFS_NAME = \"timeplus_auth\"
        private const val KEY_AUTH_TOKEN = \"bearer_token\"""",
)

replace_once(
    "android/app/src/main/java/com/yanivsa/timeplus/MainActivity.kt",
    """        @JavascriptInterface
        fun getDeviceName(): String {
            return \"${Build.MANUFACTURER} ${Build.MODEL}\".trim()
        }

        @JavascriptInterface
        fun scheduleUsageAlarm""",
    """        @JavascriptInterface
        fun getDeviceName(): String {
            return \"${Build.MANUFACTURER} ${Build.MODEL}\".trim()
        }

        @JavascriptInterface
        fun getAuthToken(): String {
            return activity.getSharedPreferences(AUTH_PREFS_NAME, Context.MODE_PRIVATE)
                .getString(KEY_AUTH_TOKEN, \"\")
                .orEmpty()
        }

        @JavascriptInterface
        fun setAuthToken(token: String) {
            activity.getSharedPreferences(AUTH_PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_AUTH_TOKEN, token.trim())
                .apply()
        }

        @JavascriptInterface
        fun clearAuthToken() {
            activity.getSharedPreferences(AUTH_PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .remove(KEY_AUTH_TOKEN)
                .apply()
        }

        @JavascriptInterface
        fun scheduleUsageAlarm""",
)

# 9. Evidence review push delivery + arithmetic adjustment.
write(
    "worker/src/evidence-review.ts",
    r'''import { getSessionUser } from './auth';
import { generateId } from './crypto';
import { resolveEvidenceRetention } from './evidence-retention';
import { sendNotification } from './notifications';
import { approveTask, rejectTask } from './tasks';
import { Env } from './types';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
function errorJson(message: string, status = 400): Response { return json({ success: false, error: message }, status); }
async function findEvidenceSubmission(env: Env, familyId: string, id: string) {
  return env.DB.prepare(
    `SELECT ts.id,ts.task_instance_id,ts.status,ts.review_mode,ts.verification_status,
            ti.family_id,ti.child_id,ti.title,ti.status AS task_status
     FROM task_submissions ts JOIN task_instances ti ON ti.id=ts.task_instance_id
     WHERE ts.id=? AND ti.family_id=? AND ts.media_kind IS NOT NULL`
  ).bind(id, familyId).first<any>();
}
async function findEvidenceByTask(env: Env, familyId: string, id: string) {
  return env.DB.prepare(
    `SELECT ts.id,ts.task_instance_id,ts.status,ts.review_mode,ts.verification_status,
            ti.family_id,ti.child_id,ti.title,ti.status AS task_status
     FROM task_submissions ts JOIN task_instances ti ON ti.id=ts.task_instance_id
     WHERE ts.task_instance_id=? AND ti.family_id=? AND ts.media_kind IS NOT NULL
     ORDER BY ts.submitted_at DESC LIMIT 1`
  ).bind(id, familyId).first<any>();
}
async function audit(env: Env, familyId: string, id: string, action: string, metadata: unknown) {
  await env.DB.prepare(
    `INSERT INTO audit_log (id,family_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json,created_at)
     VALUES (?,?,'parent','parent',?,'task_submission',?,?,?)`
  ).bind(generateId(), familyId, action, id, JSON.stringify(metadata ?? {}), new Date().toISOString()).run();
}

async function approveEvidence(env: Env, familyId: string, s: any, body: any): Promise<Response> {
  const custom = body.rewardMinutes !== undefined ? Number(body.rewardMinutes) : undefined;
  const r = await approveTask(env.DB, s.task_instance_id, familyId, custom, 'parent');
  if (!r.success) return errorJson(r.error || 'אישור המשימה נכשל', 400);

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE task_submissions SET verification_status='verified',review_mode='parent',reviewed_at=?,status='approved' WHERE id=?`
  ).bind(now, s.id).run();
  if ((r.minutesAwarded || 0) > 0) {
    await env.DB.prepare(
      `UPDATE minute_transactions SET evidence_submission_id=?
       WHERE id=(SELECT id FROM minute_transactions WHERE task_instance_id=? AND evidence_submission_id IS NULL ORDER BY created_at DESC LIMIT 1)`
    ).bind(s.id, s.task_instance_id).run();
  }
  const ret = await resolveEvidenceRetention(env.DB, s.id);
  await audit(env, familyId, s.id, 'evidence_parent_approved', {
    taskInstanceId: s.task_instance_id,
    minutesAwarded: r.minutesAwarded || 0,
    xpAwarded: r.xpAwarded || 0,
    evidenceExpiresAt: ret.expiresAt,
  });
  await sendNotification(env.DB, env, {
    familyId,
    recipientRole: 'child',
    recipientChildId: s.child_id,
    type: 'task_approved',
    title: (r.minutesAwarded || 0) > 0 ? `המשימה אושרה! +${r.minutesAwarded} דק'` : 'משימת חובה אושרה! ⭐',
    message: `המשימה "${s.title}" אושרה לאחר בדיקת התיעוד.`,
    entityType: 'task_instance',
    entityId: s.task_instance_id,
    skipDbInsert: true,
  });
  return json({
    success: true,
    message: 'התיעוד והמשימה אושרו בהצלחה',
    minutesAwarded: r.minutesAwarded || 0,
    xpAwarded: r.xpAwarded || 0,
    evidenceExpiresAt: ret.expiresAt,
  });
}

async function rejectEvidence(env: Env, familyId: string, s: any, body: any): Promise<Response> {
  const reason = String(body.reason || 'הראיה אינה מספיקה').slice(0, 500);
  const r = await rejectTask(env.DB, s.task_instance_id, familyId, reason);
  if (!r.success) return errorJson(r.error || 'דחיית המשימה נכשלה', 400);

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE task_submissions
     SET verification_status='needs_parent_review',review_mode='parent',reviewed_at=?,status='rejected',verification_summary=?
     WHERE id=?`
  ).bind(now, `ההורה דחה את הראיה: ${reason}`, s.id).run();
  const ret = await resolveEvidenceRetention(env.DB, s.id);
  await audit(env, familyId, s.id, 'evidence_parent_rejected', {
    taskInstanceId: s.task_instance_id,
    reason,
    evidenceExpiresAt: ret.expiresAt,
  });
  await sendNotification(env.DB, env, {
    familyId,
    recipientRole: 'child',
    recipientChildId: s.child_id,
    type: 'task_rejected',
    title: `המשימה לא אושרה: ${s.title}`,
    message: reason,
    entityType: 'task_instance',
    entityId: s.task_instance_id,
    skipDbInsert: true,
  });
  return json({ success: true, message: 'הראיה נדחתה וניתן להגיש מחדש', evidenceExpiresAt: ret.expiresAt });
}

async function adjustEvidenceAward(env: Env, familyId: string, s: any, body: any): Promise<Response> {
  if (s.task_status !== 'approved' || s.status !== 'approved') return errorJson('ניתן לשנות דקות רק לאחר אישור המשימה', 409);
  const delta = Number(body.minutesDelta);
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 600) {
    return errorJson('שינוי הדקות חייב להיות מספר שלם בין ‎-600 ל-600 ואינו יכול להיות 0', 400);
  }
  const reason = String(body.reason || 'תיקון זיכוי תיעוד').trim().slice(0, 500);
  const now = new Date().toISOString();
  const tx = generateId();

  const results = await env.DB.batch([
    env.DB.prepare(
      `UPDATE children
       SET available_minutes=available_minutes+?, updated_at=?
       WHERE id=? AND family_id=? AND available_minutes+? >= 0`
    ).bind(delta, now, s.child_id, familyId, delta),
    env.DB.prepare(
      `INSERT INTO minute_transactions
       (id,family_id,child_id,type,amount,balance_after,reason,task_instance_id,evidence_submission_id,created_by,created_at)
       SELECT ?,?,?, 'adjustment', ?, available_minutes, ?, ?, ?, 'parent', ?
       FROM children WHERE id=? AND family_id=? AND updated_at=?`
    ).bind(tx, familyId, s.child_id, delta, reason, s.task_instance_id, s.id, now, s.child_id, familyId, now),
  ]);
  if (Number((results[0] as any)?.meta?.changes || 0) === 0) {
    return errorJson('התיקון ייצור יתרה שלילית; יש לבחור סכום קטן יותר', 400);
  }

  const child = await env.DB.prepare(`SELECT available_minutes FROM children WHERE id=? AND family_id=?`)
    .bind(s.child_id, familyId).first<{ available_minutes: number }>();
  const next = Number(child?.available_minutes || 0);
  await audit(env, familyId, s.id, 'evidence_parent_adjusted', {
    transactionId: tx,
    minutesDelta: delta,
    newBalance: next,
    reason,
  });
  return json({ success: true, message: 'הדקות תוקנו באמצעות תנועת איזון', minutesDelta: delta, newBalance: next, transactionId: tx });
}

export async function handleEvidenceReviewRequest(request: Request, env: Env): Promise<Response | null> {
  if (request.method.toUpperCase() !== 'POST') return null;
  const url = new URL(request.url);
  const a = url.pathname.match(/^\/api\/parent\/evidence\/([^/]+)\/approve$/);
  const r = url.pathname.match(/^\/api\/parent\/evidence\/([^/]+)\/reject$/);
  const j = url.pathname.match(/^\/api\/parent\/evidence\/([^/]+)\/adjust$/);
  const t = url.pathname.match(/^\/api\/parent\/tasks\/([^/]+)\/approve$/);
  if (!a && !r && !j && !t) return null;

  const u = await getSessionUser(request, env.DB);
  if (!u) return errorJson('נדרשת התחברות למערכת', 401);
  if (u.role !== 'parent') return errorJson('פעולה זו מורשית להורים בלבד', 403);
  const s = t ? await findEvidenceByTask(env, u.familyId, t[1]) : await findEvidenceSubmission(env, u.familyId, (a || r || j)![1]);
  if (!s && t) return null;
  if (!s) return errorJson('הגשת הראיה לא נמצאה', 404);
  const body = await request.json().catch(() => ({})) as any;
  if (r) return rejectEvidence(env, u.familyId, s, body);
  if (j) return adjustEvidenceAward(env, u.familyId, s, body);
  return approveEvidence(env, u.familyId, s, body);
}
''',
)

# 10. Automatic AI approval also sends native/web push (DB notification already created by approveTask).
replace_once(
    "worker/src/ai-verification.ts",
    "import { resolveEvidenceRetention } from './evidence-retention';",
    "import { resolveEvidenceRetention } from './evidence-retention';\nimport { sendNotification } from './notifications';",
)

replace_section(
    "worker/src/ai-verification.ts",
    "  await resolveEvidenceRetention(env.DB, submissionId);",
    "export async function recoverStalePendingAiEvidence",
    r'''  await resolveEvidenceRetention(env.DB, submissionId);
  await env.DB.prepare(
    `INSERT INTO audit_log (id,family_id,actor_type,actor_id,action,entity_type,entity_id,metadata_json,created_at)
     VALUES (?,?,'system','ai_verifier','evidence_auto_approved','task_submission',?,?,?)`
  ).bind(
    generateId(),
    sub.family_id,
    submissionId,
    JSON.stringify({
      provider,
      model: routeModel || canonical,
      policyVersion: AI_POLICY_VERSION,
      promptVersion: AI_PROMPT_VERSION,
      minutesAwarded: approved.minutesAwarded,
      xpAwarded: approved.xpAwarded,
      externalReferenceId: haprofessorEvaluation?.examId || null,
    }),
    now
  ).run();
  await sendNotification(env.DB, env, {
    familyId: sub.family_id,
    recipientRole: 'child',
    recipientChildId: sub.child_id,
    type: 'task_approved',
    title: (approved.minutesAwarded || 0) > 0 ? `המשימה אושרה! +${approved.minutesAwarded} דק'` : 'משימת חובה אושרה! ⭐',
    message: `המשימה "${sub.task_title}" אושרה אוטומטית לאחר אימות התיעוד.`,
    entityType: 'task_instance',
    entityId: sub.task_instance_id,
    skipDbInsert: true,
  });
}

''',
)

# 11. Runtime QA must protect direct pushes to main too.
replace_once(
    ".github/workflows/android-runtime-qa.yml",
    """  push:
    branches:
      - migration/pages-origin-v1.0.4""",
    """  push:
    branches:
      - main
      - migration/pages-origin-v1.0.4""",
)

print("production hardening patch applied")
