# ClawTask Status Workflow v0

**Date:** 2026-03-11  
**Status:** Draft v0

---

## Purpose

Define the workflow states for ClawTask so board movement has consistent meaning.

The goal is clarity, not process theater.

---

## Board columns

- Vision / Backlog
- Ready
- Active
- Blocked
- Review
- Done
- Watching / Ongoing

---

## State definitions

## Vision / Backlog
Meaning:
- idea exists
- not ready for execution
- may still be fuzzy, dependent, or premature

Use when:
- concept has value but not enough definition
- blocked on priority, timing, or upstream clarity

Do not use when:
- work is actually ready to begin

---

## Ready
Meaning:
- sufficiently defined
- dependencies understood
- can be picked up now

Use when:
- task/epic has enough clarity to execute
- no unresolved blocker prevents start

Exit rule:
- move to Active when work starts

---

## Active
Meaning:
- currently being worked
- deserves attention in Now surface

Use when:
- implementation, design, or decision work is in motion
- someone/agent is actually moving it

Guardrail:
- do not overload Active with too many cards
- if everything is active, nothing is active

---

## Blocked
Meaning:
- cannot move forward due to a real blocker

Use when:
- upstream dependency missing
- decision unresolved
- access/tooling issue prevents progress
- another lane is the actual bottleneck

Requirements:
- every blocked item should reference a blocker or dependency
- blocked cards should be visible in Now/Review

---

## Review
Meaning:
- primary work is complete
- awaiting validation, approval, or synthesis

Use when:
- doc needs signoff
- implementation needs testing/review
- design needs acceptance before follow-on work continues

Exit rule:
- move to Done when accepted
- move back to Active if changes are required

---

## Done
Meaning:
- completed and accepted

Use when:
- intended outcome has landed
- no meaningful follow-up remains on that specific card

Note:
- “done” does not mean the whole product is done, only that the specific unit is complete

---

## Watching / Ongoing
Meaning:
- not active execution right now
- still worth tracking because it evolves over time

Use when:
- ongoing monitoring
- recurring review
- long-running concern or idea
- something is real but not currently being pushed

Examples:
- ClawText graph density issue being watched while other foundation work proceeds
- creative workspace expansion concepts

---

## Recommended transitions

Normal path:
`Vision/Backlog → Ready → Active → Review → Done`

Common alternate paths:
- `Ready → Blocked`
- `Active → Blocked`
- `Blocked → Ready`
- `Review → Active`
- `Done → Watching` (rare, only when tracking later drift)

---

## Allowed shortcuts

To reduce ceremony, these shortcuts are fine:
- `Backlog → Active` for small urgent items
- `Active → Done` for trivial work not requiring review

But use sparingly.

---

## Status rules by item type

## Product
Usually not board-driven like tasks.
Suggested statuses:
- proposed
- active
- paused
- archived

## Lane
Suggested statuses:
- planned
- active
- blocked
- dormant
- done

## Epic
Use full board workflow if useful.
Often lives in:
- Backlog
- Ready
- Active
- Blocked
- Review
- Done
- Watching

## Task
Use full board workflow.

---

## What counts as a blocker

A blocker should be something that materially prevents progress, such as:
- unresolved dependency
- missing schema/decision
- missing access/tool/service
- waiting on another lane/product
- missing human approval where required

A blocker is **not** just:
- “I haven’t gotten to it yet”
- “this feels hard”
- “there are other priorities”

That belongs in backlog or ready, not blocked.

---

## Recommendation

Use this workflow as the default ClawTask board semantics for Milestone 1.
Keep it intentionally simple until real usage proves a need for more nuance.
