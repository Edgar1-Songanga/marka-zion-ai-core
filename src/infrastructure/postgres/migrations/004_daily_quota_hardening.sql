CREATE TABLE IF NOT EXISTS ai_tenant_daily_usage (
  tenant_id TEXT NOT NULL,
  usage_day DATE NOT NULL,
  token_count BIGINT NOT NULL DEFAULT 0 CHECK (token_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, usage_day)
);
