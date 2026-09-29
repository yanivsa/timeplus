-- Time+ Cloudflare D1 Production Schema Migration 0001

-- 1. Families
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_pin_hash TEXT NOT NULL,
  parent_pin_salt TEXT NOT NULL,
  is_initialized INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 2. Family Settings
CREATE TABLE IF NOT EXISTS family_settings (
  family_id TEXT PRIMARY KEY,
  max_balance_minutes INTEGER DEFAULT NULL,
  daily_spend_limit_minutes INTEGER DEFAULT NULL,
  warning_debt_threshold INTEGER DEFAULT -60,
  allow_photo_proof INTEGER DEFAULT 0,
  sound_enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- 3. Children (Dynamic N children support)
CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  avatar TEXT DEFAULT 'wizard',
  color TEXT DEFAULT '#4facfe',
  available_minutes INTEGER DEFAULT 0,
  debt_limit_minutes INTEGER DEFAULT 60,
  daily_spend_limit_minutes INTEGER DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- 4. Sessions (Server-managed opaque tokens)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'parent' or 'child'
  child_id TEXT, -- NULL for parent
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 5. Task Templates
CREATE TABLE IF NOT EXISTS task_templates (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reward_minutes INTEGER NOT NULL,
  schedule_type TEXT NOT NULL, -- 'one_time', 'daily', 'weekly', 'custom'
  days_of_week TEXT, -- JSON array of weekday numbers [0..6] (0 = Sunday in IL)
  time_window_start TEXT,
  time_window_end TEXT,
  requires_photo INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- 6. Task Template Child Assignment
CREATE TABLE IF NOT EXISTS task_template_children (
  template_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  PRIMARY KEY (template_id, child_id),
  FOREIGN KEY(template_id) REFERENCES task_templates(id) ON DELETE CASCADE,
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 7. Task Instances
CREATE TABLE IF NOT EXISTS task_instances (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  template_id TEXT,
  child_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reward_minutes INTEGER NOT NULL,
  requires_photo INTEGER DEFAULT 0,
  status TEXT NOT NULL, -- 'open', 'submitted', 'approved', 'rejected', 'expired', 'cancelled'
  due_date TEXT NOT NULL, -- YYYY-MM-DD in Asia/Jerusalem
  submitted_at TEXT,
  reviewed_at TEXT,
  reviewed_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY(template_id) REFERENCES task_templates(id) ON DELETE SET NULL,
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 8. Task Submissions
CREATE TABLE IF NOT EXISTS task_submissions (
  id TEXT PRIMARY KEY,
  task_instance_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  note TEXT,
  photo_object_key TEXT,
  status TEXT NOT NULL, -- 'pending', 'approved', 'rejected'
  submitted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  reviewed_at TEXT,
  FOREIGN KEY(task_instance_id) REFERENCES task_instances(id) ON DELETE CASCADE,
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 9. Minute Transactions (Immutable Ledger)
CREATE TABLE IF NOT EXISTS minute_transactions (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'earn', 'spend', 'adjustment', 'refund'
  amount INTEGER NOT NULL, -- Positive for credit, negative for debit
  balance_after INTEGER NOT NULL,
  reason TEXT,
  task_instance_id TEXT,
  screen_usage_log_id TEXT,
  screen_time_request_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY(task_instance_id) REFERENCES task_instances(id) ON DELETE SET NULL
);

-- 10. Screen Time Requests
CREATE TABLE IF NOT EXISTS screen_time_requests (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  requested_minutes INTEGER NOT NULL,
  approved_minutes INTEGER,
  source TEXT NOT NULL, -- 'playstation', 'tv', 'computer', 'tablet', 'phone', 'youtube', 'other'
  status TEXT NOT NULL, -- 'pending', 'approved', 'rejected', 'cancelled'
  requested_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  reviewed_at TEXT,
  reviewed_by TEXT,
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 11. Screen Usage Logs
CREATE TABLE IF NOT EXISTS screen_usage_logs (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  screen_time_request_id TEXT,
  source TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  reason TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY(screen_time_request_id) REFERENCES screen_time_requests(id) ON DELETE SET NULL
);

-- 12. In-App Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  recipient_role TEXT NOT NULL, -- 'parent', 'child'
  recipient_child_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- 13. Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  actor_type TEXT NOT NULL, -- 'parent', 'child', 'system'
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- 14. Child Progress & Gamification (XP, Levels, Streaks)
CREATE TABLE IF NOT EXISTS child_progress (
  child_id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  current_streak_days INTEGER DEFAULT 0,
  best_streak_days INTEGER DEFAULT 0,
  last_active_date TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- 15. Reward Events (for Child Victory / Celebration Screen)
CREATE TABLE IF NOT EXISTS reward_events (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'task_approved', 'manual_bonus', 'level_up', 'streak_milestone'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  minutes_delta INTEGER DEFAULT 0,
  xp_delta INTEGER DEFAULT 0,
  level_before INTEGER,
  level_after INTEGER,
  streak_days INTEGER DEFAULT 0,
  task_instance_id TEXT,
  seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY(task_instance_id) REFERENCES task_instances(id) ON DELETE SET NULL
);

-- 16. Login Attempts (Rate Limiting & Lockout against Brute Force)
CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  ip_address TEXT,
  target_role TEXT NOT NULL,
  target_id TEXT,
  success INTEGER NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 17. Idempotency Keys (Prevent double submission/approval)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Indices for high performance and integrity
CREATE INDEX IF NOT EXISTS idx_task_instances_child_due ON task_instances (child_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_task_instances_family_status ON task_instances (family_id, status);
CREATE INDEX IF NOT EXISTS idx_task_instances_template_due ON task_instances (template_id, due_date);
CREATE INDEX IF NOT EXISTS idx_minute_transactions_child_created ON minute_transactions (child_id, created_at);
CREATE INDEX IF NOT EXISTS idx_minute_transactions_family_created ON minute_transactions (family_id, created_at);
CREATE INDEX IF NOT EXISTS idx_screen_requests_child_status ON screen_time_requests (child_id, status);
CREATE INDEX IF NOT EXISTS idx_screen_requests_family_status ON screen_time_requests (family_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (recipient_role, recipient_child_id, read_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts (ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_audit_family_created ON audit_log (family_id, created_at);
