# Usage Collector Contract v0

**Date:** 2026-03-11  
**Status:** Draft v0  
**Purpose:** Define the non-LLM cron-fed data contract for ClawDash usage, quota, provider health, and cost surfaces.

---

## Goal

Allow simple collectors to write JSON snapshots that ClawDash can read without needing an LLM, a complex backend, or direct provider SDKs inside the dashboard.

This contract is for:
- OpenAI / ChatGPT Plus usage
- GitHub Copilot usage
- OpenRouter usage / spend / health
- later provider additions

---

## Design principles

- **collector writes JSON**
- **dashboard reads JSON**
- no provider secrets in the frontend
- cron-friendly
- replaceable later with API/db/Grafana sources
- same surface can start from snapshots and later upgrade to live backends

---

## Recommended file layout

```text
public/data/
  ops-metrics.json
  sidebar-usage.json
```

### Suggested future collector workspace
```text
runtime/clawdash/
  collectors/
  output/
    ops-metrics.json
    sidebar-usage.json
```

Then deployment/sync step can copy or expose those files to ClawDash.

---

## Collector cadence

Recommended first-pass cron frequencies:

- **OpenAI / ChatGPT Plus usage**: every 10–15 min
- **GitHub Copilot usage**: every 10–15 min
- **OpenRouter usage / health**: every 5–10 min
- **combined snapshot build**: every 5–15 min

These are lightweight enough for normal ops and frequent enough for dashboard usefulness.

---

## Primary aggregate file

### `ops-metrics.json`

This is the main dashboard-facing snapshot.

## Required top-level shape

```json
{
  "source": "collector",
  "updatedAt": "2026-03-11T07:20:00Z",
  "providers": [],
  "openaiPlus": {},
  "copilot": {},
  "costs": {},
  "notes": "optional"
}
```

---

## Provider objects

Used by Health + Costs surfaces.

```json
{
  "id": "openrouter",
  "name": "OpenRouter",
  "status": "healthy",
  "latencyMs": 910,
  "errorRatePct": 0.4,
  "throughputLabel": "api metered",
  "trend": [71, 69, 73, 68, 65, 61, 58]
}
```

### Fields
- `id` — stable provider key
- `name` — human label
- `status` — `healthy | degraded | down`
- `latencyMs` — current or recent average latency
- `errorRatePct` — recent error rate percent
- `throughputLabel` — short label for the provider’s usage mode
- `trend[]` — recent trend values for mini-graphs

---

## OpenAI / ChatGPT Plus block

This represents subscription/quota-style tracking.

```json
{
  "plan": "ChatGPT Plus",
  "fiveHourWindow": {
    "usedPct": 64,
    "hoursElapsed": 3.2,
    "historyPct": [18, 24, 31, 39, 48, 57, 64]
  },
  "weeklyWindow": {
    "usedPct": 43,
    "daysElapsed": 2.3,
    "historyPct": [12, 16, 21, 28, 34, 39, 43]
  }
}
```

### Notes
- We are intentionally modeling this as **quota windows**, not spend
- If the upstream source only gives percentages, that is fine
- Trend estimates can be derived from `% used / time elapsed`

---

## GitHub Copilot block

This represents monthly premium-message usage.

```json
{
  "plan": "GitHub Copilot",
  "monthlyPremiumMessages": {
    "used": 371,
    "limit": 1500,
    "dayOfMonth": 11,
    "historyUsed": [210, 238, 267, 289, 318, 347, 371]
  },
  "chatRequestsToday": 42,
  "acceptRate": 0.37
}
```

### Notes
- `used` + `limit` supports remaining-cap calculation
- `dayOfMonth` allows rough pace estimates
- `acceptRate` is useful but optional if hard to collect reliably

---

## Costs block

This covers metered providers and efficiency layers.

```json
{
  "meteredApis": {
    "todayUsd": 9.42,
    "weekUsd": 36.81,
    "trendUsd": [3.9, 4.7, 5.6, 6.1, 7.4, 8.5, 9.42]
  },
  "clawsaver": {
    "callsSaved": 247,
    "savingsRatio": 0.28,
    "trendPct": [19, 21, 22, 24, 25, 27, 28]
  }
}
```

---

## Sidebar usage file

### `sidebar-usage.json`

A slim subset optimized for frequent refresh in the left rail.

```json
{
  "source": "collector",
  "updatedAt": "2026-03-11T07:20:00Z",
  "openai": {
    "window": "today",
    "requests": 148,
    "tokens": 482000,
    "costUsd": 9.42
  },
  "copilot": {
    "window": "today",
    "completions": 311,
    "acceptRate": 0.37,
    "chatRequests": 42
  }
}
```

This file should stay small and cheap to refresh.

---

## Collector responsibilities by provider

## 1. OpenAI / ChatGPT Plus collector

### Goal
Collect subscription quota usage and recent trend snapshots.

### Writes
- `openaiPlus.fiveHourWindow`
- `openaiPlus.weeklyWindow`
- provider row for `openai-plus`

### Good enough v0 sources
- manual scrape / exported usage summary
- authenticated local automation if available
- browser/session-assisted collector if needed

### Important
Do **not** put session cookies or tokens into dashboard-readable files.
Collectors should sanitize output down to metrics only.

---

## 2. GitHub Copilot collector

### Goal
Collect premium-message usage and chat/completion activity.

### Writes
- `copilot.monthlyPremiumMessages`
- `copilot.chatRequestsToday`
- `copilot.acceptRate`
- provider row for `github-copilot`

### Good enough v0 sources
- local scrape of usage page
- exported usage data
- CLI/browser-assisted collector

---

## 3. OpenRouter collector

### Goal
Collect metered API spend, latency/error shape, and provider trend data.

### Writes
- provider row for `openrouter`
- costs.meteredApis
- optional per-model detail later

### Good enough v0 sources
- gateway-side counters/rollups
- OpenRouter usage API if available
- Prometheus-derived summary exporter later

---

## Trend estimate rules

These are intentionally rough and useful, not pretending to be perfect forecasting.

### ChatGPT Plus
- estimate remaining time from `% used / elapsed window time`

### Copilot
- estimate remaining days from `used / current day-of-month`

### OpenRouter / metered APIs
- trend is more about spend slope and health, not hard “run out” unless a budget is configured

---

## Grafana relationship

Yes — these absolutely can become Grafana panels.

### Good split
- **ClawDash**: compact operator surface, decisions, summaries, quotas, board, docs
- **Grafana**: deeper time-series panels, comparison windows, alerting, historical trends

### Practical path
- keep these JSON collectors for the app right now
- later emit the same data or rollups into Prometheus/Grafana
- let ClawDash embed/select Grafana where it makes sense

So this is **not a dead-end**. It is a practical bridge.

---

## Recommended next implementation after this contract

1. create collector stubs/scripts for:
   - OpenAI Plus
   - GitHub Copilot
   - OpenRouter
2. write to the two JSON files above
3. optionally mirror key stats into Prometheus later
4. add Grafana panels for longer history once collectors stabilize

---

## Recommendation

Use the JSON snapshot contract first.
It is the fastest path to useful ClawDash surfaces while keeping the future Grafana path wide open.
