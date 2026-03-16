# ClawText Change Routing

## Purpose
Allow ClawText to absorb operator insight and refinement without uncontrolled drift.

## Change classes
- **northstar** — mission, promise, boundaries, identity
- **prd** — scope, workflows, requirements, constraints
- **flight-control** — heartbeat, escalation, handoff, execution policy
- **milestones** — sequencing, delivery status, next objectives, evidence state
- **post-brief** — publication framing, messaging, claim emphasis
- **local-only** — temporary run/lane guidance that should not become canon yet

## Routing rule
Classify first, then update the right layer. Not every change is a Northstar change.

## High-level heuristics
- identity/boundary change → `docs/NORTHSTAR.md`
- executable scope/requirement change → `docs/PRD.md`
- execution-policy change → `docs/FLIGHT_CONTROL.md`
- release/hardening priority change → `docs/MILESTONES.md`
- publication-story change → `docs/POST_BRIEF.md`
- one-run preference → execution brief only
