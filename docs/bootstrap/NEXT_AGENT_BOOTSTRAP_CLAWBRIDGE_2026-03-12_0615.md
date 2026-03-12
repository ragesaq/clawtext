# Next-Agent Bootstrap — ClawBridge Extract

## Read these first
1. docs/handoffs/CLAWBRIDGE_FULL_2026-03-12_0615.md
2. docs/handoffs/CLAWBRIDGE_SHORT_2026-03-12_0615.md

## Current objective
Create a clean continuity post for the cron lane: what we were doing, what the owner asked for, what matters now, and which cron-shaped responsibilities are transitional and should eventually be replaced by ClawDash surfaces.

## Already decided
- We audited the live OpenClaw cron scheduler, found drift and structural breakage, backed up jobs.json, and then removed every active cron job from the live gateway store.
- The live scheduler had seven active jobs, but the lane was not trusted: there was at least one invalid isolated job shape, older announce-delivery failure history, timeout-heavy background patterns, and scheduler sprawl instead of a curated operational design.
- The owner explicitly asked for a full reset, a handoff post analyzing what was in cron and why it was broken, then a rebuild later from a cleaner design instead of patching the existing pile.
- OpenClaw was upgraded to 2026.3.11 during the same pass, and cron is now fully empty in the live scheduler.
- ClawDash is intended to become the top-level control surface for the ecosystem, including health, costs, coordination, and task/project visibility, so some cron-era reporting and operator-awareness flows are transitional rather than permanent architecture.

## Still open
- What the new minimum cron set should be after reset: only essential bounded jobs such as memory extraction, maintenance, and maybe one narrow audit/report lane.
- Which current needs should stay cron-based versus move into ClawDash surfaces like health, costs, status, coordination, and project/task visibility.
- How alerts and reporting should route in the future: explicit outbound delivery, direct forum delivery, or ClawDash views instead of old announce-heavy patterns.

## First action
Use this post as the new continuity anchor for cron redesign rather than reopening the old polluted scheduler state.

## Avoid re-deriving
- Core platform pillar split and role boundaries.
- ClawBridge role as continuity + transfer layer.