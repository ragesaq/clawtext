# OpenAI Codex Usage Monitor

Tracks your OpenAI Codex token consumption and alerts you when approaching quota limits.

## Why this exists

OpenAI OAuth accounts (ChatGPT Plus/Team) don't expose quota APIs. This monitor:
- Tracks actual token usage from OpenClaw sessions
- Estimates quota consumption
- Alerts you before hitting limits
- Provides usage history for analysis

## How it works

1. **Logs usage**: Every time OpenClaw uses OpenAI Codex, tokens are logged
2. **Calculates usage**: Sums tokens in 5-hour (hourly) and 7-day (weekly) windows
3. **Alerts**: Sends Discord alerts when approaching thresholds

## Configuration

Edit `CONFIG` in `handler.js`:
- `hourlyQuotaTokens`: Your hourly limit (default: 500k)
- `weeklyQuotaTokens`: Your weekly limit (default: 5M)
- Alert thresholds (default: 70% warning, 90% critical)

## Manual check

```bash
cd ~/.openclaw/workspace/skills/openai-monitor
node handler.js
```

## Auto-monitoring

Add a cron job to check every 30 minutes:
- Job ID: `openai-usage-monitor`
- Schedule: Every 30 minutes
- Alert channel: #general

## Files

- `~/.openclaw/workspace/memory/openai-usage-log.jsonl` - Raw usage logs
- `~/.openclaw/workspace/memory/openai-monitor-state.json` - Monitor state

## Usage

The monitor estimates quotas based on your actual consumption. Adjust the `CONFIG` values to match your actual plan limits.
