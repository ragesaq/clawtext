# Incident Taxonomy v0

**Date:** 2026-03-11  
**Status:** Draft v0

---

## Purpose

Provide a shared classification scheme for operational failures and degradations across OpenClaw.

This taxonomy should power:
- triage logic
- retry/fallback decisions
- user-facing failure rewrites
- telemetry aggregation
- ClawText operational learning
- ClawDash Health views

---

## Taxonomy structure

Recommended pattern:
`domain.class`

Examples:
- `provider.timeout`
- `provider.rate_limited`
- `surface.discord_rejected`
- `infra.gateway_timeout`
- `response.invalid_shape`

---

## Severity levels

- `low` — minor issue, likely self-healing
- `medium` — user impact limited or recoverable
- `high` — meaningful degradation, likely visible
- `critical` — major outage, safety/data-loss/security concern

---

## Retryability

Each incident class should declare expected retry behavior:
- `retryable`
- `fallbackable`
- `suppressible`
- `escalate_immediately`

---

## v0 classes

## Provider incidents

### `provider.timeout`
- Meaning: provider request exceeded timeout
- Severity: medium/high
- Retryable: yes
- Fallbackable: yes

### `provider.rate_limited`
- Meaning: provider rejected due to rate limit
- Severity: medium
- Retryable: yes, with backoff
- Fallbackable: yes

### `provider.quota_exceeded`
- Meaning: budget/quota exhausted
- Severity: high
- Retryable: no
- Fallbackable: yes

### `provider.auth_invalid`
- Meaning: auth or credentials invalid
- Severity: high
- Retryable: no
- Fallbackable: maybe
- Escalation: yes

### `provider.server_error`
- Meaning: 5xx or provider internal failure
- Severity: medium/high
- Retryable: yes
- Fallbackable: yes

### `provider.unavailable`
- Meaning: provider down or unreachable
- Severity: high
- Retryable: yes
- Fallbackable: yes

---

## Response / model incidents

### `response.invalid_shape`
- Meaning: output malformed or violates expected schema
- Retryable: yes
- Fallbackable: yes

### `response.empty`
- Meaning: no useful output returned
- Retryable: yes
- Fallbackable: yes

### `response.tool_call_invalid`
- Meaning: bad tool invocation shape or args
- Retryable: sometimes
- Fallbackable: maybe

### `response.oversize`
- Meaning: output too large for downstream surface or context budget
- Retryable: yes with trimming/change
- Fallbackable: no direct fallback unless reformatted

---

## Surface incidents

### `surface.discord_rejected`
- Meaning: Discord rejected payload
- Retryable: sometimes
- Fallbackable: often via shorter rewrite

### `surface.discord_delivery_failed`
- Meaning: send failed after request construction
- Retryable: yes
- Fallbackable: maybe to alternate surface/log

### `surface.raw_error_leak`
- Meaning: raw provider/system error reached user surface
- Retryable: no
- Escalation: yes (quality issue)

---

## Infrastructure incidents

### `infra.gateway_timeout`
- Meaning: gateway timed out processing a request
- Retryable: maybe
- Escalation: yes if repeated

### `infra.hook_failed`
- Meaning: hook execution failed
- Retryable: depends on hook
- Escalation: if recurring

### `infra.cron_failed`
- Meaning: scheduled job failed
- Retryable: depends on job
- Escalation: if repeated or important

### `infra.queue_backlog_high`
- Meaning: queue depth above acceptable threshold
- Retryable: n/a
- Escalation: yes if sustained

### `infra.server_resource_pressure`
- Meaning: CPU/memory/disk pressure on luminous
- Retryable: n/a
- Escalation: yes if sustained

---

## Task / workflow incidents

### `workflow.dependency_blocked`
- Meaning: task/epic cannot proceed due to unresolved dependency
- Retryable: no
- Escalation: maybe through board surfacing

### `workflow.stale_active_work`
- Meaning: active work has gone quiet too long
- Retryable: n/a
- Escalation: review surface

### `workflow.reminder_overdue`
- Meaning: obligation passed due date without completion
- Retryable: n/a
- Escalation: yes to Now/Review surfaces

---

## Minimum metadata per incident

Every incident record should capture:
- `incidentClass`
- `severity`
- `firstSeenAt`
- `lastSeenAt`
- `count`
- `retryable`
- `fallbackable`
- `status`
- `source.component`
- `labels` (provider/model/surface/product as relevant)
- `userImpact`
- `recommendedAction`

---

## Recommended status lifecycle

- `new`
- `classified`
- `retrying`
- `fallback_active`
- `suppressed`
- `escalated`
- `resolved`
- `watching`

---

## User-facing rewrite policy

Incidents should almost never surface raw system/provider text directly.

Instead produce:
- short human summary
- whether retry/fallback happened
- whether user action is needed

Example:
- bad: raw provider JSON blob
- good: “OpenRouter timed out on that request. I’m retrying with a fallback model.”

---

## Recommendation

Adopt these classes as the initial controlled vocabulary.
Add new classes only when they are operationally distinct enough to change routing, alerting, learning, or user messaging.
