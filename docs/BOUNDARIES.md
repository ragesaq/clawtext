# ClawText Boundaries

**Purpose:** keep ClawText independently useful as a memory system product while allowing host-product integrations like ClawDash and ClawCouncil.

---

## Core rule

> **ClawText exports reusable memory primitives. Host products consume them.**

Do not let host-specific UI, workflow, or deployment assumptions leak into ClawText core.

---

## The 3 buckets

### 1. Core
Belongs in ClawText core if it remains valid even when every host product disappears.

Examples:
- memory lanes
- retrieval/ranking
- continuity and handoff primitives
- slot contracts and slot APIs
- template expansion
- session/advisor matrix primitives
- operational learning
- generic retrieval warnings
- storage schemas and auditable state

### 2. Integrations
Belongs in an integration module if it is a host-specific adapter built on top of core primitives.

Examples:
- `src/integrations/clawcouncil.ts`
- `src/integrations/clawdash.ts`
- dashboard-oriented prompt bundles
- dashboard render transforms
- host-specific view models and convenience context bundles

### 3. Local overlays
Belongs in config/state/local overlays if it only makes sense in one deployment.

Examples:
- private channel mappings
- local naming shortcuts
- one-off experiments
- environment-specific assumptions

---

## Independence test

Before adding a feature, ask:

### Survival test
If ClawDash vanished tomorrow, would ClawText still want this capability?
- yes → core
- maybe → integration
- no → host-specific

### Naming test
Can you describe it without naming ClawDash?
- yes → likely core/integration
- no → likely host-specific

### Primitive vs composition test
Is it a reusable primitive or a host-specific composition/view?
- primitive → core
- composition/view → integration

### Dependency-direction test
Would ClawText core need to import host-specific code to support it?
- yes → wrong boundary
- no → probably safe

---

## Dependency rule

Dependency direction must remain one-way:

```text
ClawText core  -> reusable APIs/primitives
Integrations   -> import core
Host products  -> import integrations and/or core
```

**Never let ClawText core import ClawDash-specific code.**

---

## Recommended repo structure

```text
src/
  slots/
  providers/
  operational/
  integrations/
    clawcouncil.ts
    clawdash.ts
```

- `src/*` = host-agnostic primitives
- `src/integrations/*` = adapters over core primitives

---

## Practical examples

### Core
- `resolveSlotTemplate(...)`
- `expandSlotTemplates(...)`
- session identity resolution
- advisor/session contracts
- continuity packet schemas
- retrieval-warning heuristics

### Integration
- render ClawText slot bundles into dashboard cards
- dashboard summary of operational health
- ClawDash-specific prompt/context packs
- ClawCouncil orchestration helpers

### Local overlay
- private server mappings
- personal project aliases
- one-environment workflow assumptions

---

## Implementation preference

Prefer:
- generic core primitive
- configured or consumed by integration layer
- host-specific UX outside core

Avoid:
- `if (host === "clawdash")` branches in core
- UI assumptions inside retrieval logic
- product-specific naming in core schema design

---

## Bottom line

ClawText should be publishable and independently usable as a memory product.
Host products are important consumers, not the definition of ClawText core.
