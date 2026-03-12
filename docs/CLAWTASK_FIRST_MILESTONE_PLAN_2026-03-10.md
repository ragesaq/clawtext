# ClawTask First Milestone Plan — 2026-03-10

## Goal of Milestone 1

Create the **minimum viable coordination layer** for the larger platform.

This milestone is **not** about building the entire grand vision yet.
It is about creating enough structure that the rest of the platform can be built intentionally instead of drifting across forum posts and ad hoc notes.

## Milestone outcome

At the end of Milestone 1, we should have:

1. a shared **program map**
2. a defined **product/lane/epic/task model**
3. a usable **ClawTask board structure**
4. an agreed **dependency model**
5. a first-pass **ClawDash information architecture**
6. clear follow-on work for incident, telemetry, and memory integration

---

## Phase 0 — Alignment and structure

### Objective
Create the planning skeleton and establish the top-level vocabulary.

### Deliverables
- Grand Vision / Program Map document
- Product map
- Lane/workstream map
- Shared glossary:
  - product
  - lane
  - epic
  - task
  - milestone
  - dependency
  - blocker
  - incident
  - artifact

### Tasks
- T0.1 Define top-level products
- T0.2 Define lane/workstream list
- T0.3 Define board terminology
- T0.4 Define board columns
- T0.5 Define ownership/status conventions

### Exit criteria
- Everyone knows what a card means
- The board structure is stable enough to start tracking real work

---

## Phase 1 — ClawTask domain model

### Objective
Define what the task manager needs to understand.

### Core entities
- Product
- Lane / Workstream
- Epic
- Task
- Milestone
- Dependency
- Blocker
- Artifact
- Note / Scratchpad reference

### Required fields

#### Product
- id
- name
- description
- status
- owner
- related lanes

#### Lane
- id
- name
- purpose
- parent product
- forum/thread reference
- active status

#### Epic
- id
- title
- product
- lane
- summary
- dependencies
- status
- priority

#### Task
- id
- title
- epic
- product
- lane
- owner
- status
- priority
- due/target date
- blockers
- related artifacts

#### Dependency
- source item
- target item
- dependency type
  - blocks
  - informs
  - requires
  - follows

### Tasks
- T1.1 Define Product schema
- T1.2 Define Lane schema
- T1.3 Define Epic schema
- T1.4 Define Task schema
- T1.5 Define Dependency/Blocker schema
- T1.6 Define artifact linking rules

### Exit criteria
- We can model real work without ambiguity
- Dependencies and blockers are explicit

---

## Phase 2 — Initial board population

### Objective
Stand up the first real board using current work.

### Initial products
- ClawText
- ClawDash
- Incident / Triage Engine
- Telemetry / ClawMon
- E-shadow / E-butler
- Creative Workspace

### Initial epics
- E1 Shared Event Backbone
- E2 Incident & Triage Engine
- E3 Telemetry / ClawMon
- E4 ClawText Operational Health Lane
- E5 ClawDash Information Architecture
- E6 ClawTask Core Model
- E7 E-shadow Attention Layer
- E8 Creative Workspace Layer
- E9 Policy / Preference / Routing

### Seed tasks to create immediately
- Define shared event schema v0
- Define incident taxonomy v0
- Define telemetry entities v0
- Define ClawTask domain model v0
- Draft ClawDash top-level navigation
- Capture current lane/forum post map
- Define dependency notation
- Define status workflow

### Exit criteria
- The board reflects real work already underway
- Active and blocked work are visible

---

## Phase 3 — ClawDash board surface definition

### Objective
Define how ClawTask appears in ClawDash.

### Views to support first
- Program board view
- Product view
- Epic/task list view
- Dependency/blocker view
- "Now" queue for currently relevant work

### Nice-to-have later
- Timeline / milestone view
- Workload view
- Personal/professional mixed task rollup
- Incident-linked task view
- Artifact-linked project view

### Tasks
- T3.1 Define top-level board view
- T3.2 Define per-product view
- T3.3 Define dependency visualization
- T3.4 Define “Now” / focus queue view

### Exit criteria
- We know what ClawTask looks like in ClawDash before building too much UI

---

## Phase 4 — Integration hooks (not full implementation yet)

### Objective
Define how ClawTask connects to the rest of the platform.

### Integration points

#### With ClawText
- board items can reference memory artifacts
- decisions/learnings can link to epics/tasks
- related docs can be ingested and surfaced

#### With Incident/Triage
- incidents can spawn tasks
- persistent failures can create epics or blockers
- degraded systems can show up in "Now"

#### With Telemetry / ClawMon
- telemetry anomalies can open or update tasks
- cost spikes can create review tasks
- provider degradation can block product work or alter priorities

#### With E-shadow
- tasks can surface as re-entry prompts
- overdue obligations can appear in personal action views
- personal/professional split can be represented without forking the whole board

### Tasks
- T4.1 Define task ↔ memory links
- T4.2 Define incident ↔ task creation rules
- T4.3 Define telemetry ↔ review task rules
- T4.4 Define e-shadow task surfacing rules

### Exit criteria
- ClawTask is not isolated; it is a hub surface

---

## Recommended board columns

- Vision / Backlog
- Ready
- Active
- Blocked
- Review
- Done
- Watching / Ongoing

---

## Recommended first owners / focus

### ClawDash lane
- board structure
- IA
- surface definitions

### ClawText lane
- memory links
- ingest of planning artifacts
- operational health lane shape

### Incident / Triage lane
- event taxonomy
- classification model
- retry/fallback policy concepts

### Telemetry / ClawMon lane
- provider/server/cost metrics model
- rollup design

---

## Dependency order

### Must come first
1. Product/lane/epic/task model
2. Board columns/status workflow
3. Shared dependency notation

### Then
4. ClawDash board surface definitions
5. Integration rules with memory/incidents/telemetry

### Then later
6. Automation and live event-driven task creation
7. Rich visualizations
8. Personal/professional attention routing

---

## What NOT to do in Milestone 1

- Do not try to build every ClawDash feature immediately
- Do not overcomplicate workflow states
- Do not automate task creation before schema and dependency rules exist
- Do not split ClawTask into a standalone product/channel too early
- Do not try to solve every personal productivity use case at once

Milestone 1 is about **coordination clarity**, not maximum feature count.

---

## Milestone 1 definition of done

Milestone 1 is complete when:
- ClawTask has a stable core model
- real work is represented on the board
- products, lanes, epics, tasks, and blockers are visible
- ClawDash has an agreed board/task surface direction
- integration points with memory, incidents, and telemetry are defined
- the system is ready for deeper implementation instead of exploratory drift
