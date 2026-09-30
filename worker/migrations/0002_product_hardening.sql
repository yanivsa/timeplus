-- TIME+ product hardening: task kinds, one-time dates, screen-time sessions, push storage

ALTER TABLE task_templates ADD COLUMN task_kind TEXT NOT NULL DEFAULT 'bonus';
ALTER TABLE task_templates ADD COLUMN one_time_date TEXT;
ALTER TABLE task_instances ADD COLUMN task_kind TEXT NOT NULL DEFAULT 'bonus';

CREATE TABLE IF NOT EXISTS screen_sessions (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  screen_time_request_id TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  allocated_seconds INTEGER NOT NULL,
  remaining_seconds INTEGER NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  last_resumed_at TEXT,
  paused_at TEXT,
  ended_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY(screen_time_request_id) REFERENCES screen_time_requests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_screen_sessions_child_status
  ON screen_sessions (child_id, status, created_at);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  recipient_child_id TEXT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_subs_lookup
  ON push_subscriptions (family_id, recipient_role, recipient_child_id);
