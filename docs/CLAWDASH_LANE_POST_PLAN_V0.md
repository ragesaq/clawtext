# ClawDash Lane Post Plan v0

**Date:** 2026-03-11  
**Status:** Draft v0

---

## Purpose

Define which focused execution lanes should be spun out next so ClawDash Milestone 1 progresses cleanly.

The goal is to avoid one mega-thread trying to carry every adjacent concept.

---

## Guiding principle

Spin out only the lanes that materially help Milestone 1.
Do not fragment prematurely.

---

## Recommended next focused lanes

## 1. ClawTask / Board Core

### Why this lane exists
This is the heart of Milestone 1.
It defines the coordination model and makes real work visible.

### Focus
- board workflow semantics
- dependency notation
- blocker handling
- seed board cleanup
- product/lane/epic/task normalization
- board-driven UI alignment

### Primary outputs
- status workflow confirmation
- dependency notation confirmation
- cleaned seed board
- board UI adjustments

### Priority
**Highest**

---

## 2. ClawDash IA / Surface Design

### Why this lane exists
We need a stable map of where features belong.
Without this, every subsystem competes for dashboard space without discipline.

### Focus
- Now surface
- Projects surface
- Tasks surface
- Review surface
- density / layout rules
- widget placement rules

### Primary outputs
- stable IA confirmation
- surface ownership confirmation
- layout principles for dense operator UI

### Priority
**Highest**

---

## 3. Incident + Telemetry Foundations

### Why this lane exists
These are real sibling systems, but for Milestone 1 they should be scoped as foundations/specs feeding future work.

### Focus
- event schema
- incident taxonomy
- telemetry model
- Prometheus naming
- initial handoff to future implementation

### Primary outputs
- machine-readable registries
- first-wave metrics plan
- implementation handoff docs later

### Priority
**High, but not ahead of ClawTask core**

---

## Lanes to avoid spinning out yet

## E-Shadow / E-Butler
Why not yet:
- important, but not needed to complete coordination layer M1
- should remain in board/backlog/spec state for now

## Creative Workspace
Why not yet:
- strategically important, but should not pull focus from coordination foundations
- keep represented in board and product map, but not a major execution lane yet

## Full live telemetry implementation
Why not yet:
- foundation/spec work is enough for M1
- implementation can follow once coordination layer is stable

---

## Recommended execution order

1. **ClawTask / Board Core**
2. **ClawDash IA / Surface Design**
3. **Incident + Telemetry Foundations**

---

## What stays in the main ClawDash thread

Use the main thread for:
- milestone-level coordination
- architectural synthesis
- cross-lane decisions
- scope arbitration
- handoffs between lanes

Use focused lanes for:
- actual execution details
- schema refinement
- UI specifics
- normalization / cleanup work

---

## Recommendation

Spin out only the three focused lanes above for Milestone 1.
That is enough structure to accelerate execution without scattering attention.
