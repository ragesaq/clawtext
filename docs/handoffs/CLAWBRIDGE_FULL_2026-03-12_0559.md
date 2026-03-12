# ClawBridge Extract — Full Continuity Packet

## Why this handoff exists
Transfer active work into a focused lane without losing high-context continuity.

## Current objective
Audit the current OpenClaw cron setup, explain why it is brittle or broken, document the redesign direction, then reset the scheduler to a clean slate before rebuilding.

## Established decisions
- There are 7 currently active cron jobs in the live scheduler, spanning memory extraction, plugin reconcile, weekly maintenance, security audit, and a broken usage monitor.
- The current cron lane mixes valid isolated agentTurn jobs with at least one invalid isolated systemEvent job: openai-usage-monitor is already failing with isolated job requires payload.kind=agentTurn.
- Historical cron state shows a pattern of announce delivery failures, timeout-heavy background agents, duplicate experiment jobs, and long-lived operational drift instead of a curated scheduler.
- Some jobs are structurally fine but the overall scheduler is no longer trusted; the owner wants a full reset before a cleaner redesign.

## Open questions
- What the minimum cron surface should be after reset: only essential memory extraction, rebuild, audit, and maybe one health/report lane.
- Whether future reporting should use explicit outbound delivery targets, main-session wake flows, or direct forum/thread delivery instead of older announce patterns.
- How to define job ownership, timeout budgets, and payload shape rules so isolated jobs cannot regress into invalid or ambiguous forms again.

## Lane / product context
- **Product:** OpenClaw
- **Lane:** ai-projects
- **Source thread:** 1474997928056590339
- **Target forum:** 1475021817168134144

## Relevant artifacts
- docs/handoffs/CLAWBRIDGE_SHORT_2026-03-12_0559.md
- docs/handoffs/CLAWBRIDGE_FULL_2026-03-12_0559.md
- docs/bootstrap/NEXT_AGENT_BOOTSTRAP_CLAWBRIDGE_2026-03-12_0559.md

## Immediate next steps
1. Back up jobs.json before removal so the old scheduler can still be studied later.
2. Remove all current cron jobs from the live gateway store.
3. Redesign cron around fewer jobs, explicit agentTurn payloads, explicit delivery targets, and shorter timeout-bounded responsibilities.
4. Create a follow-up implementation thread for the rebuilt cron architecture once the scheduler is empty.

## What not to re-litigate
- Continuity and durable memory are distinct concerns.
- ClawBridge naming is final and should be used directly.