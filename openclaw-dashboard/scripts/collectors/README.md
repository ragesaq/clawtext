# ClawDash Collector Stubs

These scripts update ClawDash's JSON snapshot files:

- `public/data/ops-metrics.json`
- `public/data/sidebar-usage.json`

## Commands

```bash
npm run collect:openai-plus
npm run collect:copilot
npm run collect:openrouter
npm run collect:usage
```

## Current behavior

### OpenAI / ChatGPT Plus
- reads provider/auth health from `openclaw models --status-json`
- supports env overrides for 5h/weekly quota percentages
- updates sidebar OpenAI totals from env overrides when provided

### GitHub Copilot
- reads provider/auth health from `openclaw models --status-json`
- supports env overrides for premium message usage and accept-rate/chat stats

### OpenRouter
- reads provider/auth health from `openclaw models --status-json`
- if `OPENROUTER_MANAGEMENT_KEY` is set, attempts to fetch credit/balance data from OpenRouter
- otherwise falls back to env overrides / existing snapshot values

## Example env overrides

```bash
export OPENAI_PLUS_5H_USED_PCT=64
export OPENAI_PLUS_WEEK_USED_PCT=43
export COPILOT_PREMIUM_USED=371
export COPILOT_PREMIUM_LIMIT=1500
export OPENROUTER_MANAGEMENT_KEY=...
npm run collect:usage
```

## Important note

`openclaw models --status-json` currently provides real provider/auth state, but does **not** appear to expose the ChatGPT Plus 5-hour / weekly percentage windows directly. Those remain env-fed until we identify a better source.
