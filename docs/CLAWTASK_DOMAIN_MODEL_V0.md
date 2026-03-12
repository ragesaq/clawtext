# ClawTask Domain Model v0

**Date:** 2026-03-11  
**Status:** Draft v0  
**Parent product:** ClawDash

---

## Purpose

ClawTask is the project / task / dependency / artifact coordination layer inside ClawDash.

It must support two modes at once:

1. **Platform buildout mode**
   - products
   - lanes
   - epics
   - dependencies
   - blockers
   - milestones
   - active implementation work

2. **Long-term operational workspace mode**
   - personal tasks
   - professional obligations
   - creative projects
   - artifacts
   - reminders
   - re-entry points

---

## Design goals

- One model that can represent both software work and real-world work
- Explicit dependencies and blockers
- First-class support for lanes / forum posts / workstreams
- Easy to summarize into “Now”, “Blocked”, and “Review” surfaces
- Dense operator UI; minimal ceremony
- Support gradual evolution without requiring a heavy PM tool upfront

---

## Core entities

## 1. Product

Top-level system or domain being developed or tracked.

Examples:
- ClawDash
- ClawText
- ClawTask
- ClawMon
- ClawOps
- ClawHandler
- ClawWorks

### Fields
- `id`
- `slug`
- `name`
- `description`
- `status` (`proposed | active | paused | archived`)
- `ownerIds[]`
- `priority`
- `tags[]`
- `createdAt`
- `updatedAt`

---

## 2. Lane

A focused workstream or coordination lane. Often maps to a forum post/thread or a major work area.

Examples:
- Platform Foundations
- Incident / Triage / Provider Health
- Telemetry / ClawMon
- ClawDash
- ClawTask
- ClawHandler

### Fields
- `id`
- `productId`
- `name`
- `description`
- `status` (`planned | active | blocked | dormant | done`)
- `threadRef?`
- `ownerIds[]`
- `tags[]`
- `createdAt`
- `updatedAt`

### Notes
A lane is broader than a task and narrower than a product.
A lane may contain multiple epics.

---

## 3. Epic

A major outcome-oriented unit of work.

Examples:
- Shared Event Backbone
- Incident & Triage Engine
- ClawDash Information Architecture
- Telemetry / ClawMon

### Fields
- `id`
- `productId`
- `laneId?`
- `title`
- `summary`
- `status` (`backlog | ready | active | blocked | review | done | watching`)
- `priority`
- `goal`
- `successCriteria[]`
- `ownerIds[]`
- `dependencyIds[]`
- `blockerIds[]`
- `milestoneId?`
- `artifactIds[]`
- `createdAt`
- `updatedAt`

---

## 4. Task

The smallest actionable planning unit that should appear on the board.

Examples:
- Define shared event schema v0
- Add Prometheus endpoint to gateway
- Draft ClawDash top-level navigation

### Fields
- `id`
- `epicId?`
- `productId`
- `laneId?`
- `title`
- `description`
- `status` (`backlog | ready | active | blocked | review | done | watching`)
- `priority` (`p0 | p1 | p2 | p3`)
- `type` (`design | code | docs | infra | research | ops | admin | reminder`)
- `ownerIds[]`
- `dependencyIds[]`
- `blockerIds[]`
- `artifactIds[]`
- `dueAt?`
- `startedAt?`
- `completedAt?`
- `estimate?`
- `tags[]`
- `createdAt`
- `updatedAt`

### Notes
Tasks must be small enough to move between board columns meaningfully.

---

## 5. Milestone

A checkpoint or release-level objective.

Examples:
- ClawDash Shell v0
- Telemetry v0 Live
- Incident Triage v0

### Fields
- `id`
- `productId`
- `title`
- `description`
- `status` (`planned | active | at_risk | done`)
- `targetDate?`
- `ownerIds[]`
- `successCriteria[]`
- `createdAt`
- `updatedAt`

---

## 6. Dependency

Explicit relationship saying one entity relies on another.

### Fields
- `id`
- `fromRef`
- `toRef`
- `kind` (`requires | informs | feeds | blocked_by | related_to`)
- `note?`
- `createdAt`

### Example
- Telemetry model `requires` shared event schema
- ClawDash Health page `feeds` from telemetry store

---

## 7. Blocker

A tracked obstacle that prevents progress.

### Fields
- `id`
- `ref`
- `title`
- `description`
- `severity` (`low | medium | high | critical`)
- `status` (`open | mitigated | resolved`)
- `ownerIds[]`
- `createdAt`
- `resolvedAt?`

### Notes
Blockers should be explicit objects rather than just a string on a task.

---

## 8. Artifact

A durable output tied to work.

Examples:
- docs/CLAWDASH_HANDOFF_2026-03-10.md
- docs/EVENT_SCHEMA_V0.md
- Grafana dashboard JSON
- thread/forum post URL
- code PR/commit

### Fields
- `id`
- `title`
- `type` (`doc | code | thread | dashboard | dataset | mockup | config | note`)
- `pathOrUrl`
- `summary?`
- `linkedRefs[]`
- `createdAt`
- `updatedAt`

---

## 9. Person / Agent Owner

Represents humans or agents responsible for work.

### Fields
- `id`
- `name`
- `kind` (`human | agent | team`)
- `handle?`
- `availability?`
- `tags[]`

---

## 10. ThreadRef

Reference to a Discord thread / forum post / external work lane.

### Fields
- `id`
- `platform` (`discord | github | local | other`)
- `channelId?`
- `threadId?`
- `url?`
- `title`
- `status?`

### Why it matters
ClawTask needs to bridge board state to the actual discussion lane where work happens.

---

## Core relationships

- Product has many Lanes
- Product has many Epics
- Lane has many Epics
- Epic has many Tasks
- Milestone groups Epics and Tasks
- Task links to Artifacts
- Tasks / Epics can have Dependencies and Blockers
- Lane may map to a ThreadRef

---

## Board views

## Default columns
- Vision / Backlog
- Ready
- Active
- Blocked
- Review
- Done
- Watching / Ongoing

## Recommended primary board groupings
- by Product
- by Lane
- by Milestone
- by Owner

---

## v0 status semantics

### `backlog`
Not ready yet. Exists as candidate work.

### `ready`
Clear enough to start.

### `active`
Currently being worked.

### `blocked`
Cannot proceed without dependency, decision, or fix.

### `review`
Implementation/design done, awaiting validation or approval.

### `done`
Completed and accepted.

### `watching`
Not active implementation, but still worth monitoring.

---

## v0 priority semantics

- `p0` — urgent / currently shaping system behavior
- `p1` — important near-term work
- `p2` — important but not immediate
- `p3` — nice to have / exploratory

---

## Minimal JSON shapes

```json
{
  "product": {
    "id": "prod_clawdash",
    "slug": "clawdash",
    "name": "ClawDash",
    "status": "active"
  },
  "epic": {
    "id": "epic_event_backbone_v0",
    "productId": "prod_clawdash",
    "title": "Shared Event Backbone",
    "status": "ready",
    "priority": "p0"
  },
  "task": {
    "id": "task_define_event_schema_v0",
    "epicId": "epic_event_backbone_v0",
    "productId": "prod_clawdash",
    "title": "Define shared event schema v0",
    "status": "ready",
    "type": "design",
    "priority": "p0"
  }
}
```

---

## Recommended v0 implementation rules

1. Everything visible on the board should be one of:
   - product
   - lane
   - epic
   - task
   - milestone

2. Dependencies should be explicit objects, not buried in description text.

3. Artifacts should be first-class so docs/threads/configs can be linked to work.

4. A task can exist without an epic, but this should be used sparingly.

5. The “Now” surface in ClawDash should be derived from:
   - active items
   - blocked p0/p1 items
   - overdue tasks
   - open incidents tied to active products

---

## Suggested seed products

- ClawDash
- ClawText
- ClawTask
- ClawMon
- ClawOps
- ClawHandler
- ClawWorks

---

## Accepted review notes

1. **Reminders / obligations**
   - They should stay tightly coupled to Task, but eventually become their own surface/entity.
   - Practical interpretation: reuse shared task semantics now, allow a distinct reminder/obligation entity later without breaking the model.

2. **Artifacts**
   - Should support parent/child grouping.

3. **Forum thread creation/update**
   - Should flow together with ThreadRef and workspace behavior.
   - A task should be injectable into a thread/workspace without forcing a direct assistant reply in-thread.

4. **Estimates**
   - Keep estimates adaptable.
   - Start soft and leave room to evolve toward richer estimation later if it proves useful.

5. **Incidents on the board**
   - Incidents should be able to rise into the task board world, but they do not have to live there by default.
   - They may spawn tasks, result from tasks, or remain incident-native with links.

---

## Recommendation

Use this model as the seed for:
- ClawDash Projects view
- ClawDash Tasks view
- “Now” page derivation
- lane/thread linkage
- future e-shadow reminder integration
