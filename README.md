# MARKA × ZION AI Core

Independent, reusable AI infrastructure for ZION, MARKA, and future products.

## Non-negotiable architecture

The AI Core is a separate service. It **never connects directly to ZION or MARKA databases**.

Integration is:

`Product API → AI Core HTTPS API → governed tools / knowledge / model providers`

ZION and MARKA remain the source of truth for their own domains.

## Current production foundation

- **AI Gateway** — versioned HTTP boundary under `/api/v1/ai`.
- **Security** — API authentication boundary that fails closed in production when credentials are not configured.
- **Request governance** — correlation IDs, input-size limits, supported-space/operation validation.
- **Audit** — accepted AI requests produce structured audit events.
- **Model layer** — provider contract and registry; provider choice is replaceable.
- **Knowledge/RAG boundary** — typed provider contract isolated from the gateway.
- **Memory boundary** — typed store contract isolated from the gateway.
- **Tool engine** — typed tools with ZION/MARKA space isolation and READ/WRITE/SENSITIVE_WRITE permissions.
- **Observability boundary** — reserved for metrics, tracing, structured logs and operational telemetry.

## Product-space model

ZION and MARKA are the first registered spaces, not architectural limits.

The AI Core is designed as a **multi-product / multi-tenant platform**. New internal products, future company projects, and eventually external customers can register their own isolated AI space without changing the public AI Core contract.

Each space can define its own connectors, tools, knowledge sources, memory policies, model-routing policy and permissions. Cross-space access is never implicit.

This makes the core suitable for a future commercial offering: the same infrastructure can power our products and, behind strict tenant isolation and billing/quotas, potentially serve third-party products.

## Financial and operational safety

MARKA financial truth remains inside MARKA deterministic services. The AI Core must call authorized MARKA APIs/tools and must never calculate or mutate financial truth as an independent source of record.

Likewise, ZION AI must rely on authorized ZION knowledge and product APIs for doctrine, governance, policy and other authoritative information.

## Provider strategy

The public AI Core contract is provider-neutral. Model/provider selection can change without requiring ZION or MARKA clients to change their integration contract.

No model is trained from scratch in this foundation. Model selection, RAG, memory, tools, permissions and evaluation will be introduced behind stable interfaces.

## Configuration

Copy `.env.example` to the deployment environment. In production, `AI_CORE_API_KEY` must be configured.

## Next engineering layers

1. Provider adapter + current model routing configuration. **Implemented:** Vercel AI Gateway adapter with configurable model and timeout.
2. Product connector framework for ZION and MARKA HTTPS APIs.
3. Persistent memory and knowledge adapters.
4. Idempotency and durable tool execution.
5. Human approval workflow for sensitive writes.
6. Evaluation, tracing, cost/latency telemetry and policy enforcement.
7. Queue/worker execution for long-running operations.


## Production V1 layers now implemented

- Multi-product and multi-tenant space registry with PostgreSQL persistence.
- Signed inbound product context; production never trusts tenant/user/role fields from request bodies.
- Durable PostgreSQL audit, idempotency, approvals, usage, quotas, memory, knowledge and jobs.
- Governed READ / WRITE / SENSITIVE_WRITE tools with schema boundaries.
- Multi-step agent orchestration with a hard step ceiling and deterministic tool idempotency.
- Sensitive agent actions stop for human approval instead of executing autonomously.
- Tenant-scoped PostgreSQL RAG and persistent memory with untrusted-context rules.
- HTTPS product connectors with operation allowlists, response limits and SSRF protections.
- Durable queue/worker with atomic claims, retry backoff, dead-letter state and lease recovery.
- Evaluation harness for controlled model regression cases.
- Production HTTP hardening, readiness checks and Node 22 CI build gate.

The core is designed to be reusable by ZION, MARKA and future products without changing its public architecture. Product-specific truth remains outside the AI Core.
