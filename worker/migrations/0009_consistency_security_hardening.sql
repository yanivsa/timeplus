-- TIME+ consistency/security hardening (2026-10-17)
--
-- Add durable operation markers used by later atomic workflow hardening and a
-- DB-enforced generation key so concurrent task generation cannot create two
-- logical copies of the same generated task.

ALTER TABLE task_instances ADD COLUMN generation_key TEXT;
ALTER TABLE task_instances ADD COLUMN rejection_operation_id TEXT;
ALTER TABLE task_submissions ADD COLUMN evidence_review_operation_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_instances_generation_key
  ON task_instances (generation_key)
  WHERE generation_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_instances_rejection_operation
  ON task_instances (rejection_operation_id)
  WHERE rejection_operation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_task_submissions_evidence_review_operation
  ON task_submissions (evidence_review_operation_id)
  WHERE evidence_review_operation_id IS NOT NULL;
