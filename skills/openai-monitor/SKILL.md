# OpenAI Codex Usage Monitor

Tracks token consumption and alerts when approaching quota limits.

## How it works

1. **Hooks into OpenClaw**: Monitors API calls to OpenAI Codex
2. **Logs usage**: Records token counts in `memory/openai-usage-log.jsonl`
3. **Calculates windows**: Tracks 5-hour (hourly) and 7-day (weekly) usage
4. **Alerts**: Sends Discord alerts when approaching thresholds

## Configuration

Edit `handler.js` CONFIG:
- `hourlyQuotaTokens`: Your hourly limit (default: 500k)
- `weeklyQuotaTokens`: Your weekly limit (default: 5M)
- Alert thresholds: 70% warning, 90% critical

## Manual check

```bash
node ~/.openclaw/workspace/skills/openai-monitor/handler.js
```

## Cron job

- **ID**: `openai-usage-monitor`
- **Schedule**: Every 30 minutes
- **Model**: Qwen (to avoid using Codex for monitoring)

## Files

- `memory/openai-usage-log.jsonl` - Raw usage data
- `memory/openai-monitor-state.json` - Monitor state

## Alert behavior

When quotas approach limits:
- **70%**: Warning alert to #general
- **90%**: Critical alert to #general
- Alerts include current usage and remaining quota
