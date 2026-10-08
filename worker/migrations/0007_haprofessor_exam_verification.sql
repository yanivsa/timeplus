-- Specialized Haprofessor exam-result verification.
-- Model extraction is audit metadata only; reward claims are the durable anti-duplicate authority.

ALTER TABLE task_submissions ADD COLUMN evidence_provider TEXT;
ALTER TABLE task_submissions ADD COLUMN external_reference_id TEXT;
ALTER TABLE task_submissions ADD COLUMN detected_course_id TEXT;
ALTER TABLE task_submissions ADD COLUMN detected_correct_answers INTEGER;
ALTER TABLE task_submissions ADD COLUMN detected_total_questions INTEGER;
ALTER TABLE task_submissions ADD COLUMN detected_success_percent REAL;
ALTER TABLE task_submissions ADD COLUMN deterministic_confidence INTEGER;

CREATE INDEX IF NOT EXISTS idx_task_submissions_external_reference
  ON task_submissions (child_id, evidence_provider, external_reference_id);

CREATE TABLE IF NOT EXISTS external_reward_claims (
  provider TEXT NOT NULL,
  child_id TEXT NOT NULL,
  external_reference_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  task_instance_id TEXT NOT NULL,
  minutes_awarded INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (provider, child_id, external_reference_id),
  FOREIGN KEY(child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY(submission_id) REFERENCES task_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY(task_instance_id) REFERENCES task_instances(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_external_reward_claims_submission
  ON external_reward_claims (submission_id);
