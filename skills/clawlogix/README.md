# ClawLogix (internal MVP)

Operational control and safety orchestration for OpenClaw restarts.

## MVP guarantees
- Pre-restart announcement
- Post-restart back-online announcement
- Drain until idle by default
- Approval-gated restarts
- Emergency detection that pauses new work
- Append-only request/incident ledger

## Status
Internal embedded build (not published).

## Current capabilities
- Persistent request store (`skills/clawlogix/.state/requests.json`)
- Persistent incident store (`skills/clawlogix/.state/incidents.json`)
- Operator allowlist (policy: `approval.operators`)
- Force mode from policy (`single_operator` or `two_person`)
- Hybrid adapter (CLI-first with safe fallbacks)
- Event envelope emission (`memory/operational/events.jsonl`) with v0 schema validation

## Adapter runtime
By default `run restart ...` uses the hybrid adapter:
- tries `openclaw` CLI surfaces first
- falls back to console announcements where no stable surface exists

Optional env vars:
- `CLAWLOGIX_ADAPTER=noop` (force noop adapter for testing)
- `CLAWLOGIX_MAIN_SESSION_KEY=<sessionKey>` (send main announcements via CLI)
- `CLAWLOGIX_ORIGIN_SESSION_KEY=<sessionKey>` (send origin announcements via CLI)
- `CLAWLOGIX_WORKSPACE_ROOT=/home/.../.openclaw/workspace` (path override)
- `CLAWLOGIX_ENABLE_REAL_RESTART=1` (opt-in to real `openclaw gateway restart`; default is dry-run)

## Build
```bash
cd skills/clawlogix
npm install
npm run build
```

## Local CLI smoke
```bash
node dist/main.js "request restart reason=\"apply config\" urgency=normal"
node dist/main.js "restart list"
```
