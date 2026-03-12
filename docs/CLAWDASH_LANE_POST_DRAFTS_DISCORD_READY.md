# ClawDash Lane Post Drafts — Discord Ready

These are copy-paste-friendly Discord starter posts for the three Milestone 1 execution lanes.

---

## 1) ClawTask / Board Core

**Title:** ClawTask / Board Core — Milestone 1 coordination layer

```md
This lane is for the core coordination model behind ClawDash Milestone 1.

**Scope**
- board workflow semantics
- dependency notation
- blocker handling
- product / lane / epic / task normalization
- seed board cleanup
- board-driven UI alignment

**Canonical docs**
- `docs/CLAWTASK_DOMAIN_MODEL_V0.md`
- `docs/CLAWTASK_MILESTONE1_SCOPE_LOCK_V0.md`
- `docs/CLAWTASK_STATUS_WORKFLOW_V0.md`
- `docs/CLAWTASK_DEPENDENCY_NOTATION_V0.md`
- `docs/CLAWTASK_SEED_BOARD_V0.json`

**Milestone 1 objective**
Make the coordination layer real enough that current work is visible, dependencies are explicit, and the board stops being aspirational.

**Immediate tasks**
- normalize seed board statuses to the locked workflow
- confirm blocker representation
- confirm dependency vocabulary
- decide what counts as a real blocked card vs just backlog/ready
- keep Projects / Tasks / Now aligned with the board model

**Out of scope for this lane**
- full live telemetry implementation
- full incident automation
- e-shadow breadth work
```

---

## 2) ClawDash IA / Surface Design

**Title:** ClawDash IA / Surface Design — Milestone 1 operator surfaces

```md
This lane is for the top-level ClawDash surface design and layout rules.

**Scope**
- Now
- Projects
- Tasks
- Review
- dense layout rules
- widget placement / surface ownership
- M1 summary and coordination visibility

**Canonical docs**
- `docs/CLAWDASH_HANDOFF_2026-03-10.md`
- `docs/CLAWDASH_IA_V0.md`
- `docs/CLAWTASK_MILESTONE1_SCOPE_LOCK_V0.md`
- `docs/CLAWDASH_LANE_POST_PLAN_V0.md`

**Milestone 1 objective**
Stabilize the control-plane shape so future features know where they belong without turning the dashboard into a junk drawer.

**Immediate tasks**
- keep top-level nav stable
- ensure Now is truly the default re-entry page
- ensure Projects / Tasks / Review each have distinct jobs
- enforce dense use of available canvas
- surface milestone scope clearly in UI

**Out of scope for this lane**
- final polished design system
- full rich visualization work
- every future subsystem page
```

---

## 3) Incident + Telemetry Foundations

**Title:** Incident + Telemetry Foundations — schema, taxonomy, metrics

```md
This lane is for the foundation layer that will feed Health / Costs / Review without pulling focus away from Milestone 1 coordination work.

**Scope**
- shared event schema
- incident taxonomy
- telemetry model
- Prometheus metric naming
- implementation handoff for later coding

**Canonical docs**
- `docs/EVENT_SCHEMA_V0.md`
- `docs/EVENT_SCHEMA_V0.json`
- `docs/INCIDENT_TAXONOMY_V0.md`
- `docs/INCIDENT_TAXONOMY_V0.json`
- `docs/TELEMETRY_MODEL_V0.md`
- `docs/TELEMETRY_MODEL_V0.json`
- `docs/PROMETHEUS_METRICS_V0.md`
- `docs/PROMETHEUS_METRICS_V0.json`

**Milestone 1 objective**
Make this layer concrete enough that follow-on implementation can begin cleanly after the coordination layer is settled.

**Immediate tasks**
- confirm first-wave metrics
- confirm incident class coverage
- confirm event envelope and label discipline
- define implementation handoff docs for gateway metrics emission
- avoid overbuilding dashboards before the coordination layer is complete

**Out of scope for this lane**
- full production telemetry rollout
- broad instrumentation across every subsystem immediately
- advanced routing automation
```
