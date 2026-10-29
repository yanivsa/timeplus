-- TIME+ D1 query-performance hardening (2026-10-29)
--
-- The every-minute screen-session cron must remain frequent so expiry
-- notifications are timely, but its pending-notification query used to scan
-- screen_sessions plus correlated audit_log/notifications subqueries.
-- These indexes make the cron proportional to active/pending sessions instead
-- of total historical rows.

CREATE INDEX IF NOT EXISTS idx_screen_sessions_status_ended
  ON screen_sessions (status, ended_at);

CREATE INDEX IF NOT EXISTS idx_audit_screen_session_expired_entity
  ON audit_log (entity_id)
  WHERE entity_type = 'screen_session'
    AND action = 'screen_session_expired';

CREATE INDEX IF NOT EXISTS idx_notifications_screen_time_up_entity
  ON notifications (entity_id)
  WHERE type = 'screen_time_up'
    AND entity_type = 'screen_session';
