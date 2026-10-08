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

-- Existing repeatable-instance creation paths may have used column defaults instead
-- of copying the template's AI verification snapshot. Repair open instances first.
UPDATE task_instances
SET verification_mode = (SELECT verification_mode FROM task_templates WHERE id = task_instances.template_id),
    verification_rules_json = (SELECT verification_rules_json FROM task_templates WHERE id = task_instances.template_id),
    allow_video_proof = (SELECT allow_video_proof FROM task_templates WHERE id = task_instances.template_id),
    auto_approve_enabled = (SELECT auto_approve_enabled FROM task_templates WHERE id = task_instances.template_id),
    max_daily_auto_awards = (SELECT max_daily_auto_awards FROM task_templates WHERE id = task_instances.template_id)
WHERE template_id IS NOT NULL
  AND verification_mode = 'manual'
  AND EXISTS (
    SELECT 1 FROM task_templates
    WHERE task_templates.id = task_instances.template_id
      AND task_templates.verification_mode = 'ai_media'
  );

-- Keep future repeatable instances aligned without changing normal instances that
-- already carry an explicit verification snapshot.
CREATE TRIGGER IF NOT EXISTS trg_task_instances_inherit_ai_verification
AFTER INSERT ON task_instances
WHEN NEW.template_id IS NOT NULL
  AND NEW.verification_mode = 'manual'
  AND EXISTS (
    SELECT 1 FROM task_templates
    WHERE task_templates.id = NEW.template_id
      AND task_templates.verification_mode = 'ai_media'
  )
BEGIN
  UPDATE task_instances
  SET verification_mode = (SELECT verification_mode FROM task_templates WHERE id = NEW.template_id),
      verification_rules_json = (SELECT verification_rules_json FROM task_templates WHERE id = NEW.template_id),
      allow_video_proof = (SELECT allow_video_proof FROM task_templates WHERE id = NEW.template_id),
      auto_approve_enabled = (SELECT auto_approve_enabled FROM task_templates WHERE id = NEW.template_id),
      max_daily_auto_awards = (SELECT max_daily_auto_awards FROM task_templates WHERE id = NEW.template_id)
  WHERE id = NEW.id;
END;
