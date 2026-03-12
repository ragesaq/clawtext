# ClawDash Handoff — 2026-03-10

## Why this handoff exists

This conversation began in the ClawText memory-system lane, but it surfaced a broader architecture that clearly belongs in **ClawDash** as the user-facing control surface and coordination layer.

This document is the clean synthesis of that conversation.

**Recommendation:** ingest this document into ClawText as a curated planning artifact rather than relying only on piecemeal memory extraction from the thread.

---

## Executive summary

The project is no longer just “build a memory system.”

It is converging into a broader platform with reusable pillars:

1. **Event Bus / Queue** — operational intake and burst handling
2. **Incident / Triage Engine** — detect, classify, retry, fallback, escalate
3. **Metrics / Telemetry Store** — long-lived operational truth
4. **Memory / Learning Stack** — qualitative and semantic learning
5. **Policy / Preference / Routing Layer** — choose models/providers/actions intelligently
6. **Project / Task / Artifact Layer** — coordination across work, projects, life, and creative efforts

**ClawText** remains the memory/learning substrate.

**ClawDash** becomes the face of the system:
- health
- costs
- project board
- task list
- operational visibility
- provider state
- personal/professional re-entry point

**E-shadow / e-butler** becomes the attention/executive layer:
- reminders
- obligations
- re-entry into neglected contexts
- personal/professional follow-ups
- low-friction next actions

---

## Core architectural decisions established

### 1. ClawText stays the memory substrate
ClawText remains focused on:
- holistic memory system
- structured maintenance
- ingest
- anti-patterns
- hygiene
- operational learning

It should also eventually host a **provider-health / operational-health lane** as part of the learning stack.

### 2. Runtime incident handling should not live only inside ClawText
We identified the need for a separate operational module that is broader than provider health.

This module should catch not just provider failures, but any operational errors that bubble to Discord or reflect infrastructure issues.

Examples:
- provider outages / rate limits / auth / billing
- malformed model output
- Discord delivery failures
- formatting or payload issues
- gateway/hook/plugin failures
- infrastructure-level incidents

### 3. Provider health is one lane within a broader incident system
The broader operational system should include:
- event capture
- queueing
- classification
- action policy
- retry/fallback
- user-facing rewrite
- telemetry
- learning sink

Provider health is a major lane inside that system, not the whole system.

### 4. ClawDash should host a project board / task manager as a core pillar
This is not a side feature.

It should become a top-level ClawDash surface used for:
- products
- lanes
- epics
- milestones
- dependencies
- blockers
- active work
- personal/professional tasks

This board will help both:
- build the platform itself
- become part of the long-term platform for real use

### 5. Creative workspace is a primary consumer of the platform
The platform is meant to support:
- small physical builds
- experimental projects
- ambitious software projects
- commercializable products
- scratchpad ideas
- project orchestration
- artifacts, notes, and tasks across modalities

This does **not** require a whole new foundational pillar, but it **does** shape how the pillars should be designed.

### 6. UI density matters
A repeated user preference in the browser/operator UI discussion:
- maximize use of available canvas
- minimize wasted whitespace
- dynamically resize features to use the browser window aggressively
- navigation is fine if it earns its space; dead margins are not

This is an important design principle for future ClawDash surfaces.

---

## What problem we are solving now

The problem is not just “memory.”

The problem is:
- build a system that helps the user manage projects, ops, providers, incidents, costs, tasks, and personal/professional obligations in one coherent place
- preserve learning across sessions and agents
- reduce operational noise
- create a dashboard/control plane that supports both infrastructure thinking and everyday execution

---

## Proposed platform pillars

## A. Event Bus / Queue
The nervous system.

Used for:
- provider failures
- Discord send/delivery failures
- gateway/plugin/hook failures
- telemetry samples
- task state changes
- reminders
- bill/calendar events
- scratchpad captures
- reviews/promotions/maintenance jobs

### Responsibilities
- durable event intake
- ordering
- burst handling
- deduplication/collapse
- priority/severity
- correlation ids
- queue depth / backlog observability

---

## B. Incident / Triage Engine
The real-time response layer.

### Responsibilities
- classify incidents
- decide if retry/fallback/suppress/escalate is appropriate
- prevent raw provider JSON from leaking to Discord
- rewrite user-facing failures into human messages
- trigger cooldowns / circuit breakers / backoff
- emit structured events for metrics + learning

### Example classes
- `provider.server_error`
- `provider.rate_limited`
- `provider.quota_exceeded`
- `provider.auth_invalid`
- `provider.timeout`
- `response.invalid_shape`
- `surface.discord_rejected`
- `surface.discord_raw_error_leak`
- `infra.gateway_timeout`
- `tool.invalid_output`

---

## C. Metrics / Telemetry Store
The long-lived quantitative truth.

### Responsibilities
Track and retain:
- provider latency, reliability, error rates
- throughput and retries
- server health on luminous
- queue depth and incident volume
- operational trends over time
- cost and utilization
- model/provider comparisons
- degradation windows and historical quality

### This powers
- ClawDash health views
- provider scorecards
- performance analysis
- cost reporting
- trend/risk analysis

---

## D. Memory / Learning Stack
The qualitative truth.

### Responsibilities
- semantic memory
- project memory
- anti-patterns
- hygiene
- operational learnings
- recurring incident patterns
- promoted guidance
- user preferences and task/style knowledge

### ClawText remains central here
ClawText should ingest curated docs, structured events, rollups, and learned patterns.

---

## E. Policy / Preference / Routing Layer
The decision layer.

This consumes:
- telemetry
- incident state
- learned preferences
- cost/utilization
- task category
- urgency/quality constraints

And it outputs:
- provider/model selection
- fallback behavior
- acceptable alternates
- cost-aware routing
- quality-aware routing

### User model preferences identified in discussion
Examples raised by user:
- Haiku for copy/messaging/language tasks
- Qwen embeddings via OpenRouter for fast/cheap embeddings
- GPT-5.4 for project planning / concept synthesis / large thought work
- GPT-5.3-codex for troubleshooting and fixing issues

These should eventually be stored in a structured preference registry, not just remembered informally.

---

## F. Project / Task / Artifact Layer
The coordination layer.

### Responsibilities
Track:
- products
- lanes / forum posts
- epics
- tasks
- milestones
- dependencies
- blockers
- owners
- projects
- artifacts
- scratchpad items
- personal/professional obligations

This is likely to become **ClawTask** as a feature/product surface within ClawDash.

---

## Surface roles

## ClawText
Role:
- memory substrate
- ingest
- learning
- anti-patterns
- hygiene
- operational memory

## ClawDash
Role:
- face of the system
- dashboard / command center
- health / cost / project / task / incident visibility
- operator surfaces
- top-level control plane

## E-shadow / e-butler
Role:
- attention management
- re-entry support
- reminder surfacing
- personal/professional follow-ups
- executive-function assist layer

---

## Proposed ClawDash top-level surfaces

Suggested initial ClawDash sections:

1. **Now**
   - what needs attention now
   - critical incidents, due items, blocked work

2. **Health**
   - providers, models, incidents, queue depth, server state

3. **Costs / Usage**
   - provider/model utilization, spend, efficiency trends

4. **Projects**
   - products, lanes, milestones, board view

5. **Tasks**
   - personal + professional + project tasks

6. **Memory / Learnings**
   - promoted patterns, open learnings, operational summaries

7. **Review**
   - aging items, drift, stale projects, unresolved incidents, cleanup needs

---

## Why a project board / task manager is needed now

Forum posts are excellent for focused lane work, but they are not enough for overall coordination.

We need a central board that can answer:
- what are the major products?
- what lanes exist?
- what depends on what?
- what is blocked?
- what is active now?
- what work belongs in ClawText vs ClawDash vs incident engine vs telemetry?
- what is slipping or drifting?

That board should be one of the main pillars of ClawDash.

---

## Suggested lane / forum-post structure

The conversation suggested multiple focused workstreams.

Recommended lanes:

### 1. Platform Foundations
- event bus / queue
- shared schemas
- incident taxonomy
- telemetry interfaces
- policy/routing interfaces

### 2. ClawText Core
- memory
- ingest
- structured maintenance
- anti-patterns
- hygiene
- operational learning
- provider-health memory lane

### 3. Incident / Triage / Provider Health
- error capture
- classification
- retry/fallback policy
- user-facing error rewriting
- provider and surface incident handling

### 4. Telemetry / ClawMon
- server health on luminous
- provider/model metrics
- cost/usage monitoring
- historical rollups
- quality/latency/throughput views

### 5. ClawDash
- dashboard architecture
- top-level information design
- health views
- cost views
- board/task surfaces

### 6. ClawTask (inside ClawDash for now)
- project board
- task manager
- dependencies
- lane tracking
- milestone/status workflows

### 7. E-shadow / E-butler
- reminders
- bills / birthdays / obligations
- personal/professional re-entry points
- attention steering

### 8. Creative Workspace
- projects
- artifacts
- scratchpad
- orchestration across creative modalities

**Recommendation:** keep ClawTask as a feature/product under ClawDash for now, not its own separate channel yet.

---

## Key insights from the conversation

### A. Queue first, memory second
If incidents go straight into learning/memory without triage, we recreate the same noise problem as raw logs.

### B. Runtime action and memory should be split
- runtime module handles detection + queue + triage + response
- ClawText handles learning, recurrence, and durable guidance

### C. Telemetry is a sibling, not a subfeature of incident handling
Incident handling is reactive and real-time.
Telemetry is long-lived and analytic.
They should share schemas and event flow, but not be smashed into one file/module.

### D. Creative/project work is not an edge case
It is one of the primary reasons this system matters.

### E. The platform should support both “big infrastructure work” and “small important life/admin work”
This is why the e-shadow/e-butler layer matters.

---

## Immediate next steps recommended

### 1. Create a master program map / board
Start with:
- products
- lanes
- epics
- dependencies
- milestones
- current blockers

### 2. Define shared event schema
This should be shared by:
- queue
- triage engine
- telemetry
- learning lane
- ClawDash views

### 3. Define incident taxonomy
Classes, severities, retryability, escalation rules.

### 4. Define telemetry model
What we track for:
- providers/models
- luminous/server health
- costs/usage
- queue health

### 5. Define ClawDash top-level IA
Agree on top-level views and what belongs where.

### 6. Stand up ClawTask as a board surface inside ClawDash
The project now needs a formal coordination layer.

---

## Suggested starting board structure

### Columns
- Vision / Backlog
- Ready
- Active
- Blocked
- Review
- Done
- Watching / Ongoing

### Initial epics
- E1: Shared Event Backbone
- E2: Incident & Triage Engine
- E3: Provider Health Lane in ClawText
- E4: Telemetry / ClawMon
- E5: ClawDash IA + Surface Design
- E6: ClawTask Board / Dependency Model
- E7: E-Shadow Attention Layer
- E8: Creative Workspace Domain Model
- E9: Cost / Usage / Preference Routing

---

## Working definition of success

The system should eventually let the user:
- see what is happening across infra, providers, costs, projects, and tasks
- understand what is broken and what the system is doing about it
- preserve learnings across sessions and agents
- stay on top of both creative projects and life/professional obligations
- re-enter stale contexts quickly
- make better routing and resource decisions using cost, quality, and preference data

---

## Recommended destination for continued discussion

Move the broader architecture and coordination conversation into **ClawDash**, because it is now primarily about:
- top-level control surfaces
- project/task management
- coordination of multiple lanes/products
- dashboard and operator UX

Keep ClawText threads focused on:
- memory / ingest / anti-patterns / hygiene / learning internals

---

## Final recommendation on archival

### Best option
Use this document as the canonical summary and ingest **this** into ClawText.

### Optional companion step
Later, archive or ingest the raw thread transcript as provenance/reference if desired.

Why this is better:
- the raw thread is valuable but noisy
- this handoff captures the architecture in a distilled form
- ClawText should ingest high-signal planning artifacts whenever possible
