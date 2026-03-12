# ClawTask Milestone 1 Scope Lock v0

**Date:** 2026-03-11  
**Status:** Draft v0  
**Parent:** ClawDash / ClawTask

---

## Purpose

Lock the scope of Milestone 1 so the project builds the **coordination layer first** instead of diffusing into the full grand vision too early.

Milestone 1 is about **coordination clarity**.
Not maximum feature count.

---

## Milestone 1 mission

Create the minimum viable coordination layer for the broader platform.

At the end of Milestone 1 we should have:
- a stable planning vocabulary
- a usable ClawTask model
- a board populated with real work
- visible dependencies and blockers
- a stable ClawDash surface direction
- clear integration hooks for memory, incidents, and telemetry

---

## In scope

## 1. ClawDash top-level surfaces
Must be agreed and represented in the app shell.

Required surfaces:
- Now
- Health
- Costs / Usage
- Projects
- Tasks
- Memory / Learnings
- Review

### Success condition
The shell and IA are stable enough that future features know where they belong.

---

## 2. ClawTask core domain model
Must be stable enough to represent real work.

Required entities:
- Product
- Lane
- Epic
- Task
- Milestone
- Dependency
- Blocker
- Artifact
- ThreadRef / lane reference

### Success condition
Current platform work can be modeled without ambiguity.

---

## 3. Board workflow and status semantics
Must be simple and explicit.

Required columns:
- Vision / Backlog
- Ready
- Active
- Blocked
- Review
- Done
- Watching / Ongoing

### Success condition
The board can show real active work, blocked work, and review state clearly.

---

## 4. Initial board population
The board must reflect actual current work, not placeholder fantasy.

Required initial products:
- ClawDash
- ClawText
- ClawTask
- ClawMon
- ClawOps
- E-Shadow
- Creative Workspace

Required initial epics:
- Shared Event Backbone
- Incident & Triage Engine
- Telemetry / ClawMon
- ClawText Operational Health Lane
- ClawDash Information Architecture
- ClawTask Core Model
- Policy / Preference / Routing
- E-Shadow Attention Layer
- Creative Workspace Layer

### Success condition
A human can open the board and understand what exists, what is active, and what is blocked.

---

## 5. Dependency model
Dependencies must be explicit and visible.

Required support:
- `requires`
- `blocks` / blocker relationship
- `feeds`
- `informs`
- `related_to`

### Success condition
Critical path relationships are visible, not buried in prose.

---

## 6. First board surfaces in ClawDash
ClawDash must show the coordination layer, even if backed by seed data.

Required views:
- Now
- Projects
- Tasks
- Review

### Success condition
ClawDash demonstrates the coordination layer in the actual UI.

---

## 7. Integration hooks defined, not fully implemented
Milestone 1 must define how ClawTask connects to other pillars.

Required hook definitions:
- task ↔ memory links
- incident ↔ task creation rules
- telemetry ↔ review task rules
- e-shadow ↔ task surfacing rules

### Success condition
Integration direction is specified clearly enough for later implementation.

---

## Explicitly out of scope

The following are **not required** for Milestone 1 completion:

- full live Prometheus/Grafana telemetry
- fully implemented incident automation
- live event bus / queue runtime
- automatic task creation from incidents/telemetry
- full reminder/e-shadow system
- rich personal productivity workflows
- final production-grade board UX
- complete provider routing automation
- complete ClawText operational lane implementation

These may be specified or stubbed, but they are **not milestone blockers**.

---

## Minimum definition of done

Milestone 1 is complete when:

1. ClawDash top-level IA is stable
2. ClawTask domain model is stable
3. board workflow/status semantics are agreed
4. initial board is populated with real work
5. dependencies and blockers are visible
6. Now / Projects / Tasks / Review exist in ClawDash
7. integration hooks with memory / incidents / telemetry are defined

---

## What should not derail M1

These are important, but they are **follow-on work** unless they directly support milestone completion:
- deeper Grafana dashboard work
- broad metrics instrumentation
- long-term routing logic
- rich automation
- creative workspace expansion
- e-shadow breadth expansion

---

## Current milestone assessment

### Already substantially done
- ClawDash IA v0
- ClawTask domain model v0
- initial seed board
- seed-data-driven UI shells
- event / incident / telemetry docs

### Still needed to feel truly locked
- explicit status workflow doc
- explicit dependency notation doc
- lane post / spin-out plan
- integration hook doc or explicit confirmation that existing docs cover it sufficiently

---

## Recommendation

Treat all work after this point as either:
- **Milestone 1 completion work**, or
- **Post-M1 prep/spec work**

If it is the second kind, it should not displace the first.
