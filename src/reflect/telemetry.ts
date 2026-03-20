/**
 * ClawText Reflect Telemetry
 * 
 * Append-only JSONL log for every reflect call.
 * Tracks: input tokens, output tokens, latency, model, cache hits.
 * Designed for eventual ClawMon integration.
 */

import { appendFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export interface ReflectTelemetryEntry {
  timestamp: string;
  query: string;
  model: string;
  memoriesCount: number;
  inputChars: number;
  outputChars: number;
  inputTokensEstimate: number;
  outputTokensEstimate: number;
  latencyMs: number;
  fromCache: boolean;
  budget: string;
  trigger: string;
  costEstimateUsd: number;
}

export interface ReflectTelemetryStats {
  totalCalls: number;
  totalCacheHits: number;
  avgLatencyMs: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostEstimateUsd: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  modelBreakdown: Record<string, {
    calls: number;
    avgLatencyMs: number;
    totalTokens: number;
    totalCostUsd: number;
  }>;
}

// Rough token estimate: ~4 chars per token for English
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Cost per 1M tokens by model (input/output)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-haiku-4.5':   { input: 0.20, output: 1.00 },
  'claude-sonnet-4.6':  { input: 3.00, output: 15.00 },
  'claude-opus-4.6':    { input: 15.00, output: 75.00 },
  'gpt-5.4-nano':       { input: 0.20, output: 1.25 },
  'gpt-5.4-mini':       { input: 0.40, output: 1.60 },
  'gpt-4o':             { input: 2.50, output: 10.00 },
  'gpt-5.4':            { input: 5.00, output: 15.00 },
  'gemini-2.0-flash':   { input: 0.10, output: 0.40 },
  'gemini-2.5-flash':   { input: 0.15, output: 0.60 },
  'gemini-3-flash':     { input: 0.10, output: 0.40 },
  'deepseek-v3':        { input: 0.32, output: 0.89 },
  'deepseek-v3.2':      { input: 0.35, output: 0.95 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || { input: 1.00, output: 5.00 }; // fallback
  return (inputTokens * costs.input + outputTokens * costs.output) / 1_000_000;
}

function getTelemetryPath(): string {
  const stateRoot = process.env.CLAWTEXT_STATE_ROOT || join(process.env.HOME || '', '.openclaw/workspace/state/clawtext/prod');
  return join(stateRoot, 'reflect', 'telemetry.jsonl');
}

/**
 * Log a reflect call to the telemetry JSONL
 */
export async function logReflectCall(entry: {
  query: string;
  model: string;
  memoriesCount: number;
  inputText: string;
  outputText: string;
  latencyMs: number;
  fromCache: boolean;
  budget: string;
  trigger: string;
}): Promise<ReflectTelemetryEntry> {
  const telemetryPath = getTelemetryPath();
  const dir = join(telemetryPath, '..');
  
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  
  const inputTokens = estimateTokens(entry.inputText);
  const outputTokens = estimateTokens(entry.outputText);
  
  const record: ReflectTelemetryEntry = {
    timestamp: new Date().toISOString(),
    query: entry.query,
    model: entry.model,
    memoriesCount: entry.memoriesCount,
    inputChars: entry.inputText.length,
    outputChars: entry.outputText.length,
    inputTokensEstimate: inputTokens,
    outputTokensEstimate: outputTokens,
    latencyMs: entry.latencyMs,
    fromCache: entry.fromCache,
    budget: entry.budget,
    trigger: entry.trigger,
    costEstimateUsd: entry.fromCache ? 0 : estimateCost(entry.model, inputTokens, outputTokens),
  };
  
  await appendFile(telemetryPath, JSON.stringify(record) + '\n');
  
  return record;
}

/**
 * Load and aggregate telemetry stats
 */
export async function getReflectStats(options?: {
  since?: string;   // ISO date
  limit?: number;
}): Promise<ReflectTelemetryStats> {
  const telemetryPath = getTelemetryPath();
  
  const stats: ReflectTelemetryStats = {
    totalCalls: 0,
    totalCacheHits: 0,
    avgLatencyMs: 0,
    avgInputTokens: 0,
    avgOutputTokens: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostEstimateUsd: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    modelBreakdown: {},
  };
  
  if (!existsSync(telemetryPath)) return stats;
  
  const raw = await readFile(telemetryPath, 'utf-8');
  const lines = raw.trim().split('\n').filter(Boolean);
  
  let entries: ReflectTelemetryEntry[] = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as ReflectTelemetryEntry;
      if (options?.since && entry.timestamp < options.since) continue;
      entries.push(entry);
    } catch {
      // Skip malformed lines
    }
  }
  
  if (options?.limit) {
    entries = entries.slice(-options.limit);
  }
  
  if (entries.length === 0) return stats;
  
  const latencies: number[] = [];
  
  for (const entry of entries) {
    stats.totalCalls++;
    if (entry.fromCache) stats.totalCacheHits++;
    stats.totalInputTokens += entry.inputTokensEstimate;
    stats.totalOutputTokens += entry.outputTokensEstimate;
    stats.totalCostEstimateUsd += entry.costEstimateUsd;
    latencies.push(entry.latencyMs);
    
    // Model breakdown
    if (!stats.modelBreakdown[entry.model]) {
      stats.modelBreakdown[entry.model] = {
        calls: 0,
        avgLatencyMs: 0,
        totalTokens: 0,
        totalCostUsd: 0,
      };
    }
    const mb = stats.modelBreakdown[entry.model];
    mb.calls++;
    mb.totalTokens += entry.inputTokensEstimate + entry.outputTokensEstimate;
    mb.totalCostUsd += entry.costEstimateUsd;
  }
  
  stats.avgLatencyMs = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  stats.avgInputTokens = Math.round(stats.totalInputTokens / stats.totalCalls);
  stats.avgOutputTokens = Math.round(stats.totalOutputTokens / stats.totalCalls);
  
  // Percentiles
  latencies.sort((a, b) => a - b);
  stats.p50LatencyMs = latencies[Math.floor(latencies.length * 0.5)] || 0;
  stats.p95LatencyMs = latencies[Math.floor(latencies.length * 0.95)] || 0;
  
  // Model avg latency
  for (const model of Object.keys(stats.modelBreakdown)) {
    const mb = stats.modelBreakdown[model];
    const modelLatencies = entries
      .filter(e => e.model === model)
      .map(e => e.latencyMs);
    mb.avgLatencyMs = Math.round(modelLatencies.reduce((a, b) => a + b, 0) / modelLatencies.length);
  }
  
  return stats;
}
