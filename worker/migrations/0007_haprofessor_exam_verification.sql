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

-- Configure an already-existing Professor task without requiring an APK/UI update.
-- The match is deliberately narrow: the task itself must explicitly mention Professor/Haprofessor.
UPDATE task_templates
SET verification_mode = 'ai_media',
    verification_rules_json = '{"activityType":"haprofessor_exam_result","provider":"haprofessor","rewardPolicy":"correct_answers","requiredChecks":["correct_activity","completion_visible","result_readable","screen_ui_visible","exam_id_readable","score_consistent"],"requireScreenUi":true,"instructions":"Read only the completed Haprofessor summary. One minute per explicitly correct answer. Never infer X from the percentage."}',
    allow_video_proof = 0,
    auto_approve_enabled = 1,
    max_daily_auto_awards = NULL
WHERE title LIKE '%פרופסור%'
   OR title LIKE '%haprofessor%'
   OR COALESCE(description, '') LIKE '%פרופסור%'
   OR COALESCE(description, '') LIKE '%haprofessor%'
   OR COALESCE(verification_rules_json, '') LIKE '%פרופסור%'
   OR COALESCE(verification_rules_json, '') LIKE '%haprofessor%';

UPDATE task_instances
SET verification_mode = 'ai_media',
    verification_rules_json = '{"activityType":"haprofessor_exam_result","provider":"haprofessor","rewardPolicy":"correct_answers","requiredChecks":["correct_activity","completion_visible","result_readable","screen_ui_visible","exam_id_readable","score_consistent"],"requireScreenUi":true,"instructions":"Read only the completed Haprofessor summary. One minute per explicitly correct answer. Never infer X from the percentage."}',
    allow_video_proof = 0,
    auto_approve_enabled = 1,
    max_daily_auto_awards = NULL
WHERE template_id IN (
        SELECT id FROM task_templates
        WHERE verification_rules_json LIKE '%"activityType":"haprofessor_exam_result"%'
      )
   OR title LIKE '%פרופסור%'
   OR title LIKE '%haprofessor%'
   OR COALESCE(description, '') LIKE '%פרופסור%'
   OR COALESCE(description, '') LIKE '%haprofessor%';

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
