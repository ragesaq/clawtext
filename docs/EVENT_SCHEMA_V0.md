# Shared Event Schema v0

**Date:** 2026-03-11  
**Status:** Draft v0

---

## Purpose

Define a shared event envelope used across:
- Event Bus / Queue
- Incident / Triage Engine
- Telemetry / ClawMon
- ClawText operational learning lane
- ClawDash live views
- ClawTask state changes

The goal is one common structure for operational facts moving through the system.

---

## Design goals

- Small common envelope
- Explicit source + type + severity
- Durable ids for dedupe and correlation
- Friendly to queueing, logging, metrics, and learning sinks
- Can represent both failures and normal state changes

---

## Event envelope

```json
{
  "id": "evt_01j...",
  "type": "provider.request.failed",
  "ts": "2026-03-11T03:45:00Z",
  "source": {
    "system": "openclaw-gateway",
    "component": "provider-router",
    "instance": "luminous"
  },
  "severity": "high",
  "status": "new",
  "correlationId": "corr_abc123",
  "dedupeKey": "provider.request.failed:openrouter:gpt-5.4:timeout",
  "subject": {
    "kind": "provider_request",
    "id": "req_123"
  },
  "labels": {
    "provider": "openrouter",
    "model": "gpt-5.4",
    "surface": "discord"
  },
  "payload": {},
  "context": {},
  "actions": [],
  "links": [],
  "retention": {
    "class": "standard"
  }
}
```

---

## Core fields

### `id`
Globally unique event id.

### `type`
Machine-readable event type.
Format recommendation:
`domain.entity.action`

Examples:
- `provider.request.started`
- `provider.request.failed`
- `incident.created`
- `discord.message.rejected`
- `task.status.changed`
- `memory.extraction.completed`
- `telemetry.sample.recorded`

### `ts`
UTC timestamp of when the event occurred.

### `source`
Where the event came from.

Fields:
- `system` — broad system name
- `component` — emitting component
- `instance` — host/process/session/node if useful

### `severity`
Suggested enum:
- `debug`
- `info`
- `low`
- `medium`
- `high`
- `critical`

### `status`
Lifecycle of the event in the operational pipeline.
Suggested enum:
- `new`
- `classified`
- `queued`
- `processing`
- `resolved`
- `suppressed`
- `archived`

### `correlationId`
Used to tie multiple events together within one operation or request path.

### `dedupeKey`
Stable string for collapsing repeated/duplicate events.

### `subject`
The primary thing the event is about.

Shape:
```json
{
  "kind": "provider_request",
  "id": "req_123"
}
```

Possible `kind` values:
- `provider_request`
- `incident`
- `task`
- `session`
- `message`
- `hook`
- `cron_job`
- `memory_batch`
- `artifact`
- `server`

### `labels`
Flat searchable tags for routing, metrics, and filtering.

Examples:
- provider
- model
- product
- lane
- environment
- surface
- sessionType
- queue

### `payload`
Event-specific structured details.
Should be useful but not bloated.

### `context`
Optional nearby facts helpful for triage/learning.
Examples:
- retry count
- active fallback chain
- user-visible surface
- recent related errors

### `actions[]`
What the system did or plans to do.

Example:
```json
[
  { "kind": "retry", "attempt": 1 },
  { "kind": "fallback", "target": "anthropic/haiku" }
]
```

### `links[]`
Pointers to related objects.

Example:
```json
[
  { "kind": "thread", "ref": "discord:1481011906901704704" },
  { "kind": "task", "ref": "task_define_event_schema_v0" }
]
```

### `retention`
Retention guidance for downstream sinks.

Example classes:
- `ephemeral`
- `standard`
- `important`
- `audit`

---

## Event domains

Recommended v0 domains:

- `provider.*`
- `incident.*`
- `discord.*`
- `surface.*`
- `infra.*`
- `queue.*`
- `telemetry.*`
- `memory.*`
- `task.*`
- `project.*`
- `artifact.*`
- `policy.*`

---

## Example event types

### Provider
- `provider.request.started`
- `provider.request.succeeded`
- `provider.request.failed`
- `provider.rate_limit.hit`
- `provider.auth.invalid`
- `provider.quota.exceeded`

### Incident
- `incident.created`
- `incident.classified`
- `incident.escalated`
- `incident.resolved`
- `incident.suppressed`

### Discord / Surface
- `discord.message.send_failed`
- `discord.message.rejected`
- `surface.user_message_rewritten`

### Infra
- `infra.gateway.timeout`
- `infra.hook.failed`
- `infra.cron.failed`
- `infra.server.degraded`

### Memory
- `memory.extraction.completed`
- `memory.cluster.rebuilt`
- `memory.rag.injected`
- `memory.learning.promoted`

### Tasking
- `task.created`
- `task.status.changed`
- `task.blocked`
- `task.unblocked`
- `dependency.created`

---

## Minimal payload conventions

Each event payload should prefer:
- compact fields
- stable keys
- structured enums over prose where possible

### Example: provider failure
```json
{
  "errorClass": "timeout",
  "retryable": true,
  "attempt": 1,
  "maxAttempts": 3,
  "durationMs": 15842
}
```

### Example: task status change
```json
{
  "from": "ready",
  "to": "active",
  "reason": "picked_up"
}
```

---

## Dedupe guidance

Use `dedupeKey` to collapse noisy bursts.

Examples:
- same provider/model/errorClass within 5m
- same Discord reject reason for same surface payload shape
- same cron failure repeated N times

Do **not** dedupe away:
- security/audit-significant events
- first occurrence after a quiet period
- events with materially different payloads

---

## Correlation guidance

Use the same `correlationId` across:
- provider request
- fallback attempt
- user-facing error rewrite
- incident creation
- task creation if work is generated from incident

This gives ClawDash and ClawText a way to trace one chain.

---

## v0 producer map

### Likely producers
- gateway provider router
- Discord/send surface layer
- hooks
- cron jobs
- task board actions
- memory extraction pipeline
- telemetry sampler

### Likely consumers
- queue / event bus
- incident classifier
- metrics aggregator
- ClawText operational learning sink
- ClawDash live views
- alerting layer

---

## Recommendation

Adopt this event envelope first.
Then define mappings from each subsystem into it before building specialized schemas.
