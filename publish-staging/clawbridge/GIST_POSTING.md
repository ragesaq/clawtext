# ClawBridge Gist Posting

Use this when you want to share a handoff packet outside the repo.

## 1) Generate artifacts

Run your normal extract command first (dual mode recommended).

## 2) Post the 3 files as a gist

```bash
gh gist create \
  docs/handoffs/CLAWBRIDGE_SHORT_<timestamp>.md \
  docs/handoffs/CLAWBRIDGE_FULL_<timestamp>.md \
  docs/bootstrap/NEXT_AGENT_BOOTSTRAP_CLAWBRIDGE_<timestamp>.md \
  -d "ClawBridge handoff packet - <project> - <date UTC>"
```

Default is secret gist. Add `--public` only if you want a public gist.

## 3) Quick safety pass (30s)

- No API keys/tokens/secrets
- No private hostnames/internal endpoints
- No sensitive personal or private project data

## 4) Share the gist URL

Post the resulting URL in your destination thread/forum/task.
