# ClawText — Advisor Slot Specification

**Status:** Proposed design spec  
**Date:** 2026-03-19  
**Scope:** ClawText data contract for advisor/council-aware prompt composition

---

## Why this exists

ClawText already knows how to retrieve memory, continuity artifacts, operational patterns, and library material.

What ClawCouncil needs from ClawText is different:

- a structured way to describe **who the available advisors are**
- a queryable way to resolve **which advisor should handle which domain**
- prompt-safe slot outputs that let the compositor include advisor/council context without hardcoding orchestration logic into ClawText

ClawText owns the **data layer**.
ClawCouncil owns the **orchestration layer**.

The contract between them is the advisor slot format.

---

## Core boundary

### ClawText owns
- advisor definitions
- advisor metadata
- advisor domain coverage
- session ownership references
- routing-rule source data
- slot rendering inputs
- source-of-truth storage for advisor/session relationships

### ClawCouncil owns
- advisor cache
- routing execution
- council deliberation logic
- fan-out / aggregation behavior
- orchestration policy on top of the slot data

### Design rule
ClawText should expose **structured facts**, not hidden advisor logic.

If ClawCouncil disappears, the stored advisor/session data should still be understandable in plain files.

---

## Design goals

### Goal 1 — Keep the contract explicit
Advisor data should be represented as plain JSON/Markdown-backed records with stable field names.

### Goal 2 — Make prompt composition easy
A prompt compositor or downstream system should be able to ask for:
- active advisor
- advisor by domain
- related sessions
- available council perspectives

without scraping freeform prose.

### Goal 3 — Support hybrid routing
Routing starts with explicit seeded rules, then can be refined over time by observed usage, session activity, and human feedback.

### Goal 4 — Preserve explainability
The system should be able to answer:
- why this advisor was chosen
- whether the result came from a seed rule or learned refinement
- what session ownership data influenced the result

### Goal 5 — Stay MVP-safe
The first version should support:
- one primary advisor owner per session
- one advisor spanning multiple sessions
- optional future contributor/observer expansion

without requiring full multi-owner graph logic on day one.

---

## Advisor slot families

These slot families extend ClawText's existing slot architecture.

### Top-level families
- `advisor.*`
- `session.*`
- `council.*`
- `routing.*`

### Initial slot templates
- `{{advisor.active}}`
- `{{advisor.byDomain:<domain>}}`
- `{{advisor.byId:<advisorId>}}`
- `{{session.owner:<sessionId>}}`
- `{{session.related:<sessionId|current|current-project>}}`
- `{{session.matrix:<project|current>}}`
- `{{council.perspectives}}`
- `{{routing.rule:<domain>}}`
- `{{routing.explain:<domain>}}`

These are retrieval/rendering contracts, not a promise that every slot must be prompt-injected in every turn.

---

## Canonical data model

## 1. Advisor definition

Each advisor should have a canonical record.

```json
{
  "id": "security-advisor",
  "name": "Security Advisor",
  "status": "active",
  "scope": "multi-session",
  "domains": ["security", "threat-modeling", "hardening"],
  "keywords": ["auth", "secrets", "permissions", "attack-surface"],
  "models": ["cp-opus", "heavy"],
  "projects": ["clawtext", "openclaw"],
  "availability": {
    "enabled": true,
    "reason": null
  },
  "metadata": {
    "description": "Primary advisor for security-sensitive design and review",
    "ownerType": "advisor",
    "version": 1
  }
}
```

### Required fields
- `id`
- `name`
- `status`
- `domains`
- `scope`

### Recommended fields
- `keywords`
- `models`
- `projects`
- `availability`
- `metadata.description`

### `status` values
- `active`
- `paused`
- `disabled`
- `retired`

### `scope` values
- `single-session`
- `multi-session`
- `project-wide`
- `global`

---

## 2. Session ownership record

Each session should have one primary owner in MVP.

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
  "status": "active",
  "threadRef": "discord:thread:1482230722935918672",
  "createdAt": "2026-03-19T06:00:00Z",
  "updatedAt": "2026-03-19T06:30:00Z"
}
```

### Required fields
- `sessionId`
- `project`
- `ownerAdvisorId`
- `status`

### Recommended fields
- `domain`
- `threadRef`
- `participants`
- `createdAt`
- `updatedAt`

### `status` values
- `active`
- `idle`
- `archived`
- `superseded`

### MVP rule
- exactly **one primary owner advisor** per session
- `contributors` and `observers` exist in the schema now for forward compatibility
- multi-owner active arbitration is **not** part of MVP behavior

---

## 3. Routing rule record

Routing uses a hybrid seeded-then-refined model.

```json
{
  "domain": "security",
  "seedAdvisorId": "security-advisor",
  "currentAdvisorId": "security-advisor",
  "strategy": "hybrid",
  "weights": {
    "seed": 1.0,
    "usage": 0.15,
    "sessionActivity": 0.10,
    "humanFeedback": 0.20
  },
  "signals": {
    "usageCount": 8,
    "positiveFeedback": 3,
    "negativeFeedback": 0,
    "lastResolvedBy": "security-advisor"
  },
  "updatedAt": "2026-03-19T06:30:00Z"
}
```

### Meaning
- `seedAdvisorId` = the explicit initial mapping
- `currentAdvisorId` = the currently preferred advisor after refinement
- `strategy` = `static` | `hybrid` | `manual-lock`

### Routing philosophy
Start with static mappings so the system is immediately usable.
Then refine with observed evidence while preserving explainability.

### MVP behavior
- static seed mappings are authoritative at start
- usage and feedback signals are tracked
- refinement can adjust preference/weights later
- any change must remain explainable through stored signal data

---

## 4. Council perspective record

This is the prompt-safe summary layer used to expose available perspectives.

```json
{
  "id": "security-advisor",
  "label": "Security",
  "domains": ["security", "hardening"],
  "status": "active",
  "availability": "ready",
  "summary": "Reviews threat surface, auth boundaries, and operational hardening"
}
```

This is not the full advisor definition. It is a compact renderable view.

---

## Slot outputs

Slot outputs should be short, inspectable, and prompt-safe.

## `{{advisor.active}}`

### Purpose
Show the advisor or advisors currently most relevant to the session.

### Input sources
- current session ownership
- explicit task/advisor override if present
- ClawCouncil cache if available

### Example output
```json
{
  "active": [
    {
      "id": "clawcanvas-lead",
      "name": "ClawCanvas Lead",
      "reason": "primary owner of current session",
      "domains": ["ui", "scene", "rendering"],
      "status": "active"
    }
  ]
}
```

---

## `{{advisor.byDomain:security}}`

### Purpose
Resolve the preferred advisor for a domain.

### Retrieval priority
1. ClawCouncil cache
2. cached ClawText routing result
3. live lookup from routing rules + advisor definitions

### Example output
```json
{
  "domain": "security",
  "advisor": {
    "id": "security-advisor",
    "name": "Security Advisor",
    "status": "active"
  },
  "resolution": {
    "source": "cache",
    "strategy": "hybrid",
    "reason": "seed rule matched; no invalidating session change"
  }
}
```

---

## `{{advisor.byId:security-advisor}}`

### Purpose
Return the canonical advisor definition or prompt-safe subset.

### Example output
```json
{
  "id": "security-advisor",
  "name": "Security Advisor",
  "domains": ["security", "threat-modeling", "hardening"],
  "models": ["cp-opus", "heavy"],
  "status": "active",
  "availability": {
    "enabled": true
  }
}
```

---

## `{{session.owner:session-1}}`

### Purpose
Resolve the primary advisor owner for a session.

### Example output
```json
{
  "sessionId": "session-1",
  "owner": {
    "id": "clawcanvas-lead",
    "name": "ClawCanvas Lead"
  },
  "domain": "ui",
  "status": "active"
}
```

---

## `{{session.related:current}}`

### Purpose
Return sessions related to the current session by project, owner, or domain.

### Matching heuristics
- same project
- same owner advisor
- same domain
- explicit relation recorded in matrix metadata

### Example output
```json
{
  "baseSession": "session-1",
  "related": [
    {
      "sessionId": "session-2",
      "reason": "same owner advisor",
      "ownerAdvisorId": "clawcanvas-lead",
      "domain": "scene"
    }
  ]
}
```

---

## `{{session.matrix:current-project}}`

### Purpose
Return the compact current project session matrix.

### Example output
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
    }
  }
}
```

---

## `{{council.perspectives}}`

### Purpose
Expose the current set of available advisor viewpoints in compact form.

### Example output
```json
{
  "perspectives": [
    {
      "id": "security-advisor",
      "label": "Security",
      "status": "active"
    },
    {
      "id": "infra-advisor",
      "label": "Infrastructure",
      "status": "active"
    }
  ]
}
```

---

## `{{routing.rule:security}}`

### Purpose
Return the current stored routing record for a domain.

### Example output
```json
{
  "domain": "security",
  "seedAdvisorId": "security-advisor",
  "currentAdvisorId": "security-advisor",
  "strategy": "hybrid"
}
```

---

## `{{routing.explain:security}}`

### Purpose
Expose why the current domain resolved to the chosen advisor.

### Example output
```json
{
  "domain": "security",
  "advisorId": "security-advisor",
  "explanation": {
    "seedMatched": true,
    "usageSignals": {
      "usageCount": 8,
      "positiveFeedback": 3
    },
    "invalidatedRecently": false,
    "reason": "seed advisor retained; observed usage supports current mapping"
  }
}
```

This slot exists primarily for debugging and trust, not routine prompt injection.

---

## Hybrid routing model

## Phase 1 — seeded routing
- explicit domain → advisor mappings
- deterministic
- no learned preference required
- immediately usable

## Phase 2 — refined routing
Track:
- which advisors are queried for which domains
- which sessions they successfully own or resolve
- human feedback about quality/correctness
- session activity patterns

This allows preference refinement without losing the original seed.

## Required explainability rule
Every routing decision must be attributable to one or more of:
- seed rule
- usage evidence
- session activity evidence
- human feedback
- manual override

If the system cannot explain the routing decision, it should fall back to seeded behavior.

---

## Cache model

ClawCouncil maintains the advisor cache.

ClawText provides the source data that cache depends on.

### Lookup order
1. check ClawCouncil cache
2. if hit and not invalidated, return cached result
3. if miss or invalid, perform live lookup from ClawText data
4. repopulate cache

### Invalidation triggers
Invalidate relevant cached entries when:
- a session changes owner advisor
- a new session is created in a tracked project/domain
- an advisor changes `status` or `availability`
- a routing rule changes for a domain
- a project/session is archived or superseded

### Invalidation scope
- owner change → invalidate session-owner and related-session lookups
- advisor status change → invalidate advisor and domain-resolution lookups
- routing update → invalidate domain and council-perspective lookups

### MVP rule
Session change invalidation is required. Broader selective invalidation can improve over time.

---

## Prompt composition guidance

Not every advisor slot should be injected on every prompt.

### Safe defaults
Inject when relevant:
- `advisor.active`
- `session.related:current`
- `council.perspectives` only when council mode is active

Inject on-demand / debugging / orchestration:
- `advisor.byDomain:*`
- `routing.rule:*`
- `routing.explain:*`
- full `session.matrix:*`

### Rationale
Prompt composition should preserve:
- clarity
- token discipline
- explainability

The prompt should know the current advisor context without dragging full routing state into every turn.

---

## Storage recommendations

This spec defines contract shape, not mandatory implementation paths.

Recommended runtime storage roots:

```text
state/clawtext/prod/
  advisors/
    advisors.json
    routing-rules.json
  session-matrix/
    sessions.json
    indexes.json
```

Recommended record classes:
- advisor definitions
- routing rules
- compact council perspective views
- session ownership rows
- invalidation metadata / cache hints

All records should remain file-first and auditable.

---

## Relationship to existing ClawText systems

### Multi-agent memory
Advisor slots do not replace multi-agent memory visibility rules.
They add role/ownership structure on top of them.

### Cross-session awareness
Session relationships should be consumable by ClawText's existing cross-session provider path.

### Clawptimization
Advisor slots are prompt composition inputs and should be treated as named slot families with explicit budget/policy rules.

### ClawBridge / handoff
Advisor/session metadata should be eligible for continuity handoff when a thread or session moves.

---

## Non-goals for MVP

Do not build these yet:
- many-active-advisors arbitration per session
- autonomous advisor creation
- opaque learned routing without explanation
- graph-database dependency
- replacing ClawCouncil logic with ClawText logic

MVP is data shape + slot contract + ownership model.

---

## Recommended implementation order

1. Add this spec and lock field names
2. Implement advisor slot handlers in `src/slots/advisor.ts`
3. Implement session matrix operations in `src/slots/sessionMatrix.ts`
4. Add prompt compositor integration points
5. Add cache invalidation hooks/signals for session ownership changes

---

## Open questions

1. Should `council.perspectives` include inactive-but-known advisors for planning views, or only active advisors?
2. Should routing refinement weights live in ClawText data, ClawCouncil cache, or both?
3. Should session owner changes produce continuity events for ClawBridge/handoff automatically?
4. How much of `routing.explain:*` should be prompt-visible vs debug-only?

---

## Recommendation

Treat advisor slots as a **first-class ClawText slot family** with explicit schema, explainable routing metadata, and session-aware ownership records.

That keeps ClawText responsible for durable, queryable truth while letting ClawCouncil remain the orchestration brain layered on top.
