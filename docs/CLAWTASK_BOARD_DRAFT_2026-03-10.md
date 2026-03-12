# ClawTask Board Draft — 2026-03-10

## Purpose

ClawTask is the project board / task manager surface inside ClawDash.

It should coordinate:
- products
- lanes
- epics
- tasks
- dependencies
- blockers
- milestones
- active work

It serves two horizons:
1. **Near-term** — coordinate the buildout of the grand platform
2. **Long-term** — become part of the user’s real personal/professional/project workspace

---

## Top-level products

- ClawText
- ClawDash
- Incident / Triage Engine
- Telemetry / ClawMon
- ClawTask
- E-shadow / E-butler
- Creative Workspace

---

## Initial board columns

- **Vision / Backlog**
- **Ready**
- **Active**
- **Blocked**
- **Review**
- **Done**
- **Watching / Ongoing**

---

## Initial epics

### E1. Shared Event Backbone
- define common event envelope
- define correlation ids / dedupe keys
- define queue priorities and severity model
- identify event producers and consumers

### E2. Incident & Triage Engine
- classify provider, surface, tool, and infrastructure failures
- define retry/fallback/suppress/escalate policy
- stop raw provider JSON from leaking to Discord
- define user-facing failure rewrites

### E3. Telemetry / ClawMon
- provider latency/reliability metrics
- luminous server health metrics
- queue depth / incident volume
- cost / usage tracking
- provider/model scorecards

### E4. ClawText Operational Health Lane
- provider-health memory lane
- recurring incident pattern capture
- operational learning promotion flow
- hygiene and anti-pattern relationships to incidents

### E5. ClawDash Information Architecture
- define top-level dashboard surfaces
- Now / Health / Costs / Projects / Tasks / Learnings / Review
- define surface ownership and data requirements

### E6. ClawTask Core Model
- project model
- task model
- milestone model
- dependency / blocker model
- owner / lane / product relationships

### E7. E-shadow / E-butler
- reminders
- obligations
- re-entry support
- personal/professional next actions
- low-friction executive support flows

### E8. Creative Workspace Layer
- projects + artifacts + notes
- scratchpad and idea capture
- orchestration across modalities/tools
- support physical builds, coding projects, and commercial products

### E9. Policy / Preference / Routing
- model preference registry
- cost-aware routing
- quality-aware routing
- fallback provider selection
- usage / utilization guided behavior

---

## Suggested first tasks

### Foundations first
1. Define shared event schema
2. Define incident taxonomy
3. Define telemetry model
4. Define ClawTask domain model

### Then ClawDash coordination
5. Draft ClawDash IA
6. Create board views and lane mappings
7. Connect products/epics/dependencies

### Then advanced behavior
8. Provider health memory lane
9. Routing preferences and cost integration
10. E-shadow attention layer

---

## Initial dependency map

- **Event Backbone** → required by Incident Engine, Telemetry, Learning
- **Incident Engine** → feeds Telemetry + ClawText operational health lane
- **Telemetry** → feeds ClawDash health/cost views + routing layer
- **ClawTask model** → feeds ClawDash Projects/Tasks and long-term workspace use
- **Preference/Routing** → depends on Telemetry + Memory/Learning
- **E-shadow** → depends on Tasks + Memory + Preferences + Events

---

## Suggested first board cards

### Ready
- Define event schema v0
- Define incident classification taxonomy v0
- Define telemetry entities for providers / models / server / queue
- Define ClawTask domain model v0
- Draft ClawDash top-level navigation

### Backlog
- Provider cost model
- Model preference registry
- Discord failure rewrite catalog
- Creative artifact linking model
- Personal/professional reminder model

### Watching / Ongoing
- ClawText graph density / full-canvas rendering
- ClawText anti-patterns
- ClawText hygiene triage flow
- ClawText provider error handling ideas

---

## Scope note

ClawTask should stay inside ClawDash for now.
It may earn its own lane/product identity later, but early separation would fragment coordination too soon.