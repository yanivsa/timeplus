-- Academy -> Time+ automatic screen-minute rewards.
-- Every unique correct academy answer credits exactly one screen minute.

CREATE TABLE IF NOT EXISTS learning_profile_links (
  profile_key TEXT PRIMARY KEY,
  child_id TEXT NOT NULL UNIQUE,
  family_id TEXT NOT NULL,
  enabled_from_ms INTEGER NOT NULL,
  last_history_index INTEGER NOT NULL DEFAULT -1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS learning_reward_credits (
  sync_id TEXT PRIMARY KEY,
  profile_key TEXT NOT NULL,
  child_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  subject TEXT,
  question_id TEXT,
  question_timestamp_ms INTEGER NOT NULL,
  activity_date TEXT,
  transaction_id TEXT NOT NULL UNIQUE,
  credited_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY(family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_learning_reward_child_date
  ON learning_reward_credits (child_id, activity_date, credited_at);

CREATE INDEX IF NOT EXISTS idx_learning_reward_profile_time
  ON learning_reward_credits (profile_key, question_timestamp_ms);

CREATE TRIGGER IF NOT EXISTS trg_learning_reward_credit_minute
AFTER INSERT ON learning_reward_credits
BEGIN
  UPDATE children
     SET available_minutes = COALESCE(available_minutes, 0) + 1,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
   WHERE id = NEW.child_id
     AND family_id = NEW.family_id;

  INSERT INTO minute_transactions (
    id, family_id, child_id, type, amount, balance_after,
    reason, created_by, created_at
  )
  VALUES (
    NEW.transaction_id,
    NEW.family_id,
    NEW.child_id,
    'earn',
    1,
    (SELECT available_minutes FROM children WHERE id = NEW.child_id AND family_id = NEW.family_id),
    'אקדמיה: תשובה נכונה',
    'academy_sync',
    strftime('%Y-%m-%dT%H:%M:%fZ','now')
  );
END;
