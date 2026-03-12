---
name: codex-profiler
description: Combined Codex profile operations skill: usage checks + OAuth auth refresh for OpenAI Codex profiles via Telegram commands /codex_usage and /codex_auth.
---

This skill consolidates both scripts:
- `scripts/codex_usage.py` (usage/limits)
- `scripts/codex_auth.py` (OAuth start/finish + queued safe apply)

## Safe defaults
- Usage checks are read-only by default.
- Mutation paths require explicit confirmation and should use dry-run previews first.
- See `RISK.md` for allowed/denied operation boundaries.

## Commands
### Usage
- `/codex_usage` → selector (default / all / discovered profiles)
- `/codex_usage <profile>`
- `/codex_usage delete <profile>` (requires explicit confirmation; defaults to safe detach-only mode + backup)

### Auth
- `/codex_auth` → selector (profiles)
- `/codex_auth <profile>`
- `/codex_auth finish <profile> <callback_url>`

## UX requirements (cross-channel)
For `/codex_usage`, send immediate progress message first:
- "Running Codex usage checks now…"

For queued auth apply, warn before restart behavior:
- "Gateway restart will be performed by background apply job. Avoid long-running tasks."

### Interaction adapter
- If inline buttons are supported: use selector buttons.
- If inline buttons are not supported: use text fallback prompts.
- Apply duplicate-request suppression per user for ~20s.
- Never echo full callback URLs in responses.

## How to run
```bash
python3 skills/codex-profiler/scripts/codex_usage.py --profile all --timeout-sec 25 --retries 1 --debug
python3 skills/codex-profiler/scripts/codex_auth.py start --profile default
python3 skills/codex-profiler/scripts/codex_auth.py finish --profile default --callback-url "http://localhost:1455/auth/callback?code=...&state=..." --queue-apply
python3 skills/codex-profiler/scripts/codex_auth.py status
```

## Safety posture
- No remote shell execution (`curl|bash`, `wget|sh`) is allowed by this skill.
- No `sudo`/SSH/system-level host mutation commands are part of this skill path.
- Usage checks are restricted to trusted HTTPS endpoint host allowlist (`chatgpt.com`).
- Callback URLs and token material must be treated as sensitive and never echoed in full.

## Multi-account rotation guidance
When asked about running multiple Codex accounts/profiles, rotation policy, or fallback strategy, read:
- `references/multi-account-rotation.md`

Use the short template for quick chat answers and the deep-dive template for setup/troubleshooting requests.

## Notes
- Uses auth profiles at `~/.openclaw/agents/main/agent/auth-profiles.json` by default.
- Codex usage endpoint: `https://chatgpt.com/backend-api/wham/usage`.
- Usage script now surfaces `401` as `auth_not_accepted_by_usage_endpoint` with a clear hint, while still returning local profile health.
- Usage output now includes top-level `summary` + `suggested_user_message` for cleaner slash-command formatting.
- OAuth flow: OpenAI auth endpoints + localhost callback on port 1455.
- Codex CLI installation is not required for usage endpoint reads in this skill path.
