-- Native Android push via Firebase Cloud Messaging (FCM)

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  recipient_child_id TEXT,
  token TEXT NOT NULL UNIQUE,
  device_name TEXT,
  platform TEXT NOT NULL DEFAULT 'android',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_lookup
  ON fcm_tokens (family_id, recipient_role, recipient_child_id);
