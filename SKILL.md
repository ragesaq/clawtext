# ClawText

Comprehensive memory + operational learning skill for OpenClaw.

## What it does
ClawText provides three integrated lanes:
1. **Working memory retrieval/injection**
2. **Knowledge/ingest workflows**
3. **Operational learning** for recurring failures, fixes, review, promotion, and maintenance

## Runtime role
ClawText runs as a **plugin/skill** loaded by OpenClaw and contributes:
- prompt-time memory injection
- prompt-time operational retrieval
- after-tool-call failure capture
- review/promotion/maintenance backend workflows

## Activation model
ClawText is complete only when all of the following are true:
- plugin path is discoverable
- plugin is allowed
- plugin is enabled
- gateway has been restarted when required
- verification confirms it is loaded

## Current canonical runtime path
`~/.openclaw/workspace/skills/clawtext`

## Required OpenClaw config shape
- `plugins.load.paths` includes `~/.openclaw/workspace/skills/clawtext`
- `plugins.allow` includes `clawtext`
- `plugins.entries.clawtext.enabled = true`

## Verification
Use:
```bash
openclaw plugins list
openclaw gateway status
```

Expected:
- `ClawText | clawtext | loaded`
- gateway running + RPC probe ok

## Ownership model
### Fully automatic
- capture hooks
- retrieval/injection gating
- runtime failure capture
- maintenance run execution once scheduled

### Agent-owned
- review packets
- promotion proposals
- ingest orchestration
- scheduled maintenance orchestration

### User-discretion gated
- approve/reject/defer candidates
- approve promotion into durable docs
- approve recurring review cadence when needed

### Backend/admin only
- raw operational CLI commands

## Restart note
Code changes to the loaded plugin path or plugin activation/config changes may require a gateway restart before behavior becomes live.
