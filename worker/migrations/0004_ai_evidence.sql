-- TIME+ AI Proof-of-Work foundation
-- Evidence metadata lives in D1; binary media lives in private R2.

ALTER TABLE task_templates ADD COLUMN verification_mode TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE task_templates ADD COLUMN verification_rules_json TEXT;
ALTER TABLE task_templates ADD COLUMN allow_video_proof INTEGER NOT NULL DEFAULT 0;
ALTER TABLE task_templates ADD COLUMN auto_approve_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE task_templates ADD COLUMN max_daily_auto_awards INTEGER;

ALTER TABLE task_instances ADD COLUMN verification_mode TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE task_instances ADD COLUMN verification_rules_json TEXT;
ALTER TABLE task_instances ADD COLUMN allow_video_proof INTEGER NOT NULL DEFAULT 0;
ALTER TABLE task_instances ADD COLUMN auto_approve_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE task_instances ADD COLUMN max_daily_auto_awards INTEGER;

ALTER TABLE task_submissions ADD COLUMN verification_status TEXT;
ALTER TABLE task_submissions ADD COLUMN verification_route TEXT;
ALTER TABLE task_submissions ADD COLUMN verification_provider TEXT;
ALTER TABLE task_submissions ADD COLUMN verification_model TEXT;
ALTER TABLE task_submissions ADD COLUMN verification_summary TEXT;
ALTER TABLE task_submissions ADD COLUMN verification_checks_json TEXT;
ALTER TABLE task_submissions ADD COLUMN review_mode TEXT NOT NULL DEFAULT 'parent';
ALTER TABLE task_submissions ADD COLUMN media_sha256 TEXT;
ALTER TABLE task_submissions ADD COLUMN media_kind TEXT;
ALTER TABLE task_submissions ADD COLUMN media_source TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE task_submissions ADD COLUMN evidence_expires_at TEXT;
ALTER TABLE task_submissions ADD COLUMN retention_hold INTEGER NOT NULL DEFAULT 0;

ALTER TABLE minute_transactions ADD COLUMN evidence_submission_id TEXT;

CREATE TABLE IF NOT EXISTS submission_evidence_assets (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 TEXT,
  duplicate_of_asset_id TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  deleted_at TEXT,
  FOREIGN KEY(submission_id) REFERENCES task_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY(duplicate_of_asset_id) REFERENCES submission_evidence_assets(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_evidence_assets_submission
  ON submission_evidence_assets (submission_id, created_at);
CREATE INDEX IF NOT EXISTS idx_evidence_assets_expiry
  ON submission_evidence_assets (expires_at, deleted_at);
CREATE INDEX IF NOT EXISTS idx_evidence_assets_hash
  ON submission_evidence_assets (sha256, deleted_at);

CREATE TABLE IF NOT EXISTS ai_verification_attempts (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  route TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  status TEXT NOT NULL,
  latency_ms INTEGER,
  result_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(submission_id) REFERENCES task_submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_verification_submission
  ON ai_verification_attempts (submission_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_submissions_verification
  ON task_submissions (verification_status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_minute_transactions_evidence
  ON minute_transactions (evidence_submission_id);
