-- Keep unfinished task instances aligned with their template reward.
-- Historical approved instances remain immutable.

CREATE TRIGGER IF NOT EXISTS sync_task_reward_after_template_update
AFTER UPDATE OF reward_minutes ON task_templates
FOR EACH ROW
WHEN NEW.reward_minutes IS NOT OLD.reward_minutes
BEGIN
  UPDATE task_instances
  SET reward_minutes = NEW.reward_minutes,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  WHERE template_id = NEW.id
    AND status IN ('open','submitted','rejected');
END;

-- One-time repair for stale active instances created before this trigger existed.
UPDATE task_instances
SET reward_minutes = (
      SELECT tt.reward_minutes
      FROM task_templates tt
      WHERE tt.id = task_instances.template_id
    ),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
WHERE status IN ('open','submitted','rejected')
  AND template_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM task_templates tt
    WHERE tt.id = task_instances.template_id
      AND tt.reward_minutes <> task_instances.reward_minutes
  );
