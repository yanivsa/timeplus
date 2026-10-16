-- TIME+ production consistency hardening (2026-10-16)

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
