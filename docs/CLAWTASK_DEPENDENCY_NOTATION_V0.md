# ClawTask Dependency Notation v0

**Date:** 2026-03-11  
**Status:** Draft v0

---

## Purpose

Define the relationship vocabulary used to describe how products, lanes, epics, tasks, and blockers relate.

Dependencies should be explicit enough to support:
- board visibility
- Now / Review surfacing
- critical path reasoning
- future automation

---

## Core dependency kinds

## `requires`
Meaning:
This item cannot meaningfully proceed until the target exists or is complete.

Example:
- Telemetry / ClawMon `requires` Shared Event Backbone

Use when:
- the dependency is structurally necessary

---

## `blocks`
Meaning:
The source item is directly preventing the target from progressing.

Example:
- Define ClawTask domain model `blocks` Build Projects view shell

Use when:
- one unresolved item is actively holding another item back

Note:
`blocks` is stronger and more immediate than `requires`.

---

## `feeds`
Meaning:
The source item produces data or outputs consumed by the target.

Example:
- Telemetry metrics `feeds` Health / Costs views
- incidents `feeds` Review queue

Use when:
- the relationship is data-flow oriented

---

## `informs`
Meaning:
The source item helps shape the target, but does not hard-block it.

Example:
- ClawText operational learnings `inform` policy / routing decisions

Use when:
- guidance matters, but execution could still proceed without it

---

## `related_to`
Meaning:
The items are connected conceptually, but not in a strong execution dependency.

Use when:
- you want visibility of association without implying critical path

---

## `blocked_by`
Meaning:
Readable inverse form of `blocks`.

Example:
- Build Tasks board shell is `blocked_by` Define ClawTask domain model

Implementation note:
You may store only one side in data and derive the inverse in the UI.

---

## Blocker object vs dependency link

### Use a dependency when:
- the relationship is between two known items

### Use a blocker object when:
- the obstacle is real but not neatly another work item

Examples:
- missing credentials
- waiting on external system
- tooling broken
- decision not yet made

---

## Recommended minimal schema

```json
{
  "id": "dep_clawtask_to_projects_shell",
  "fromRef": "task_build_projects_page_shell",
  "toRef": "task_define_clawtask_model_v0",
  "kind": "requires",
  "note": "Projects shell depends on stable taskboard model"
}
```

---

## Critical path guidance

Treat these kinds as critical-path relevant:
- `requires`
- `blocks`
- `blocked_by`

Treat these as non-critical-path by default:
- `feeds`
- `informs`
- `related_to`

---

## Visualization recommendation

### In board/detail views
Show dependencies grouped as:
- Requires
- Blocking
- Fed by / Feeds
- Related

### In summary views
Only show:
- hard blockers
- critical path dependencies

Do not flood summary views with weak links.

---

## Recommendation

Use these dependency kinds for Milestone 1.
Do not add more relationship types until a real modeling gap appears.
