/**
 * ClawText Reflect — Prometheus Metrics Export
 * 
 * Exposes reflect telemetry in Prometheus text exposition format.
 * Ready for scraping when Prometheus is deployed.
 * 
 * Usage:
 *   import { getPrometheusMetrics } from './prometheus';
 *   // Returns string in Prometheus text format
 *   const metrics = await getPrometheusMetrics();
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { ReflectTelemetryEntry } from './telemetry.js';

function getTelemetryPath(): string {
  const stateRoot = process.env.CLAWTEXT_STATE_ROOT || join(process.env.HOME || '', '.openclaw/workspace/state/clawtext/prod');
  return join(stateRoot, 'reflect', 'telemetry.jsonl');
}

interface HistogramBucket {
  le: number;
  count: number;
}

function buildHistogram(values: number[], buckets: number[]): HistogramBucket[] {
  return buckets.map(le => ({
    le,
    count: values.filter(v => v <= le).length,
  }));
}

/**
 * Generate Prometheus-compatible metrics from reflect telemetry
 */
export async function getPrometheusMetrics(): Promise<string> {
  const telemetryPath = getTelemetryPath();
  const lines: string[] = [];

  // Header
  lines.push('# ClawText Reflect Metrics');
  lines.push(`# Generated at ${new Date().toISOString()}`);
  lines.push('');

  if (!existsSync(telemetryPath)) {
    // No data yet — emit zero-value counters
    lines.push('# HELP clawtext_reflect_calls_total Total number of reflect calls');
    lines.push('# TYPE clawtext_reflect_calls_total counter');
    lines.push('clawtext_reflect_calls_total 0');
    lines.push('');
    return lines.join('\n');
  }

  const raw = await readFile(telemetryPath, 'utf-8');
  const entries: ReflectTelemetryEntry[] = [];
  for (const line of raw.trim().split('\n').filter(Boolean)) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip malformed
    }
  }

  if (entries.length === 0) {
    lines.push('# HELP clawtext_reflect_calls_total Total number of reflect calls');
    lines.push('# TYPE clawtext_reflect_calls_total counter');
    lines.push('clawtext_reflect_calls_total 0');
    lines.push('');
    return lines.join('\n');
  }

  // --- Counters ---

  lines.push('# HELP clawtext_reflect_calls_total Total number of reflect calls');
  lines.push('# TYPE clawtext_reflect_calls_total counter');
  lines.push(`clawtext_reflect_calls_total ${entries.length}`);
  lines.push('');

  const cacheHits = entries.filter(e => e.fromCache).length;
  lines.push('# HELP clawtext_reflect_cache_hits_total Total cache hits');
  lines.push('# TYPE clawtext_reflect_cache_hits_total counter');
  lines.push(`clawtext_reflect_cache_hits_total ${cacheHits}`);
  lines.push('');

  // Per-model counters
  const modelCounts: Record<string, number> = {};
  for (const e of entries) {
    modelCounts[e.model] = (modelCounts[e.model] || 0) + 1;
  }
  lines.push('# HELP clawtext_reflect_calls_by_model_total Reflect calls by model');
  lines.push('# TYPE clawtext_reflect_calls_by_model_total counter');
  for (const [model, count] of Object.entries(modelCounts)) {
    lines.push(`clawtext_reflect_calls_by_model_total{model="${model}"} ${count}`);
  }
  lines.push('');

  // --- Token counters ---

  const totalInput = entries.reduce((s, e) => s + e.inputTokensEstimate, 0);
  const totalOutput = entries.reduce((s, e) => s + e.outputTokensEstimate, 0);

  lines.push('# HELP clawtext_reflect_input_tokens_total Total estimated input tokens');
  lines.push('# TYPE clawtext_reflect_input_tokens_total counter');
  lines.push(`clawtext_reflect_input_tokens_total ${totalInput}`);
  lines.push('');

  lines.push('# HELP clawtext_reflect_output_tokens_total Total estimated output tokens');
  lines.push('# TYPE clawtext_reflect_output_tokens_total counter');
  lines.push(`clawtext_reflect_output_tokens_total ${totalOutput}`);
  lines.push('');

  // --- Cost ---

  const totalCost = entries.reduce((s, e) => s + e.costEstimateUsd, 0);
  lines.push('# HELP clawtext_reflect_cost_usd_total Estimated total cost in USD');
  lines.push('# TYPE clawtext_reflect_cost_usd_total counter');
  lines.push(`clawtext_reflect_cost_usd_total ${totalCost.toFixed(6)}`);
  lines.push('');

  // --- Latency histogram ---

  const latencies = entries.filter(e => !e.fromCache).map(e => e.latencyMs);
  const latencyBuckets = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
  const histogram = buildHistogram(latencies, latencyBuckets);
  const latencySum = latencies.reduce((s, v) => s + v, 0);

  lines.push('# HELP clawtext_reflect_latency_ms Reflect call latency in milliseconds');
  lines.push('# TYPE clawtext_reflect_latency_ms histogram');
  for (const bucket of histogram) {
    lines.push(`clawtext_reflect_latency_ms_bucket{le="${bucket.le}"} ${bucket.count}`);
  }
  lines.push(`clawtext_reflect_latency_ms_bucket{le="+Inf"} ${latencies.length}`);
  lines.push(`clawtext_reflect_latency_ms_sum ${latencySum}`);
  lines.push(`clawtext_reflect_latency_ms_count ${latencies.length}`);
  lines.push('');

  // --- Input token histogram ---

  const inputTokens = entries.map(e => e.inputTokensEstimate);
  const tokenBuckets = [25, 50, 100, 200, 500, 1000];
  const inputHist = buildHistogram(inputTokens, tokenBuckets);
  const inputSum = inputTokens.reduce((s, v) => s + v, 0);

  lines.push('# HELP clawtext_reflect_input_tokens Input tokens per reflect call');
  lines.push('# TYPE clawtext_reflect_input_tokens histogram');
  for (const bucket of inputHist) {
    lines.push(`clawtext_reflect_input_tokens_bucket{le="${bucket.le}"} ${bucket.count}`);
  }
  lines.push(`clawtext_reflect_input_tokens_bucket{le="+Inf"} ${inputTokens.length}`);
  lines.push(`clawtext_reflect_input_tokens_sum ${inputSum}`);
  lines.push(`clawtext_reflect_input_tokens_count ${inputTokens.length}`);
  lines.push('');

  // --- Output token histogram ---

  const outputTokens = entries.map(e => e.outputTokensEstimate);
  const outputHist = buildHistogram(outputTokens, tokenBuckets);
  const outputSum = outputTokens.reduce((s, v) => s + v, 0);

  lines.push('# HELP clawtext_reflect_output_tokens Output tokens per reflect call');
  lines.push('# TYPE clawtext_reflect_output_tokens histogram');
  for (const bucket of outputHist) {
    lines.push(`clawtext_reflect_output_tokens_bucket{le="${bucket.le}"} ${bucket.count}`);
  }
  lines.push(`clawtext_reflect_output_tokens_bucket{le="+Inf"} ${outputTokens.length}`);
  lines.push(`clawtext_reflect_output_tokens_sum ${outputSum}`);
  lines.push(`clawtext_reflect_output_tokens_count ${outputTokens.length}`);
  lines.push('');

  // --- Memories per call ---

  const memoryCounts = entries.map(e => e.memoriesCount);
  const memBuckets = [1, 2, 5, 10, 20];
  const memHist = buildHistogram(memoryCounts, memBuckets);
  const memSum = memoryCounts.reduce((s, v) => s + v, 0);

  lines.push('# HELP clawtext_reflect_memories_per_call Memories used per reflect call');
  lines.push('# TYPE clawtext_reflect_memories_per_call histogram');
  for (const bucket of memHist) {
    lines.push(`clawtext_reflect_memories_per_call_bucket{le="${bucket.le}"} ${bucket.count}`);
  }
  lines.push(`clawtext_reflect_memories_per_call_bucket{le="+Inf"} ${memoryCounts.length}`);
  lines.push(`clawtext_reflect_memories_per_call_sum ${memSum}`);
  lines.push(`clawtext_reflect_memories_per_call_count ${memoryCounts.length}`);
  lines.push('');

  return lines.join('\n');
}
