# SELF_IMPROVEMENT — Phase 7B Review UX Plan

Date: 2026-03-09
Status: complete (review packet foundation, deferral-aware maturation, proactive matured-after-deferral surfacing, and agent-owned review action wrapper implemented and verified)
Depends on:
- `SELF_IMPROVEMENT_PHASE6_POLICY.md`
- `SELF_IMPROVEMENT_PHASE7_EXECUTION_BRIEF.md`
- live Phase 7A plugin activation

---

## Goal

Turn operational review from a raw CLI/admin workflow into an **agent-owned conversational workflow**.

Users should be able to say things like:
- "review operational patterns"
- "what recurring failures have we seen lately?"
- "show me candidate self-improvement patterns"
- "approve this one" / "defer that one"

without needing to know or run backend commands.

---

## UX standard

### Automatic
- candidate accumulation
- recurrence counting
- raw/candidate storage
- review queue maintenance

### Agent-owned
- summarizing review queue
- grouping related candidates
- surfacing top candidates periodically or on request
- translating user approval/reject/defer into backend review actions

### User-discretion gated
- approve / reject / defer
- merge ambiguous candidates when judgment is needed
- promote reviewed patterns into durable guidance

### Backend/admin only
- raw `operational:review*` CLI commands
- merge/debug/synthesis commands for maintenance

---

## Proposed conversational flows

### Flow A — On-demand review
User: "review operational patterns"
Agent:
1. reads candidate/review queue
2. summarizes top N items
3. asks approve/reject/defer questions
4. executes backend actions programmatically

### Flow B — Contextual review suggestion
Trigger:
- enough candidate backlog
- strong recurrence pattern
- after a debugging-heavy session

Agent:
1. offers concise summary
2. asks whether user wants to review now or later
3. if later, can schedule/queue follow-up

### Flow C — Single-item decision
User points to a surfaced candidate.
Agent executes:
- approve
- reject
- defer
- merge suggestion

---

## Backend mapping

Natural-language actions map to existing backend plumbing:
- review queue read -> `operational-review` manager / queue access
- approve/reject/defer -> existing review action logic
- merge -> merge helper logic
- report -> operational report/status utilities

CLI remains available for admins, but should not be required for normal use.

---

## Implementation targets

- add agent-facing wrapper logic over operational review manager
- create concise review packet formatter
- add approval command parsing / structured action mapping
- log review actions with provenance
- optionally add periodic review digest trigger

---

## Success criteria

- users can review patterns conversationally
- no raw CLI required for normal review flow
- agent only asks for real judgment calls
- review queue remains high-signal and not noisy
