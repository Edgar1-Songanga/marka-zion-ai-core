ALTER TABLE ai_approval_requests
  ADD COLUMN IF NOT EXISTS executing_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ai_approval_executing_lease_idx
  ON ai_approval_requests (status, executing_at);
