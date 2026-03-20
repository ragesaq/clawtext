# ClawText — Session Matrix Specification

**Status:** Proposed design spec  
**Date:** 2026-03-19  
**Scope:** Cross-session ownership and relationship tracking for advisor/council-aware ClawText

---

## Why this exists

ClawText already has memory retrieval, continuity, and cross-session awareness.

What it does not yet have as a first-class structure is a **session matrix** that answers questions like:

- which advisor owns this session?
- which sessions belong to the same advisor?
- which sessions are related by project or domain?
- what changed when ownership moved?
- which sessions should be considered together during routing or handoff?

Without that structure, advisor-aware prompt composition and ClawCouncil routing would have to infer too much from raw session history.

The session matrix makes those relationships explicit.

---

## Purpose

The session matrix is the durable, queryable map of:
- sessions
- session ownership
- session relationships
- project/domain grouping
- session lifecycle state

It is the authoritative data layer for cross-session ownership tracking.

---

## Core design rules

### Rule 1 — One primary owner per session in MVP
A session has exactly one primary advisor owner.

### Rule 2 — Advisors may span multiple sessions
One advisor may own multiple sessions across a project or domain.

### Rule 3 — Relationships are explicit, not guessed only from transcripts
Same project, same owner, same domain, explicit related links, and lifecycle succession should all be represented in stored structure.

### Rule 4 — Session matrix is source-of-truth data, not a cache
Caches may consume it, but the matrix itself must remain durable and auditable.

### Rule 5 — Forward-compatible roles are allowed
Contributor/observer roles may exist in the schema before they are fully active in routing behavior.

---

## What the matrix tracks

Each session row should be able to express:

- identity
- project membership
- domain focus
- primary owner advisor
- optional contributors/observers
- thread/surface references
- lifecycle state
- relation links to other sessions
- timestamps
- cache invalidation relevance

---

## Canonical session row

```json
{
  "sessionId": "session-1",
  "project": "clawcanvas",
  "domain": "ui",
  "ownerAdvisorId": "clawcanvas-lead",
  "participants": {
    "contributors": [],
    "observers": []
  },
  "surface": {
    "provider": "discord",
    "threadRef": "discord:thread:1482230722935918672",
    "channelRef": "discord:channel:1482230722935918672"
  },
  "status": "active",
  "relations": {
    "sameOwner": ["session-2"],
    "sameProject": ["session-2", "session-3"],
    "sameDomain": [],
    "supersedes": [],
    "supersededBy": [],
    "explicitRelated": []
  },
  "createdAt": "2026-03-19T06:00:00Z",
  "updatedAt": "2026-03-19T06:30:00Z"
}
```

---

## Required fields
- `sessionId`
- `project`
- `ownerAdvisorId`
- `status`
- `createdAt`
- `updatedAt`

## Recommended fields
- `domain`
- `participants`
- `surface`
- `relations`

---

## Role model

## Primary owner
The advisor responsible for the session's main direction.

### MVP behavior
- one owner only
- routing and `advisor.active` should prefer this role
- ownership change is an important event and should invalidate relevant cached lookups

## Contributors
Advisors or agents participating materially but not owning the session.

### MVP behavior
- stored for forward compatibility
- not used for primary routing decisions yet

## Observers
Read-oriented stakeholders or advisors who may watch but not drive session decisions.

### MVP behavior
- stored for forward compatibility
- not used for primary routing decisions yet

---

## Lifecycle states

### `active`
Session is ongoing and participates in routing/related-session lookups.

### `idle`
Session is paused or quiet but still relevant.

### `archived`
Session is historical and normally excluded from active routing.

### `superseded`
Session has been explicitly replaced by another session.

### `failed`
Optional future state when a session became invalid for operational reasons.

### MVP minimum
Support at least:
- `active`
- `idle`
- `archived`
- `superseded`

---

## Relationship types

The matrix should support more than one relation type.

## Structural relationships
Derived from row data:
- `sameOwner`
- `sameProject`
- `sameDomain`

## Lifecycle relationships
Explicit session succession:
- `supersedes`
- `supersededBy`

## Manual/semantic relationships
Explicitly authored links:
- `explicitRelated`

These allow cases like:
- one session builds architecture, another handles infra rollout
- two sessions are related even across different domains

---

## Query patterns the matrix must support

### 1. Owner lookup
"Who owns this session?"

### 2. Related session lookup
"What other sessions should I look at for this work?"

### 3. Owner fanout lookup
"What other sessions belong to this advisor?"

### 4. Project matrix lookup
"Show me the current project session map."

### 5. Domain matrix lookup
"Show me all sessions touching security/infrastructure/ui."

### 6. Succession lookup
"What session replaced this one?"

### 7. Active-only views
"Show me only sessions that are still active or idle."

These queries should be possible without transcript scraping.

---

## Minimal indexes

The session matrix should maintain lightweight indexes so lookups stay cheap.

### Recommended indexes

```json
{
  "bySessionId": {
    "session-1": "session-1"
  },
  "byProject": {
    "clawcanvas": ["session-1", "session-2"]
  },
  "byOwnerAdvisorId": {
    "clawcanvas-lead": ["session-1", "session-2"]
  },
  "byDomain": {
    "ui": ["session-1"],
    "scene": ["session-2"]
  },
  "activeSessions": ["session-1", "session-2"]
}
```

### Why indexes matter
They support:
- fast slot rendering
- cheap invalidation targeting
- easier prompt composition queries
- cross-session provider integration

---

## Storage recommendations

This spec defines behavior and structure, not exact code shape.

Recommended runtime roots:

```text
state/clawtext/prod/session-matrix/
  sessions.json
  indexes.json
  ownership-events.jsonl
```

### Recommended files

#### `sessions.json`
Primary row store for session records.

#### `indexes.json`
Derived indexes for efficient lookup.

#### `ownership-events.jsonl`
Append-only log of ownership changes, creation, archival, and supersession events.

This event log improves auditability and makes invalidation easier to reason about.

---

## Ownership events

Session ownership changes are operationally important and should be observable.

### Suggested event shape

```json
{
  "type": "session.owner.changed",
  "sessionId": "session-1",
  "previousOwnerAdvisorId": "clawcanvas-lead",
  "newOwnerAdvisorId": "security-advisor",
  "project": "clawcanvas",
  "changedAt": "2026-03-19T06:45:00Z",
  "reason": "manual reassignment"
}
```

### Other useful event types
- `session.created`
- `session.archived`
- `session.superseded`
- `session.participant.added`
- `session.participant.removed`

### Why event logging matters
It gives ClawText and ClawCouncil a durable way to:
- invalidate cache entries
- explain changes
- build continuity/handoff trails
- audit session ownership over time

---

## Cache invalidation behavior

ClawCouncil owns the cache, but the session matrix should be the structure that tells it what changed.

## Invalidate when
- a session is created
- a session changes primary owner
- a session changes domain
- a session is archived or superseded
- a contributor/observer relationship materially changes and later routing starts consuming it

## Invalidate what
### On session creation
- project-scoped related-session caches
- owner-scoped session lists
- domain-scoped lookups for the new session's domain

### On owner change
- `session.owner:*`
- `session.related:*` for same-project and same-owner relationships
- advisor-active lookups for current session/project
- domain routing caches if routing depends on ownership activity

### On archive/supersede
- active session lists
- related-session lookups
- succession lookups

### MVP requirement
Owner change and creation invalidation are mandatory.
Other selective invalidation can evolve over time.

---

## Prompt composition guidance

The session matrix should be prompt-accessible, but not blindly injected.

### Good prompt uses
- current owner advisor
- related sessions for current project
- compact current project matrix when multi-session context is necessary

### Avoid injecting by default
- full indexes
- full event logs
- all archived sessions
- debug/invalidation traces

### Principle
Use the matrix to improve continuity and routing, not to flood prompts with management metadata.

---

## Relationship to other ClawText systems

## Multi-agent memory
The session matrix complements visibility/agent fields by adding ownership and relation structure.

## Cross-session provider
The matrix should become a first-class input to cross-session recall and prompt selection.

## ClawBridge / handoff
If a session is superseded or transferred, the matrix should help identify continuity targets and succession links.

## Clawptimization
`session.related:*` and `session.matrix:*` should be treated as named slot families with explicit budget/policy control.

---

## Example session matrix view

```json
{
  "project": "clawcanvas",
  "sessions": {
    "session-1": {
      "owner": "clawcanvas-lead",
      "domain": "ui",
      "status": "active"
    },
    "session-2": {
      "owner": "clawcanvas-lead",
      "domain": "scene",
      "status": "active"
    },
    "session-3": {
      "owner": "security-advisor",
      "domain": "security",
      "status": "idle"
    }
  }
}
```

This is the shape most prompt consumers want, not the full internal record.

---

## Example related-session response

```json
{
  "baseSession": "session-1",
  "related": [
    {
      "sessionId": "session-2",
      "reason": "same owner",
      "ownerAdvisorId": "clawcanvas-lead",
      "domain": "scene",
      "status": "active"
    },
    {
      "sessionId": "session-3",
      "reason": "same project",
      "ownerAdvisorId": "security-advisor",
      "domain": "security",
      "status": "idle"
    }
  ]
}
```

---

## Non-goals for MVP

Do not build these yet:
- graph-native dependency traversal
- many-owner session arbitration
- automatic semantic relation generation from transcript text alone
- replacing ClawCouncil routing with session-matrix heuristics
- high-churn live collaboration state beyond ownership metadata

MVP is about durable, queryable structure.

---

## Recommended implementation order

1. Lock this session row schema and index model
2. Implement `src/slots/sessionMatrix.ts`
3. Add matrix lookup helpers for owner, related sessions, and project matrix views
4. Emit ownership events on create/change/archive/supersede
5. Connect invalidation signals to ClawCouncil cache behavior

---

## Open questions

1. Should `explicitRelated` links be manually authored only, or may ClawText suggest them from observed patterns?
2. Should supersession automatically imply archive, or can a superseded session remain active for a transition period?
3. Do we want lightweight per-project matrix snapshots for handoff packets?
4. Should contributor/observer roles appear in prompt slots before they affect routing logic?

---

## Recommendation

Treat the session matrix as a **first-class continuity and routing substrate**.

It should be simple enough to operate with plain files, explicit enough to answer ownership questions deterministically, and rich enough to support the next layer of advisor/council orchestration without forcing ClawText to become the orchestration system itself.
