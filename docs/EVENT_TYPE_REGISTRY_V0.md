# Event Type Registry v0

**Date:** 2026-03-15  
**Status:** Candidate v0 (acceptance review)

This document is the canonical event-type index for the Shared Event Envelope v0.

## Rules

1. Event types use `domain.entity.action`.
2. Type ownership must be clear (single owning subsystem).
3. New event types require:
   - owner,
   - producer(s),
   - minimal payload contract,
   - severity guidance.
4. Breaking semantic changes require a schema/version update.

---

## Registry (v0)

| Event type | Owner | Primary producer(s) | Default severity | Notes |
|---|---|---|---|---|
| provider.request.started | Gateway/Provider Router | openclaw-gateway | info | Start of provider call |
| provider.request.succeeded | Gateway/Provider Router | openclaw-gateway | info | Successful provider response |
| provider.request.failed | Gateway/Provider Router | openclaw-gateway | high | Include `errorClass`, `retryable` |
| provider.rate_limit.hit | Gateway/Provider Router | openclaw-gateway | medium | Include provider/model |
| provider.auth.invalid | Gateway/Provider Router | openclaw-gateway | critical | Authentication failure |
| provider.quota.exceeded | Gateway/Provider Router | openclaw-gateway | high | Quota exhaustion path |
| incident.created | Incident Engine | clawlogix / incident engine | high | Opened incident record |
| incident.classified | Incident Engine | incident classifier | medium | Add cause/confidence |
| incident.escalated | Incident Engine | incident engine | high | Human escalation |
| incident.resolved | Incident Engine | incident engine/operator | info | Resolved incident |
| incident.suppressed | Incident Engine | incident engine | low | Suppressed noisy incident |
| infra.gateway.timeout | Infra Runtime | gateway/runtime monitor | high | Gateway timeout path |
| infra.hook.failed | Infra Runtime | hook runner | medium | Hook execution failure |
| infra.cron.failed | Infra Runtime | cron runner | medium | Scheduled job failure |
| infra.server.degraded | Infra Runtime | service monitor | high | Degraded infrastructure |
| queue.event.enqueued | Queue Layer | event bus/queue | debug | Operational queue signal |
| queue.event.dequeued | Queue Layer | event bus/queue | debug | Operational queue signal |
| queue.backlog.high | Queue Layer | queue monitor | medium | Queue pressure threshold |
| queue.event.deduped | Queue Layer | dedupe filter | low | Collapsed duplicate event |
| telemetry.sample.recorded | Telemetry | clawmon/metrics pipeline | debug | Sampling event |
| telemetry.rollup.completed | Telemetry | telemetry rollup job | info | Rollup completion |
| memory.extraction.completed | ClawText | memory extractor | info | Extraction lane event |
| memory.cluster.rebuilt | ClawText | clustering pipeline | info | Cluster rebuild completion |
| memory.rag.injected | ClawText | retrieval injection layer | low | RAG context injection |
| memory.learning.promoted | ClawText | learning promotion lane | info | Promotion to durable memory |
| task.created | ClawTask | task engine | info | Task created |
| task.status.changed | ClawTask | task engine/operator actions | info | Include from/to |
| task.blocked | ClawTask | task engine/operator actions | medium | Include blocker reason |
| task.unblocked | ClawTask | task engine/operator actions | info | Unblocked task |
| project.created | ClawTask/Portfolio | project lane | info | Portfolio event |
| project.status.changed | ClawTask/Portfolio | project lane | info | Project lifecycle update |
| artifact.created | Artifact System | docs/artifact pipeline | info | Artifact created |
| artifact.linked | Artifact System | docs/artifact pipeline | low | Artifact linked to entity |
| policy.route.selected | Policy Engine | policy router | debug | Routing decision |
| policy.preference.applied | Policy Engine | policy router | debug | Preference application |

---

## ClawLogix governance event extensions (v0)

These are recommended operational event types for ClawLogix restart governance:

- `policy.restart.requested`
- `policy.restart.approved`
- `policy.restart.denied`
- `policy.restart.drain.started`
- `policy.restart.drain.timeout`
- `policy.restart.executed`
- `infra.gateway.back_online`

Owner: **ClawLogix**  
Primary producer: `skills/clawlogix` runtime + governance wrapper.

---

## Redaction + retention baseline

- Never include secrets/tokens in labels.
- Avoid raw PII in `labels`; prefer redacted or opaque IDs.
- Mark high-integrity restart/audit actions as `retention.class = "audit"`.
