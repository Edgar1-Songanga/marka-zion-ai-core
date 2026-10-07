CREATE TABLE IF NOT EXISTS ai_mission_tasks (
  task_id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES ai_missions(mission_id) ON DELETE CASCADE,
  parent_task_id TEXT REFERENCES ai_mission_tasks(task_id) ON DELETE SET NULL,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING','READY','RUNNING','WAITING_APPROVAL','VERIFYING','COMPLETED','FAILED','CANCELLED')),
  depends_on JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_json JSONB,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 2 CHECK (max_attempts >= 1 AND max_attempts <= 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_mission_tasks_ready
  ON ai_mission_tasks (mission_id, status, updated_at);

CREATE INDEX IF NOT EXISTS idx_ai_mission_tasks_parent
  ON ai_mission_tasks (mission_id, parent_task_id);

CREATE TABLE IF NOT EXISTS ai_mission_task_events (
  event_id BIGSERIAL PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES ai_mission_tasks(task_id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_mission_task_events_task
  ON ai_mission_task_events (task_id, event_id DESC);
