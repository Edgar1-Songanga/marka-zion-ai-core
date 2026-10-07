# MARKA × ZION AI Core

Independent, reusable AI infrastructure for ZION, MARKA, and future products.

## Architecture

- AI Gateway
- Model/provider abstraction
- Knowledge and RAG
- Memory
- Tool engine
- Security and permissions
- Audit
- Evaluation and observability

Product systems remain the source of truth. The AI Core integrates with product APIs and typed tools over HTTPS; it does not connect directly to ZION or MARKA databases.

## Initial spaces

- `zion`
- `marka`

## Development principle

Production-grade architecture first. Provider/model choices remain replaceable, and deterministic product services remain authoritative for critical operations.
