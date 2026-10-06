ALTER TABLE task_submissions ADD COLUMN verification_policy_version TEXT;
ALTER TABLE task_submissions ADD COLUMN verification_prompt_version TEXT;
ALTER TABLE task_submissions ADD COLUMN verification_risk_flags_json TEXT;
ALTER TABLE task_submissions ADD COLUMN ai_shadow_decision TEXT;
ALTER TABLE task_submissions ADD COLUMN auto_approval_eligible INTEGER NOT NULL DEFAULT 0;
ALTER TABLE task_submissions ADD COLUMN ai_verified_at TEXT;
ALTER TABLE task_submissions ADD COLUMN retention_resolved_at TEXT;
CREATE INDEX IF NOT EXISTS idx_task_submissions_ai_status ON task_submissions (verification_status, submitted_at);
CREATE INDEX IF NOT EXISTS idx_task_submissions_retention_hold ON task_submissions (retention_hold, evidence_expires_at);
