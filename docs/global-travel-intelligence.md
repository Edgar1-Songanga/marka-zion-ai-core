# Global Travel Intelligence — Architecture and Delivery Plan

## Product decision

Global Travel Intelligence has two delivery surfaces backed by the same AI Core:

1. **Standalone application** — its own brand, onboarding, trip workspace, document vault, notifications and billing.
2. **AI Core capability** — the `global-travel` product space, reusable by the standalone application and future authorized product integrations.

The AI Core remains a separate service. It must not connect directly to MARKA or ZION databases. Each product owns its own domain data and exposes narrowly scoped HTTPS operations.

## Execution policy

The selected operating mode is **prepare-first / user-confirmed execution**.

- Default mission mode is `ADVISORY`.
- Research, comparison, itinerary drafting and document checklists may be prepared without committing the user.
- Any operation that creates an external commitment must require a separate, explicit confirmation: booking, payment, appointment scheduling, form submission, cancellation or disclosure of a document.
- A confirmation is bound to the exact action payload, provider, price/terms where applicable, user, tenant and expiry. A changed payload requires a new confirmation.
- No autonomous execution mode is enabled for travel agents.
- Government decisions, visa approvals, biometric capture and mandatory in-person interviews remain outside the agent's control.

## Agent team

The AI Core registry now includes advisory-only specialist definitions:

- Global Travel Concierge — coordinates the trip plan and identifies missing information.
- Visa and Consular Research — organizes destination-specific requirements and official-source checklists.
- Flight Research — compares routes, fare conditions, baggage and layovers when a provider is connected.
- Accommodation Research — compares location, total cost and cancellation terms when a provider is connected.
- Travel Safety and Privacy — checks travel risks, sensitive-data exposure and document minimization.

These are agent capabilities, not proof of live external integrations. Provider-backed search and booking are separate delivery gates.

## Data boundaries and privacy

Passport numbers, MRZ data, scans, identity images, financial statements and other high-risk personal data must not be placed in model prompts, generic conversation memory, logs or analytics.

The standalone application's document vault owns original documents. It must use encryption at rest and in transit, strict tenant/user access controls, short-lived signed access, audit trails, explicit consent and retention/deletion policies. The AI Core should receive only the minimum derived facts needed for a task (for example: nationality, passport expiry date, document type and verification status), with direct identifiers redacted.

Travel memory is scoped by tenant, user and product space. It stores preferences and trip context only when necessary and with a clear retention policy. It must never silently reuse one user's documents or travel facts for another user.

## Domain model (standalone application)

- Traveller profile: nationality, residence, preferred language, accessibility and travel preferences.
- Trip request: origin, destination, dates, purpose, party size, budget and constraints.
- Document vault: encrypted objects and metadata; no raw document content in AI Core.
- Requirement assessment: official source, jurisdiction, retrieval timestamp, applicability and uncertainty.
- Travel plan: versioned flights, lodging, ground transport, schedule, checklist and estimated total cost.
- External action: provider, exact payload, quoted terms, expiry, confirmation status, idempotency key and outcome.
- Audit event: actor, action, consent, source, timestamp and result.

## Integration contracts

The AI Core `global-travel` space is registered and has an isolated optional HTTPS product connector configuration using the `AI_GLOBAL_TRAVEL_*` environment prefix.

The standalone application should call the AI Core using the existing signed product-context contract. The AI Core must not accept tenant, user or role identity from an unsigned request body.

External provider adapters are intentionally not enabled by default. Each adapter must declare:
- Supported read and write operations.
- Source-of-truth and freshness guarantees.
- Jurisdiction and market coverage.
- Price/availability timestamp and expiry.
- Cancellation, refund and failure semantics.
- Idempotency and reconciliation behavior.
- Required user confirmation and evidence of that confirmation.

## Required provider families

1. Official immigration and consular sources — primary authority for visa rules, appointments and required documents.
2. Flight search/booking providers — availability, fare rules, baggage, ticketing and cancellations.
3. Accommodation providers — availability, taxes, cancellation and payment terms.
4. Ground transport and travel assistance providers.
5. Notifications and customer support.

Do not scrape sites that prohibit automation or bypass CAPTCHA, access controls, queues or anti-bot protections. Use official APIs, partner integrations or user-assisted handoff where automation is not permitted.

## Standalone application architecture

- Web/mobile client: trip intake, consent, review workspace, document vault and status timeline.
- Application API: identity, traveller profiles, trip requests, provider orchestration and notifications.
- Secure document service: encrypted storage, malware scanning, signed URLs and retention controls.
- AI Core adapter: signed context, `global-travel` space, advisory planning and approved tool workflows.
- Provider adapters: separate, replaceable integrations for each supplier and government service.
- Operations console: exception handling, customer support, provider reconciliation and audit.

## Delivery phases and acceptance gates

### Phase 0 — Foundation (in progress)
- Register `global-travel` as an isolated AI product space.
- Add advisory-only travel specialist agents.
- Document data boundaries and user-confirmed execution policy.
- Keep all provider connectors disabled until credentials, contracts and tests exist.

### Phase 1 — Planning MVP
- Collect trip details without requesting passport scans at first contact.
- Produce a structured itinerary, missing-information list and document checklist.
- Link every immigration requirement to an official source and retrieval date.
- Show confidence/uncertainty and direct users to the responsible authority.
- No booking, payment or appointment submission.

### Phase 2 — Provider-backed discovery
- Add read-only flight and accommodation search through approved providers.
- Display total prices, taxes, baggage, cancellation terms and last-checked timestamps.
- Add destination-specific official-source retrieval and source monitoring.

### Phase 3 — Confirmed transactions
- Add one provider write integration at a time.
- Require a fresh user confirmation for each irreversible or financially binding action.
- Use idempotency, action receipts, reconciliation and failure recovery.
- Keep appointment booking and form submission behind explicit confirmation and permitted automation.

### Phase 4 — International scale
- Expand destination and nationality coverage only after jurisdiction-specific validation.
- Add localization, currencies, time zones, accessibility and regional support.
- Establish operational SLAs, provider fallback, fraud controls and data residency review.

## Non-goals and safeguards

- Never promise or imply guaranteed visa approval.
- Never claim the traveller only needs a passport if the authority requires biometrics, interviews, originals or supporting evidence.
- Never fabricate appointment availability, flight inventory, hotel prices or booking confirmations.
- Never pay, book, submit, cancel or disclose documents without explicit user confirmation.
- Never store seller, airline or hotel funds in an AI Core wallet. Payments must be processed by the relevant authorized payment provider and settled according to the provider contract.
- Do not launch globally until legal, privacy, consumer-protection and travel-seller obligations are assessed for each market.

## Current implementation status

Implemented in the AI Core feature branch:
- Registered `global-travel` in the built-in and persisted product-space registry.
- Added an optional, disabled-by-default HTTPS connector namespace for the standalone travel product.
- Added five advisory-only travel specialist agents.

Not yet implemented or verified:
- Standalone web/mobile application.
- Secure document vault and traveller/trip database.
- Official visa-source retrieval and citation pipeline.
- Flight, hotel, payment and consular provider integrations.
- User-facing confirmation UI and end-to-end transaction reconciliation.
- Production integration tests and deployment.

A green build or deployment does not make any of the unimplemented provider operations available.
