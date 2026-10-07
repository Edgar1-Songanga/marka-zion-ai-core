CREATE TABLE IF NOT EXISTS ai_missions (
  mission_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  access_level TEXT NOT NULL CHECK (access_level IN ('STANDARD', 'OWNER')),
  execution_mode TEXT NOT NULL CHECK (execution_mode IN ('ADVISORY', 'EXECUTION', 'AUTONOMOUS')),
  status TEXT NOT NULL CHECK (status IN ('PLANNED', 'RUNNING', 'WAITING_APPROVAL', 'VERIFYING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  objective TEXT NOT NULL,
  plan_json JSONB NOT NULL,
  checkpoint_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  budget_tokens BIGINT,
  consumed_tokens BIGINT NOT NULL DEFAULT 0 CHECK (consumed_tokens >= 0),
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (budget_tokens IS NULL OR budget_tokens >= 0),
  CHECK (consumed_tokens <= COALESCE(budget_tokens, consumed_tokens))
);

CREATE INDEX IF NOT EXISTS idx_ai_missions_tenant_status
  ON ai_missions (tenant_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_missions_user
  ON ai_missions (tenant_id, user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS ai_mission_events (
  event_id BIGSERIAL PRIMARY KEY,
  mission_id TEXT NOT NULL REFERENCES ai_missions(mission_id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_user_id TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_mission_events_mission
  ON ai_mission_events (mission_id, event_id DESC);
