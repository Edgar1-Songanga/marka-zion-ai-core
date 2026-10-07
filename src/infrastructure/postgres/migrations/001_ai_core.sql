CREATE TABLE IF NOT EXISTS ai_idempotency_records (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
  response_json JSONB,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (scope, idempotency_key)
);

CREATE INDEX IF NOT EXISTS ai_idempotency_expiry_idx
  ON ai_idempotency_records (expires_at);

CREATE TABLE IF NOT EXISTS ai_audit_events (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  request_id TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  space TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id TEXT,
  tenant_id TEXT,
  tool_name TEXT,
  permission TEXT,
  status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_audit_events_request_idx
  ON ai_audit_events (request_id);

CREATE INDEX IF NOT EXISTS ai_audit_events_tenant_idx
  ON ai_audit_events (tenant_id, created_at);

CREATE TABLE IF NOT EXISTS ai_approval_requests (
  id UUID PRIMARY KEY,
  space TEXT NOT NULL,
  tenant_id TEXT,
  user_id TEXT,
  tool_name TEXT NOT NULL,
  input_json JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED', 'FAILED')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  decided_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ai_approval_requests_scope_idx
  ON ai_approval_requests (tenant_id, user_id, status, created_at);

CREATE TABLE IF NOT EXISTS ai_usage_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT,
  space TEXT NOT NULL,
  user_id TEXT,
  request_id TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  estimated_cost_microunits BIGINT,
  duration_ms INTEGER,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_events_tenant_idx
  ON ai_usage_events (tenant_id, created_at);


CREATE TABLE IF NOT EXISTS ai_rate_limit_buckets (
  tenant_id TEXT NOT NULL,
  bucket_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  token_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, bucket_start)
);


CREATE TABLE IF NOT EXISTS ai_memory_records (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  space TEXT NOT NULL,
  user_id TEXT NOT NULL,
  conversation_id TEXT,
  memory_key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE (tenant_id, space, user_id, memory_key)
);

CREATE INDEX IF NOT EXISTS ai_memory_recent_idx
  ON ai_memory_records (tenant_id, space, user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_knowledge_documents (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  space TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_knowledge_search_idx
  ON ai_knowledge_documents USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS ai_knowledge_scope_idx
  ON ai_knowledge_documents (tenant_id, space);
