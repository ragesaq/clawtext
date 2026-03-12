# ClawDash Information Architecture v0

**Date:** 2026-03-11  
**Status:** Draft v0

---

## Purpose

Define the top-level user-facing information architecture for ClawDash.

ClawDash is the control surface for the wider OpenClaw ecosystem.
It is not just a dashboard. It is the operator cockpit, coordination layer, and re-entry surface.

---

## Primary design principles

1. **Dense by default**
   - Use the browser canvas aggressively
   - Avoid dead whitespace
   - Panels should resize and earn their space

2. **Now before everything else**
   - First answer: what needs attention right now?

3. **Health and coordination are peers**
   - Projects/tasks matter as much as telemetry/health

4. **Memory is visible but not dominant**
   - ClawText is a subsystem surfaced through ClawDash, not the whole UI

5. **Review matters**
   - The system should help catch drift, stale work, and neglected obligations

---

## Top-level navigation

## 1. Now

Purpose:
Show the operator the highest-value current state.

Contains:
- active incidents
- blocked p0/p1 work
- due/overdue tasks
- important reminders
- active sessions
- degraded providers
- re-entry prompts

Primary question answered:
**What should I look at first?**

---

## 2. Health

Purpose:
Operational health across providers, surfaces, tools, queues, and infrastructure.

Contains:
- provider health
- Discord/surface delivery status
- gateway/hook/plugin status
- queue depth/backlog
- incident streams
- luminous server health

Primary question answered:
**What is broken, degraded, or risky?**

---

## 3. Costs / Usage

Purpose:
See spend, utilization, and efficiency.

Contains:
- provider/model usage
- token consumption
- cost over time
- clawsaver savings
- routing efficiency
- model/provider scorecards

Primary question answered:
**Where are the resources going, and are we using them well?**

---

## 4. Projects

Purpose:
Track products, lanes, epics, milestones, and dependencies.

Contains:
- product map
- lane map
- milestone timeline
- dependency graph
- major blockers
- recent artifact outputs

Primary question answered:
**What are we building, and how does it fit together?**

---

## 5. Tasks

Purpose:
Action-oriented execution surface via ClawTask.

Contains:
- board view
- task list
- owner view
- due items
- blocked items
- reminders / obligations

Primary question answered:
**What needs to get done next?**

---

## 6. Memory / Learnings

Purpose:
Expose ClawText’s useful outputs.

Contains:
- memory browser
- promoted learnings
- operational patterns
- anti-patterns
- recent ingested artifacts
- cluster / quality views

Primary question answered:
**What has the system learned, and what should inform current work?**

---

## 7. Review

Purpose:
Periodic maintenance and cleanup surface.

Contains:
- stale tasks/projects
- aging incidents
- drifting preferences/routing
- memory hygiene candidates
- unresolved blockers
- cleanup suggestions

Primary question answered:
**What is quietly rotting or being ignored?**

---

## Cross-cutting widgets

These should be available in multiple surfaces:
- global incident strip
- active session strip
- queue depth indicator
- provider status pills
- quick-add task/reminder
- time window selector
- search / command palette

---

## Home / landing behavior

Default landing page should be **Now**.

Why:
- it is the highest-value operator view
- it reduces re-entry friction
- it combines incident, task, and reminder urgency in one place

---

## Suggested layout model

## Desktop

- Left rail: persistent nav
- Top strip: quick health / costs / session summary
- Main content: dense, resizable panels
- Right rail (optional): detail drawer / inspector / linked objects

## Mobile / narrow layouts

- collapsible nav
- priority stack: Now → Health → Tasks
- charts should compact rather than disappear

---

## Recommended surface ownership

- **Now** → derived from incidents + tasks + reminders + active sessions
- **Health** → incident engine + telemetry + server metrics
- **Costs / Usage** → telemetry + provider/cost models + routing stats
- **Projects** → ClawTask product/lane/epic model
- **Tasks** → ClawTask task/reminder/dependency model
- **Memory / Learnings** → ClawText
- **Review** → synthesis layer across all of the above

---

## Suggested v0 routes

- `/now`
- `/health`
- `/costs`
- `/projects`
- `/tasks`
- `/memory`
- `/review`
- `/grafana`
- `/settings`

---

## v0 widgets by surface

## Now
- incident summary
- blocked work list
- due soon
- provider degradation tile
- active sessions
- recent important events

## Health
- provider matrix
- incident feed
- queue metrics
- server stats
- hook/cron health

## Costs
- spend graph
- token graph
- provider/model comparison
- clawsaver savings

## Projects
- product cards
- epic progress
- dependency graph
- milestone panel

## Tasks
- kanban board
- due list
- owner swimlane
- blockers panel

## Memory
- cluster browser
- search
- learnings feed
- operational patterns

## Review
- stale work
- unresolved incidents
- cleanup candidates
- drift alerts

---

## Search and command palette

ClawDash should eventually support a unified search / command palette that can jump to:
- task
- epic
- product
- memory
- incident
- thread
- dashboard
- artifact

This is likely more important than perfect nav depth.

---

## Recommendation

Build v0 around these pages first:
1. Now
2. Projects
3. Tasks
4. Health
5. Memory

That gets ClawDash useful early without waiting for every subsystem to mature.
