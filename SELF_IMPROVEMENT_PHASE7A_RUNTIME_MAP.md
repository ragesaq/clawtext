# SELF_IMPROVEMENT — Phase 7A Runtime Integration Map

Date: 2026-03-09
Status: implementation map

---

## Goal

Map the ClawText operational/self-improvement lane onto real OpenClaw runtime events so Phase 7A can wire actual automation instead of relying on CLI-only flows.

---

## Available runtime/plugin hooks confirmed

From OpenClaw docs/runtime:
- `before_prompt_build`
- `before_tool_call`
- `after_tool_call`
- `session_start`
- `session_end`
- `message_received`
- `message_sending`
- `message_sent`
- `agent_end`
- `before_compaction`
- `after_compaction`
- `tool_result_persist`
- `gateway_start`
- `gateway_stop`

OpenClaw docs also confirm:
- `before_prompt_build` is the right place for prompt shaping / injection
- `before_tool_call` / `after_tool_call` are the right places to intercept tool params/results
- `session_start` / `session_end` are lifecycle boundaries

---

## Existing ClawText pieces already live

### General memory lane
- `hooks/clawtext-extract/handler.ts`
  - captures inbound/outbound messages into extract buffer
- `hooks/clawtext-flush/handler.ts`
  - flushes buffer on session reset
- `skills/clawtext/plugin.js`
  - injects normal ClawText memory on `before_prompt_build`

### Operational lane components implemented but not broadly wired
- `src/operational.ts`
- `src/operational-capture.ts`
- `src/operational-aggregation.ts`
- `src/operational-review.ts`
- `src/operational-retrieval.ts`

---

## Recommended Phase 7A wiring order

## 1. `after_tool_call` → operational capture of real failures/successes

### Why first
This is the cleanest high-value event source.
It gives us:
- actual tool name
- actual tool result
- error flag / failure state
- session context

### Use it for
- `captureToolFailure(...)`
- optionally success capture for repeated reliable workflows later

### Policy bucket
- fully automatic

### Notes
Start with failure capture only.
Success capture should be more conservative so we do not create noise.

---

## 2. `before_prompt_build` → automatic transfer-check / operational retrieval gate

### Why second
This is the correct place to perform the implicit transfer-check before risky tasks.
We already know OpenClaw treats this as the canonical prompt-shaping hook.

### Use it for
- task classification via `OperationalRetrievalManager`
- if task class is risky/relevant, query reviewed operational patterns
- append operational context only when relevant

### Policy bucket
- fully automatic

### Important safety rule
Keep operational retrieval separate from normal memory retrieval until final merge step.
Do not inject raw/candidate patterns.
Do not inject into normal chat.

---

## 3. `agent_end` → detect repeated failures / loop-shaped outcomes / post-task signals

### Why third
This gives us full turn context after completion.
Useful for:
- repeated failure detection
- escalation if final assistant state ended in error or useless repetition
- potential success-pattern capture after stable completion

### Use it for
- gateway/agent-level failure patterns
- loop heuristics
- cautious success capture

### Policy bucket
- fully automatic, but conservative

---

## 4. `before_compaction` / `after_compaction` → compaction-specific operational patterns

### Why fourth
Compaction failures and overflows are exactly the kind of operational learning we want.
These are high-value and highly reusable.

### Use it for
- compaction failure capture
- compaction overflow / context pressure patterns
- stable guidance about token budgets / memory thresholds

### Policy bucket
- fully automatic

---

## 5. `session_start` / `session_end` → lifecycle reporting and periodic review triggers

### Why fifth
Useful for:
- lightweight initialization
- queued review reminders
- maintenance/reporting triggers

### Use it for
- session-start check for pending candidate backlog summary (agent-owned surfacing)
- session-end cleanup / metrics snapshot if needed

### Policy bucket
- mixed:
  - automatic for bookkeeping
  - agent-owned for review surfacing

---

## 6. Message hooks (`message_received`, `message_sent`) → user corrections and explicit operator signals

### Why later
These can be useful, but are noisier and need stricter filtering.

### Use it for
- capture explicit user correction signals
- capture phrases like “that’s wrong”, “don’t do that”, “this worked”, etc.
- detect operator-marked importance

### Policy bucket
- automatic capture, but conservative and filtered

---

## Hooks not to use as primary source initially

### `before_tool_call`
Useful for blocking or annotating, but not the best first source for operational memory capture.
Use later if we want preventive checks before specific tools.

### `tool_result_persist`
Too low-level for first pass. Better as a refinement layer later.

### `gateway_start` / `gateway_stop`
Good for infra bookkeeping, not the first source of self-improvement value.

---

## Immediate implementation priorities

### P1
Wire `after_tool_call` to `OperationalCaptureManager.captureToolFailure(...)`

### P2
Wire `before_prompt_build` to `OperationalRetrievalManager.retrieveForTask(...)` and selective operational injection

### P3
Wire compaction events for gateway/context-pressure patterns

### P4
Add conservative `agent_end` handling for repeated-failure / loop-like patterns

### P5
Add filtered message-based user correction capture

---

## Review/promotion integration (not Phase 7A wiring, but next)

Once Phase 7A is live:
- review queue becomes agent-mediated
- promotion becomes agent-mediated + user-approved
- scheduled review jobs can be agent-created where useful

This keeps the runtime path aligned with the architecture standard:
- automatic where safe
- agent-owned where orchestration is needed
- user-discretion gated where judgment matters
