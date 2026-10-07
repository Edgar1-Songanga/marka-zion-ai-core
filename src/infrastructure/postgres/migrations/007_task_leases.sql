ALTER TABLE ai_mission_tasks
  ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ai_mission_tasks_lease
  ON ai_mission_tasks (status, lease_until)
  WHERE status = 'RUNNING';
