# ClawBridge Context Bleed Report — 2026-03-12

## Summary
The apparent context bleed was **not** caused by the generated ClawBridge continuity artifacts.

It was caused by **thread session bootstrap inheriting unrelated parent-session history** from the ai-projects forum channel.

## What happened
The Discord thread session for:
- `PR #43063 on OpenClaw 2026.3.11 - What Changed and What Still Holds`
- channel/thread id: `1481536941303271495`

was created with:
- `forkedFromParent: true`
- `parentSession: /home/lumadmin/.openclaw/agents/channel-mini/sessions/42b3c597-a9dd-49c5-bab9-f6e2449368e1.jsonl`

That parent session is the **forum parent channel**:
- ai-projects forum channel id: `1475021817168134144`

As a result, the new thread transcript begins with unrelated assistant posts copied in from the parent channel session.

## Evidence
The thread transcript file:
- `/home/lumadmin/.openclaw/agents/channel-mini/sessions/2026-03-12T06-26-48-666Z_67da2cb2-8036-4eb6-bf93-ae202618ef0c.jsonl`

starts with three unrelated assistant messages dated **before** the user message that created this thread context:

1. `2026-03-03T18:19:20.312Z` — ClawSaver publish post
2. `2026-03-06T01:08:37.770Z` — Planner/worker architecture post
3. `2026-03-06T05:30:05.672Z` — Lumbot voice command PRD

Only after those inherited messages does the actual user message for this thread appear:
- `2026-03-12T06:26:49.551Z`

That means the contamination existed in the thread session history **before** the current ClawBridge extract message was processed.

## What did NOT happen
The generated continuity artifacts do **not** contain those unrelated topics. These files are clean and correctly scoped to PR #43063:
- `docs/handoffs/CLAWBRIDGE_SHORT_2026-03-12_0618.md`
- `docs/handoffs/CLAWBRIDGE_FULL_2026-03-12_0618.md`
- `docs/bootstrap/NEXT_AGENT_BOOTSTRAP_CLAWBRIDGE_2026-03-12_0618.md`

They consistently describe:
- PR #43063
- provider-usage / billing-surface parity
- OpenClaw 2026.3.11 drift
- rebase-and-refresh next steps

## Root cause
Most likely root cause:
- new Discord forum threads are being initialized by forking from the **forum parent channel** session
- that parent session contains old assistant-authored forum posts
- inherited parent history then becomes available as context for the child thread

So this is primarily a **session inheritance / routing bootstrap bug**, not a ClawBridge extraction bug.

## Cleanup status
Cleaned interpretation:
- treat the inherited parent messages as contamination
- treat the three ClawBridge continuity artifacts as the authoritative handoff
- do not use the inherited thread transcript history as reliable prior context for this thread

## Recommended fix
1. Do **not** fork new forum thread sessions from the parent forum channel by default.
2. If parent forking is required, filter inherited history to:
   - system/bootstrap only, or
   - the triggering user message chain only
3. At minimum, exclude old assistant-authored parent-channel posts from child-thread bootstrap context.
4. For this specific thread, prefer the generated handoff artifacts over raw inherited transcript context.

## Short conclusion
This was a **parent-session bleed** problem.
The ClawBridge handoff itself is clean.
