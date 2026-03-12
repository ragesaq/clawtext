# Next-Agent Bootstrap — ClawBridge Extract

## Read these first
1. docs/handoffs/CLAWBRIDGE_FULL_2026-03-12_0559.md
2. docs/handoffs/CLAWBRIDGE_SHORT_2026-03-12_0559.md

## Current objective
Audit the current OpenClaw cron setup, explain why it is brittle or broken, document the redesign direction, then reset the scheduler to a clean slate before rebuilding.

## Already decided
- There are 7 currently active cron jobs in the live scheduler, spanning memory extraction, plugin reconcile, weekly maintenance, security audit, and a broken usage monitor.
- The current cron lane mixes valid isolated agentTurn jobs with at least one invalid isolated systemEvent job: openai-usage-monitor is already failing with isolated job requires payload.kind=agentTurn.
- Historical cron state shows a pattern of announce delivery failures, timeout-heavy background agents, duplicate experiment jobs, and long-lived operational drift instead of a curated scheduler.
- Some jobs are structurally fine but the overall scheduler is no longer trusted; the owner wants a full reset before a cleaner redesign.

## Still open
- What the minimum cron surface should be after reset: only essential memory extraction, rebuild, audit, and maybe one health/report lane.
- Whether future reporting should use explicit outbound delivery targets, main-session wake flows, or direct forum/thread delivery instead of older announce patterns.
- How to define job ownership, timeout budgets, and payload shape rules so isolated jobs cannot regress into invalid or ambiguous forms again.

## First action
Back up jobs.json before removal so the old scheduler can still be studied later.

## Avoid re-deriving
- Core platform pillar split and role boundaries.
- ClawBridge role as continuity + transfer layer.