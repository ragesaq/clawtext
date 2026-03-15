---
name: clawlogix
description: "Operational restart control and safety orchestration for OpenClaw."
metadata:
  openclaw:
    emoji: "🛫"
---

# ClawLogix

ClawLogix enforces safe restart operations with:
- pre-restart announcement
- post-restart back-online confirmation
- drain-until-idle (no arbitrary timer)
- approval gates
- emergency incident containment (pause new work)
- append-only audit logs

## Commands

- `request restart reason="..." urgency=normal|urgent|emergency`
- `approve restart <reqId>`
- `deny restart <reqId> reason="..."`
- `force restart <reqId> confirm=FORCE`
- `run restart <reqId>`
- `restart status [reqId]`
- `restart list`

### Timeout decision commands
- `restart decision <reqId> wait-more`
- `restart decision <reqId> abort-stuck <runId|sessionId>`
- `restart decision <reqId> force confirm=FORCE`

### Incident + safety
- `incident list`
- `incident status <incidentId>`
- `incident explain <incidentId>`
- `incident ack <incidentId>`
- `incident resolve <incidentId>`
- `incident analyze file="/path/to/runtime-samples.json"`
- `safety status`
- `safety resume`

### Force mode
- `restart force-mode single_operator|two_person`
