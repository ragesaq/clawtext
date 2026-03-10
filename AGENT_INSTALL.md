# ClawText Agent Install / Activation

## Goal
Make ClawText actually live in OpenClaw, not just present on disk.

## 1. Canonical plugin path
ClawText should load from:
`~/.openclaw/workspace/skills/clawtext`

## 2. Required config
Confirm these settings in `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "load": {
      "paths": [
        "/home/lumadmin/.openclaw/skills/openclaw-foundry",
        "/home/lumadmin/.openclaw/workspace/skills/clawtext"
      ]
    },
    "allow": [
      "discord",
      "memory-core",
      "foundry-openclaw",
      "clawtext"
    ],
    "entries": {
      "clawtext": {
        "enabled": true
      }
    }
  }
}
```

## 3. When restart is required
Restart is required when:
- `plugins.load.paths` changes
- `plugins.allow` changes
- `plugins.entries.clawtext.enabled` changes
- loaded plugin code changes and you need the gateway to pick up the new runtime behavior

## 4. Verification
Run:
```bash
openclaw gateway status
openclaw plugins list
```

Expected:
- gateway running
- RPC probe ok
- `ClawText | clawtext | loaded`

## 5. Operationally relevant Discord settings currently in use
```json
{
  "streaming": "off",
  "historyLimit": 50,
  "replyToMode": "first",
  "threadBindings": {
    "enabled": true,
    "spawnSubagentSessions": true
  }
}
```

## 6. Ownership model for agents
- automatic: retrieval/capture/maintenance execution where safe
- agent-owned: review, promotion, ingest, maintenance orchestration
- user-discretion: approvals for review/promotions/cadence
- backend only: raw CLI maintenance plumbing
