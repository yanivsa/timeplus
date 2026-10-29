-- TIME+ repeatable evidence repair (2026-10-29)
--
-- Evidence/AI completion historically changed a repeatable task to submitted
-- without releasing its repeatable-open generation key. Because generation_key
-- is unique, the next repeatable instance was then silently blocked.
--
-- Repair existing rows first, then enforce the invariant in D1 so every code
-- path (including older clients/workers) is protected.

UPDATE task_instances
SET generation_key = 'repeatable-closed:' || id,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE generation_key LIKE 'repeatable-open:%'
  AND status NOT IN ('open', 'rejected');

DROP TRIGGER IF EXISTS trg_release_repeatable_generation_key;
CREATE TRIGGER IF NOT EXISTS trg_release_repeatable_generation_key
AFTER UPDATE OF status ON task_instances
WHEN NEW.status NOT IN ('open', 'rejected')
  AND NEW.generation_key LIKE 'repeatable-open:%'
BEGIN
  UPDATE task_instances
  SET generation_key = 'repeatable-closed:' || NEW.id,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id
    AND generation_key LIKE 'repeatable-open:%';
END;

-- The old "daily completion" pseudo-task was retired. Keep approved history,
-- but make it impossible for legacy data/code to expose an actionable copy.
UPDATE task_instances
SET status = 'cancelled',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE template_id IS NULL
  AND status IN ('open', 'rejected', 'submitted')
  AND title LIKE '%סיום משימות יומיות%';

DROP TRIGGER IF EXISTS trg_block_legacy_daily_completion_insert;
CREATE TRIGGER IF NOT EXISTS trg_block_legacy_daily_completion_insert
AFTER INSERT ON task_instances
WHEN NEW.template_id IS NULL
  AND NEW.status IN ('open', 'rejected', 'submitted')
  AND NEW.title LIKE '%סיום משימות יומיות%'
BEGIN
  UPDATE task_instances
  SET status = 'cancelled',
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;

DROP TRIGGER IF EXISTS trg_block_legacy_daily_completion_update;
CREATE TRIGGER IF NOT EXISTS trg_block_legacy_daily_completion_update
AFTER UPDATE OF status, title, template_id ON task_instances
WHEN NEW.template_id IS NULL
  AND NEW.status IN ('open', 'rejected', 'submitted')
  AND NEW.title LIKE '%סיום משימות יומיות%'
BEGIN
  UPDATE task_instances
  SET status = 'cancelled',
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id
    AND status <> 'cancelled';
END;
