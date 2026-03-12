# Prometheus Metrics Spec v0

**Date:** 2026-03-11  
**Status:** Draft v0  
**Purpose:** Define the initial Prometheus metric families and naming conventions for OpenClaw / ClawDash / ClawMon.

---

## Goals

This spec turns the telemetry model into concrete metric names that can be emitted from the gateway and related services.

It should support:
- ClawDash Health
- ClawDash Costs / Usage
- ClawMon dashboards
- Grafana panels
- alerting
- policy/routing decisions later

---

## Naming rules

Use standard Prometheus conventions:
- lowercase
- underscore-separated
- unit suffixes where appropriate
- `_total` for counters
- `_seconds` for durations
- `_bytes` for byte sizes
- `_ratio` only for 0.0–1.0 values

Prefix all app metrics with:
- `openclaw_`

---

## Labels

Use labels conservatively and consistently.

Recommended common labels:
- `provider`
- `model`
- `surface`
- `component`
- `host`
- `queue`
- `incident_class`
- `severity`
- `product`
- `lane`
- `task_type`
- `status`

Avoid high-cardinality labels like:
- raw prompt text
- session transcript fragments
- unique user message text
- unbounded IDs unless truly needed

---

## Metric families

## 1. Provider / model request metrics

### Counter
- `openclaw_provider_requests_total`
  - labels: `provider`, `model`, `surface`, `status`
  - status: `started | succeeded | failed | fallback`

- `openclaw_provider_retries_total`
  - labels: `provider`, `model`, `reason`

- `openclaw_provider_fallbacks_total`
  - labels: `from_provider`, `from_model`, `to_provider`, `to_model`, `reason`

- `openclaw_provider_tokens_input_total`
  - labels: `provider`, `model`

- `openclaw_provider_tokens_output_total`
  - labels: `provider`, `model`

### Histogram
- `openclaw_provider_latency_seconds`
  - labels: `provider`, `model`, `surface`
  - buckets: `0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 40`

### Gauge
- `openclaw_provider_cost_usd`
  - labels: `provider`, `model`, `window`
  - note: if possible prefer derived queries from counters/rollups over direct gauges

---

## 2. Incident / triage metrics

### Counter
- `openclaw_incidents_total`
  - labels: `incident_class`, `severity`, `component`, `surface`

- `openclaw_incident_retries_total`
  - labels: `incident_class`, `outcome`
  - outcome: `success | failed`

- `openclaw_incident_fallbacks_total`
  - labels: `incident_class`, `outcome`

### Gauge
- `openclaw_incidents_open`
  - labels: `incident_class`, `severity`

### Histogram
- `openclaw_incident_resolution_seconds`
  - labels: `incident_class`, `severity`
  - buckets: `1, 5, 10, 30, 60, 120, 300, 900, 1800, 3600`

- `openclaw_incident_classification_seconds`
  - labels: `incident_class`

---

## 3. Queue / event bus metrics

### Gauge
- `openclaw_queue_depth`
  - labels: `queue`, `priority`

- `openclaw_queue_oldest_event_age_seconds`
  - labels: `queue`

### Counter
- `openclaw_queue_events_total`
  - labels: `queue`, `direction`, `event_domain`
  - direction: `enqueued | dequeued | dropped | deduped`

### Histogram
- `openclaw_queue_processing_seconds`
  - labels: `queue`, `event_domain`
  - buckets: `0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10`

---

## 4. Memory / learning metrics

### Counter
- `openclaw_memory_extractions_total`
  - labels: `status`, `source_type`
  - status: `started | succeeded | failed`

- `openclaw_memory_promotions_total`
  - labels: `target`, `kind`

- `openclaw_memory_rag_injections_total`
  - labels: `project`, `status`

### Gauge
- `openclaw_memory_clusters`
  - labels: `project`

- `openclaw_memory_rag_confidence`
  - labels: `project`

- `openclaw_memory_buffer_messages`
  - labels: `buffer`

### Histogram
- `openclaw_memory_cluster_rebuild_seconds`
  - labels: `project`
  - buckets: `0.1, 0.5, 1, 2, 5, 10, 30, 60, 120`

---

## 5. Session / agent metrics

### Gauge
- `openclaw_sessions_active`
  - labels: `session_type`, `surface`
  - session_type: `main | subagent | cron | acp`

- `openclaw_agents_running`
  - labels: `runtime`, `status`

### Counter
- `openclaw_sessions_total`
  - labels: `session_type`, `surface`, `status`
  - status: `started | ended | killed | failed`

- `openclaw_agent_tasks_total`
  - labels: `runtime`, `status`
  - status: `started | completed | failed | killed`

### Histogram
- `openclaw_session_duration_seconds`
  - labels: `session_type`, `surface`
  - buckets: `1, 10, 30, 60, 300, 900, 1800, 3600, 7200, 14400`

---

## 6. Workflow / ClawTask metrics

### Gauge
- `openclaw_tasks_open`
  - labels: `status`, `priority`, `product`, `lane`

- `openclaw_tasks_blocked`
  - labels: `priority`, `product`, `lane`

- `openclaw_milestones_open`
  - labels: `product`, `status`

### Counter
- `openclaw_tasks_total`
  - labels: `status`, `priority`, `product`, `task_type`

- `openclaw_dependencies_total`
  - labels: `kind`, `product`

### Histogram
- `openclaw_task_cycle_time_seconds`
  - labels: `product`, `lane`, `priority`
  - buckets: `60, 300, 900, 1800, 3600, 14400, 86400, 604800`

---

## 7. Cost / efficiency metrics

### Counter
- `openclaw_cost_usd_total`
  - labels: `provider`, `model`, `surface`

- `openclaw_clawsaver_calls_saved_total`
  - labels: `surface`

- `openclaw_clawsaver_batches_total`
  - labels: `surface`

### Gauge
- `openclaw_clawsaver_savings_ratio`
  - labels: `surface`, `window`

- `openclaw_cost_per_successful_request_usd`
  - labels: `provider`, `model`, `window`

---

## 8. Host / server metrics

Most host metrics should come from **node_exporter**, not custom app metrics.

Examples provided by node_exporter:
- `node_cpu_seconds_total`
- `node_memory_MemAvailable_bytes`
- `node_filesystem_avail_bytes`
- `node_load1`
- `node_network_receive_bytes_total`

### OpenClaw-specific host/service gauge additions
- `openclaw_gateway_up`
  - labels: `host`
  - value: `0 | 1`

- `openclaw_hooks_enabled`
  - labels: `host`

- `openclaw_cron_jobs_enabled`
  - labels: `host`

---

## Suggested first dashboards

## Health
Use:
- `openclaw_provider_requests_total`
- `openclaw_provider_latency_seconds`
- `openclaw_incidents_total`
- `openclaw_incidents_open`
- `openclaw_queue_depth`
- node_exporter CPU/memory/load metrics

## Costs / Usage
Use:
- `openclaw_cost_usd_total`
- `openclaw_provider_tokens_input_total`
- `openclaw_provider_tokens_output_total`
- `openclaw_clawsaver_calls_saved_total`
- `openclaw_clawsaver_savings_ratio`

## Memory
Use:
- `openclaw_memory_extractions_total`
- `openclaw_memory_clusters`
- `openclaw_memory_cluster_rebuild_seconds`
- `openclaw_memory_rag_confidence`

## Tasks / Workflow
Use:
- `openclaw_tasks_open`
- `openclaw_tasks_blocked`
- `openclaw_task_cycle_time_seconds`
- `openclaw_milestones_open`

---

## Good PromQL examples

### Provider success rate
```promql
sum(rate(openclaw_provider_requests_total{status="succeeded"}[5m])) by (provider, model)
/
sum(rate(openclaw_provider_requests_total[5m])) by (provider, model)
```

### P95 latency
```promql
histogram_quantile(0.95, sum(rate(openclaw_provider_latency_seconds_bucket[5m])) by (le, provider, model))
```

### Open incidents by class
```promql
sum(openclaw_incidents_open) by (incident_class, severity)
```

### Queue backlog
```promql
sum(openclaw_queue_depth) by (queue)
```

### Blocked tasks by product
```promql
sum(openclaw_tasks_blocked) by (product)
```

---

## Implementation order

### First wave
1. `openclaw_provider_requests_total`
2. `openclaw_provider_latency_seconds`
3. `openclaw_incidents_total`
4. `openclaw_incidents_open`
5. `openclaw_queue_depth`
6. `openclaw_cost_usd_total`
7. `openclaw_sessions_active`
8. `openclaw_memory_extractions_total`
9. `openclaw_memory_rag_confidence`
10. `openclaw_tasks_open`

### Second wave
- fallback/retry metrics
- task cycle time
- cluster rebuild duration
- clawsaver efficiency
- agent task metrics

---

## Recommendation

Start with a **small, stable first wave** and get it into Prometheus/Grafana quickly.
Do not try to instrument every possible metric before the first useful dashboard exists.
