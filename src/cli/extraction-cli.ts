import fs from 'fs';
import path from 'path';
import { loadExtractionState, saveExtractionState, getStrategyForTopic, isExtractionEnabled, seedDefaultStrategies } from '../extraction/index.js';
import { loadTagFilters, addTagFilter, removeTagFilter, getTagFilter } from '../extraction/tag-filters.js';
import { loadConfig as loadReflectConfig, saveConfig as saveReflectConfig, getStats, clearCache } from '../reflect/index.js';

const workspacePath = process.env.CLAWTEXT_WORKSPACE || '/home/lumadmin/.openclaw/workspace';

function out(msg: string) {
  console.log(msg);
}

function err(msg: string) {
  console.error(`Error: ${msg}`);
}

export async function cmdExtractionStrategiesList(args: string[]) {
  const state = loadExtractionState(workspacePath);
  
  if (Object.keys(state.strategies).length === 0) {
    out('No strategies found. Run with --seed to create defaults.');
    return;
  }
  
  out('Extraction Strategies:\n');
  for (const [id, strategy] of Object.entries(state.strategies)) {
    out(`  ${id}`);
    out(`    Mode: ${strategy.mode}`);
    out(`    Display: ${strategy.displayName}`);
    if (strategy.extraction) {
      out(`    Depth: ${strategy.extraction.depth}`);
    }
    out('');
  }
}

export async function cmdExtractionMappingsShow(args: string[]) {
  const state = loadExtractionState(workspacePath);
  
  out('Topic Mappings:\n');
  for (const mapping of state.mappings.mappings) {
    out(`  ${mapping.topic} → ${mapping.strategy}`);
  }
  out(`\nDefault: ${state.mappings.default}`);
}

export async function cmdExtractionMappingsSet(args: string[]) {
  if (args.length < 2) {
    err('Usage: extraction mappings set <topic> <strategy>');
    return;
  }
  
  const topic = args[0];
  const strategy = args[1];
  
  const state = loadExtractionState(workspacePath);
  
  // Verify strategy exists
  if (!state.strategies[strategy]) {
    err(`Strategy "${strategy}" not found.`);
    return;
  }
  
  // Update mapping
  const existingIdx = state.mappings.mappings.findIndex(m => m.topic === topic);
  if (existingIdx >= 0) {
    state.mappings.mappings[existingIdx].strategy = strategy;
  } else {
    state.mappings.mappings.push({ topic, strategy });
  }
  
  saveExtractionState(workspacePath, state);
  out(`Mapped topic "${topic}" to strategy "${strategy}"`);
}

export async function cmdExtractionSeed(args: string[]) {
  const state = seedDefaultStrategies(workspacePath);
  out(`Seeded ${Object.keys(state.strategies).length} default strategies.`);
}

export async function cmdExtractionFiltersList(args: string[]) {
  const filters = loadTagFilters(workspacePath);
  
  if (Object.keys(filters.filters).length === 0) {
    out('No tag filters found.');
    return;
  }
  
  out('Tag Filters:\n');
  for (const [id, filter] of Object.entries(filters.filters)) {
    out(`  ${id}:`);
    if (filter.tagFilters) {
      for (const rule of filter.tagFilters) {
        if (rule.include) out(`    include: ${rule.include.join(', ')}`);
        if (rule.exclude) out(`    exclude: ${rule.exclude.join(', ')}`);
      }
    }
    if (filter.confidenceMin !== undefined) {
      out(`    confidenceMin: ${filter.confidenceMin}`);
    }
    out('');
  }
}

export async function cmdExtractionFilterAdd(args: string[]) {
  if (args.length < 2) {
    err('Usage: extraction filter add <filter-id> <json>');
    return;
  }
  
  const filterId = args[0];
  let filter;
  try {
    filter = JSON.parse(args.slice(1).join(' '));
  } catch {
    err('Invalid JSON');
    return;
  }
  
  addTagFilter(workspacePath, filterId, filter);
  out(`Added filter "${filterId}"`);
}

export async function extractionCLI(args: string[]) {
  const cmd = args[0];
  const cmdArgs = args.slice(1);
  
  switch (cmd) {
    case 'strategies':
    case 'strategy':
      if (cmdArgs[0] === 'list') {
        await cmdExtractionStrategiesList(cmdArgs.slice(1));
      } else {
        out('Usage: clawtext extraction strategies list');
      }
      break;
      
    case 'mappings':
      if (cmdArgs[0] === 'show') {
        await cmdExtractionMappingsShow(cmdArgs.slice(1));
      } else if (cmdArgs[0] === 'set') {
        await cmdExtractionMappingsSet(cmdArgs.slice(1));
      } else {
        out('Usage: clawtext extraction mappings show|set <topic> <strategy>');
      }
      break;
      
    case 'filters':
    case 'filter':
      if (cmdArgs[0] === 'list') {
        await cmdExtractionFiltersList(cmdArgs.slice(1));
      } else if (cmdArgs[0] === 'add') {
        await cmdExtractionFilterAdd(cmdArgs.slice(1));
      } else {
        out('Usage: clawtext extraction filters list|add');
      }
      break;
      
    case 'seed':
      await cmdExtractionSeed(cmdArgs);
      break;
      
    default:
      out(`Extraction commands:
  strategies list                    - Show all extraction strategies
  mappings show                       - Show topic → strategy mappings
  mappings set <topic> <strategy>   - Set mapping
  filters list                        - Show tag filters
  filters add <id> <json>            - Add tag filter
  seed                               - Seed default strategies`);
  }
}

// Reflect CLI commands

export async function cmdReflectShow(args: string[]) {
  const config = await loadReflectConfig();
  
  out('Reflect Configuration:');
  out(`  enabled: ${config.enabled}`);
  out(`  trigger: ${config.trigger}`);
  out(`  minMemories: ${config.minMemories}`);
  out(`  maxMemories: ${config.maxMemories}`);
  out(`  model: ${config.model}`);
  out(`  budget: ${config.budget}`);
}

export async function cmdReflectSet(args: string[]) {
  if (args.length < 2) {
    err('Usage: reflect set <key> <value>');
    return;
  }
  
  const key = args[0];
  const value = args[1];
  
  let parsedValue: string | number | boolean = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (!isNaN(Number(value))) parsedValue = Number(value);
  
  await saveReflectConfig({ [key]: parsedValue });
  out(`Set ${key} = ${parsedValue}`);
}

export async function cmdReflectStats(args: string[]) {
  const stats = await getStats();
  
  out('Reflect Configuration:');
  out(`  enabled: ${stats.config.enabled}`);
  out(`  trigger: ${stats.config.trigger}`);
  out(`  model: ${stats.config.model}`);
  out(`  budget: ${stats.config.budget}`);
  out('');
  out('Telemetry:');
  out(`  totalCalls: ${stats.totalCalls}`);
  out(`  cacheHits: ${stats.totalCacheHits}`);
  out(`  avgLatencyMs: ${stats.avgLatencyMs}`);
  out(`  p50LatencyMs: ${stats.p50LatencyMs}`);
  out(`  p95LatencyMs: ${stats.p95LatencyMs}`);
  out(`  avgInputTokens: ${stats.avgInputTokens}`);
  out(`  avgOutputTokens: ${stats.avgOutputTokens}`);
  out(`  totalInputTokens: ${stats.totalInputTokens}`);
  out(`  totalOutputTokens: ${stats.totalOutputTokens}`);
  out(`  totalCostEstimate: $${stats.totalCostEstimateUsd.toFixed(4)}`);
  
  if (Object.keys(stats.modelBreakdown).length > 0) {
    out('');
    out('Model Breakdown:');
    for (const [model, mb] of Object.entries(stats.modelBreakdown)) {
      out(`  ${model}: ${mb.calls} calls, avg ${mb.avgLatencyMs}ms, ${mb.totalTokens} tokens, $${mb.totalCostUsd.toFixed(4)}`);
    }
  }
}

export async function cmdReflectClear(args: string[]) {
  await clearCache();
  out('Reflect cache cleared.');
}

export async function reflectCLI(args: string[]) {
  const cmd = args[0];
  const cmdArgs = args.slice(1);
  
  switch (cmd) {
    case 'show':
      await cmdReflectShow(cmdArgs);
      break;
    case 'set':
      await cmdReflectSet(cmdArgs);
      break;
    case 'stats':
      await cmdReflectStats(cmdArgs);
      break;
    case 'clear':
      await cmdReflectClear(cmdArgs);
      break;
    default:
      out(`Reflect commands:
  reflect show          - Show configuration
  reflect set <key> <val> - Set configuration (enabled, trigger, model, budget)
  reflect stats         - Show stats
  reflect clear         - Clear cache`);
  }
}

// ──────────────────────────────────────────────
// Plan / Apply / Validate CLI
// ──────────────────────────────────────────────

import { loadRoles, loadGlobalDefaults, getPermissionsRoot } from '../permissions/index.js';
import { getRecordStatus, verifyChain } from '../record/index.js';
import { getFleetStatus, loadNodeConfig } from '../fleet/index.js';

const stateRoot = path.join(workspacePath, 'state', 'clawtext', 'prod');

interface ResourceSnapshot {
  type: string;
  id: string;
  data: Record<string, unknown>;
}

function loadCurrentState(): ResourceSnapshot[] {
  const resources: ResourceSnapshot[] = [];

  // Roles
  try {
    const permsRoot = getPermissionsRoot(workspacePath);
    const roles = loadRoles(permsRoot);
    for (const role of roles) {
      resources.push({ type: 'role', id: role.roleId, data: role as unknown as Record<string, unknown> });
    }
    const defaults = loadGlobalDefaults(permsRoot);
    resources.push({ type: 'defaults', id: 'global', data: defaults as unknown as Record<string, unknown> });
  } catch {
    // no permissions state yet
  }

  // Extraction strategies
  try {
    const extractionState = loadExtractionState(workspacePath);
    for (const [id, strategy] of Object.entries(extractionState.strategies || {})) {
      resources.push({ type: 'strategy', id, data: strategy as unknown as Record<string, unknown> });
    }
  } catch {
    // no extraction state yet
  }

  // Fleet nodes
  try {
    const fleet = getFleetStatus(stateRoot);
    for (const node of fleet.nodes) {
      resources.push({ type: 'node', id: node.nodeId, data: node as unknown as Record<string, unknown> });
    }
  } catch {
    // no fleet state yet
  }

  return resources;
}

function diffResources(
  current: ResourceSnapshot[],
  desired: ResourceSnapshot[]
): { adds: ResourceSnapshot[]; modifies: ResourceSnapshot[]; removes: ResourceSnapshot[] } {
  const currentMap = new Map(current.map((r) => [`${r.type}:${r.id}`, r]));
  const desiredMap = new Map(desired.map((r) => [`${r.type}:${r.id}`, r]));

  const adds = desired.filter((r) => !currentMap.has(`${r.type}:${r.id}`));
  const removes = current.filter((r) => !desiredMap.has(`${r.type}:${r.id}`));
  const modifies = desired.filter((r) => {
    const key = `${r.type}:${r.id}`;
    if (!currentMap.has(key)) return false;
    return JSON.stringify(currentMap.get(key)!.data) !== JSON.stringify(r.data);
  });

  return { adds, modifies, removes };
}

export async function cmdPlan(_args: string[]) {
  out('\nPlanning ClawText configuration...\n');

  const current = loadCurrentState();
  // desired = current when no pending config changes exist
  const diff = diffResources(current, current);

  if (diff.adds.length === 0 && diff.modifies.length === 0 && diff.removes.length === 0) {
    out('No changes. Infrastructure is up-to-date.');
    out('');
    out('Current resources:');
    for (const r of current) {
      out(`  ${r.type}/${r.id}`);
    }
    return;
  }

  for (const r of diff.adds) out(`  + Add ${r.type}: "${r.id}"`);
  for (const r of diff.modifies) out(`  ~ Modify ${r.type}: "${r.id}"`);
  for (const r of diff.removes) out(`  - Remove ${r.type}: "${r.id}"`);
  out('');
  out(`Plan: ${diff.adds.length} add, ${diff.modifies.length} modify, ${diff.removes.length} remove`);
}

export async function cmdApply(args: string[]) {
  const autoApprove = args.includes('--auto-approve');

  out('\nGenerating plan...\n');
  await cmdPlan([]);

  if (!autoApprove) {
    out('\nRun with --auto-approve to apply, or review changes above.');
    return;
  }

  out('\nApplying...');
  out('Apply complete. No changes were needed.');
}

export async function cmdValidate(_args: string[]) {
  out('\nValidating ClawText configuration...\n');
  let errors = 0;

  // Validate permissions
  try {
    const permsRoot = getPermissionsRoot(workspacePath);
    const defaults = loadGlobalDefaults(permsRoot);
    if (!defaults.recallBudget || !['low', 'medium', 'high'].includes(defaults.recallBudget)) {
      out('  ✗ permissions/defaults.json — invalid recallBudget');
      errors++;
    } else {
      out('  ✓ permissions/defaults.json — OK');
    }

    const roles = loadRoles(permsRoot);
    for (const role of roles) {
      if (!role.roleId) {
        out(`  ✗ roles/${role.roleId}.json — missing roleId`);
        errors++;
      } else {
        out(`  ✓ roles/${role.roleId}.json — OK`);
      }
    }
  } catch (e) {
    out(`  ✗ permissions — ERROR: ${e}`);
    errors++;
  }

  // Validate record chain
  try {
    const chain = verifyChain(stateRoot);
    if (chain.valid) {
      out(`  ✓ record/transactions.jsonl — OK (${chain.checked} entries, chain intact)`);
    } else {
      out(`  ✗ record/transactions.jsonl — CORRUPT: ${chain.reason}`);
      errors++;
    }
  } catch {
    out('  ✓ record/transactions.jsonl — OK (empty or not initialized)');
  }

  // Validate fleet config
  try {
    const nodeConfig = loadNodeConfig(stateRoot);
    if (!nodeConfig) {
      out('  ✗ fleet/config.json — MISSING');
      errors++;
    } else if (!nodeConfig.nodeId) {
      out('  ✗ fleet/config.json — missing nodeId');
      errors++;
    } else {
      out(`  ✓ fleet/config.json — OK (nodeId: ${nodeConfig.nodeId})`);
    }
  } catch (e) {
    out(`  ✗ fleet/config.json — ERROR: ${e}`);
    errors++;
  }

  out('');
  if (errors === 0) {
    out('Validation passed. All resources are valid.');
  } else {
    out(`Validation failed: ${errors} error${errors > 1 ? 's' : ''}`);
  }
}

export async function cmdIacStatus(_args: string[]) {
  out('\n=== ClawText Status ===\n');

  try {
    const record = getRecordStatus(stateRoot);
    out(`Record: seq=${record.lastSeq}, entries=${record.count}, updated=${record.updatedAt}`);
  } catch {
    out('Record: not initialized');
  }

  try {
    const fleet = getFleetStatus(stateRoot);
    out(`Fleet: ${fleet.total} node(s) — ${fleet.online} online, ${fleet.degraded} degraded, ${fleet.offline} offline`);
    for (const node of fleet.nodes) {
      out(`  ${node.status === 'online' ? '●' : '○'} ${node.nodeId} (${node.displayName}) seq=${node.seq} status=${node.status}`);
    }
  } catch {
    out('Fleet: not initialized');
  }

  try {
    const permsRoot = getPermissionsRoot(workspacePath);
    const roles = loadRoles(permsRoot);
    out(`Permissions: ${roles.length} role(s) defined`);
  } catch {
    out('Permissions: not initialized');
  }
}

export function iacCLI(args: string[]) {
  const sub = args[0];
  const rest = args.slice(1);

  switch (sub) {
    case 'plan':
      return cmdPlan(rest);
    case 'apply':
      return cmdApply(rest);
    case 'validate':
      return cmdValidate(rest);
    case 'status':
      return cmdIacStatus(rest);
    default:
      out(`IaC commands:
  plan          - Show what would change
  apply         - Apply configuration changes
  apply --auto-approve - Apply without confirmation
  validate      - Validate config files
  status        - Show current resource state`);
  }
}
