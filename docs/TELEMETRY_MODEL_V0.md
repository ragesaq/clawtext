# Telemetry Model v0

**Date:** 2026-03-11  
**Status:** Draft v0

---

## Purpose

Define the quantitative model for long-lived operational stats used by:
- ClawMon
- Grafana / Prometheus
- ClawDash Health
- ClawDash Costs / Usage
- Policy / routing decisions
- incident trend analysis

Telemetry is the long-lived quantitative truth.
It is a sibling of memory/learning, not a replacement for it.

---

## Core telemetry domains

## 1. Provider / Model telemetry
Track:
- request count
- success/failure count
- latency
- retries
- fallback count
- token usage
- cost
- invalid output rate
- rate-limit frequency

### Recommended dimensions
- provider
- model
- endpoint
- task category
- surface
- time window

---

## 2. Server / host telemetry
Track on luminous:
- CPU usage
- memory usage
- disk usage
- disk I/O
- network I/O
- load average
- service uptime
- gateway health

### Recommended dimensions
- host
- service
- mount/device
- network interface

---

## 3. Queue / event telemetry
Track:
- queue depth
- age of oldest event
- enqueue rate
- dequeue rate
- dedupe/collapse rate
- dropped events
- backlog spikes

### Recommended dimensions
- queue name
- priority
- event domain

---

## 4. Incident telemetry
Track:
- incidents by class
- incidents by severity
- time to classify
- time to resolve
- retry success rate
- fallback success rate
- recurrence counts

### Recommended dimensions
- incidentClass
- severity
- provider
- model
- component
- surface

---

## 5. Memory / learning telemetry
Track:
- extraction count
- extraction success/failure
- cluster count
- cluster rebuild duration
- rag injection count
- rag confidence
- promoted learnings count
- operational pattern count

### Recommended dimensions
- project
- memory lane
- cluster id
- source type

---

## 6. ClawTask / workflow telemetry
Track:
- tasks created/completed
- cycle time
- blocked counts
- overdue counts
- milestone completion rate
- active work by product/lane

### Recommended dimensions
- product
- lane
- owner
- priority
- task type

---

## 7. Cost / efficiency telemetry
Track:
- spend by provider/model
- cost per successful request
- cost per token
- cost per task category
- clawsaver avoided calls
- estimated savings

### Recommended dimensions
- provider
- model
- task category
- surface
- product

---

## Canonical entities

## `ProviderMetric`
```json
{
  "provider": "openrouter",
  "model": "gpt-5.4",
  "window": "5m",
  "requestCount": 120,
  "successCount": 112,
  "failureCount": 8,
  "p50LatencyMs": 840,
  "p95LatencyMs": 3200,
  "inputTokens": 220000,
  "outputTokens": 96000,
  "costUsd": 14.21,
  "fallbackCount": 6
}
```

## `HostMetric`
```json
{
  "host": "luminous",
  "window": "1m",
  "cpuPct": 42.1,
  "memoryPct": 67.4,
  "diskPct": 58.0,
  "load1": 1.82,
  "netInBytes": 124000,
  "netOutBytes": 98000
}
```

## `IncidentMetric`
```json
{
  "incidentClass": "provider.timeout",
  "window": "1h",
  "count": 14,
  "retrySuccessRate": 0.57,
  "fallbackSuccessRate": 0.86,
  "meanResolveSeconds": 41
}
```

---

## Storage guidance

## Best-fit stack
- **Prometheus** for metrics collection/query
- **Grafana** for dashboards and alerting views
- optional long-term rollups in SQL/object storage later

## Why Prometheus/Grafana fits
- great for server + service metrics
- strong time-series query model
- easy alerts
- easy Grafana embedding inside ClawDash

---

## Recommended metric categories for Prometheus

### Counters
Monotonic counts.
Examples:
- requests total
- errors total
- incidents total
- retries total
- tasks completed total

### Gauges
Current state values.
Examples:
- active sessions
- queue depth
- CPU %
- memory %
- blocked tasks count

### Histograms
Latency/size distributions.
Examples:
- provider latency
- incident resolution duration
- cluster rebuild duration
- task cycle time

---

## v0 dashboards to support

### Health dashboard
- provider success rate
- latency percentiles
- queue backlog
- server pressure
- incident volume

### Costs / Usage dashboard
- spend over time
- tokens by provider/model
- clawsaver savings
- fallback cost impact

### Memory dashboard
- extraction runs
- cluster rebuilds
- rag confidence trend
- promoted learnings

### Workflow dashboard
- tasks by status
- blocked trend
- cycle time
- milestone burnup

---

## Policy / routing use cases

Telemetry should eventually feed routing decisions such as:
- prefer model A for planning if quality remains high and latency acceptable
- avoid provider B when rate-limit incidents spike
- shift embeddings to cheapest fast provider
- prefer lower-cost model when task category does not need premium reasoning

---

## Alert candidates

- provider error rate above threshold
- p95 latency spike
- server memory pressure sustained
- queue backlog sustained
- daily cost budget exceeded
- cluster quality or rag confidence drops
- blocked tasks above threshold

---

## Recommendation

Start with Prometheus-native metrics for:
- provider/model performance
- luminous server health
- queue depth
- incident volume
- ClawText memory pipeline health
- ClawTask workflow counts

Then build ClawDash surfaces on top of those metrics rather than inventing a separate analytics stack too early.
