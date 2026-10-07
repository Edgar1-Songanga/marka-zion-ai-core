ALTER TABLE ai_approval_requests
  DROP CONSTRAINT IF EXISTS ai_approval_requests_status_check;

ALTER TABLE ai_approval_requests
  ADD CONSTRAINT ai_approval_requests_status_check
  CHECK (
    status IN (
      'PENDING',
      'APPROVED',
      'REJECTED',
      'EXPIRED',
      'EXECUTING',
      'EXECUTED',
      'FAILED'
    )
  );

CREATE INDEX IF NOT EXISTS ai_jobs_running_lease_idx
  ON ai_jobs (queue, status, locked_at);
