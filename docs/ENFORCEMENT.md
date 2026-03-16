# ClawText Enforcement

## Purpose
Define the minimum anti-drift controls for lifecycle-aware ClawText development.

## Required canonical docs
- `docs/NORTHSTAR.md`
- `docs/PRD.md`
- `docs/MILESTONES.md`
- `docs/POST_BRIEF.md`
- `docs/FLIGHT_CONTROL.md`

## Enforcement doctrine
- canonical docs outrank thread recency and latest implementation vibe
- significant product-definition changes must update PRD
- milestone-impacting work should update milestones and evidence state
- output/publication claims must reflect supported behavior and proof
- uncertain boundary or release-definition changes must escalate

## Merge / closure expectations
If work changes strategic truth, product definition, milestone truth, release claims, or execution policy, it should update one or more of:
- `docs/NORTHSTAR.md`
- `docs/PRD.md`
- `docs/MILESTONES.md`
- `docs/POST_BRIEF.md`
- `docs/FLIGHT_CONTROL.md`
- `docs/RETROFIT_REPORT.md`
- `docs/DECISIONS/*`

## Evidence standard
Major claims should be grounded in at least one of:
- merged artifact
- validation or test result
- milestone evidence
- documented dogfood / retrofit result
- decision record

## PRD schema expectation
PRD should use the minimum schema unless a documented reason exists to extend it.

## Change-routing expectation
Incoming guidance and new ideas should be classified before they mutate canonical truth.
