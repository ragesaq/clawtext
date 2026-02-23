/**
 * Session Context Injection
 * 
 * Auto-loads relevant memories at session start using hybrid search + clusters.
 * Integrates with OpenClaw's session lifecycle.
 */

import { memory_search } from '../tools';
import { applyHybridScoring } from './hybrid-search-simple';
import { classifyCluster, loadClusterContext, findRelatedInCluster } from './memory-clusters';

export interface SessionContextConfig {
  maxMemories: number;
  tokenBudget: number;
  minConfidence: number;
  autoLoadTypes: string[];
  recencyBoost: boolean;
  useClusters: boolean; // NEW: Enable cluster loading
}

const DEFAULT_CONFIG: SessionContextConfig = {
  maxMemories: 10,
  tokenBudget: 2000,
  minConfidence: 0.7,
  autoLoadTypes: ['preference', 'decision', 'project_context', 'fact'],
  recencyBoost: true,
  useClusters: true // NEW: Clusters enabled by default
};

/**
 * Load context for new session
 * Call this at session start
 */
export async function loadSessionContext(
  sessionTopic?: string,
  projectId?: string,
  config: Partial<SessionContextConfig> = {}
): Promise<{
  memories: any[];
  contextPrompt: string;
  tokenEstimate: number;
  clusterInfo?: {
    loaded: string[];
    memoryCount: number;
  };
}> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  let allMemories: any[] = [];
  const loadedClusters: string[] = [];

  // NEW: 0. Load cluster context if available (O(1) vs O(n) search)
  if (cfg.useClusters && projectId) {
    const clusterId = `cluster-${projectId}`;
    try {
      const clusterContext = await loadClusterContext(clusterId);
      if (clusterContext.memories.length > 0) {
        allMemories.push(...clusterContext.memories);
        loadedClusters.push(clusterId);
        console.log(`[SessionContext] Loaded cluster ${clusterId}: ${clusterContext.memories.length} memories`);
      }
    } catch (e) {
      // Cluster doesn't exist yet, fall back to search
      console.log(`[SessionContext] No cluster found for ${projectId}, using search`);
    }
  }

  // 1. Load user preferences (always)
  const preferences = await searchMemories('user preference', {
    types: ['preference'],
    limit: 5,
    recencyBoost: false,
    minConfidence: 0.8
  });
  allMemories.push(...preferences);

  // 2. Load project context if specified and not already loaded from cluster
  if (projectId && loadedClusters.length === 0) {
    const projectContext = await searchMemories(`${projectId} project context`, {
      types: ['project_context', 'decision', 'code'],
      limit: 8,
      recencyBoost: true
    });
    allMemories.push(...projectContext);
  }

  // 3. Load recent relevant decisions
  const decisions = await searchMemories(sessionTopic || 'recent decisions', {
    types: ['decision', 'plan'],
    limit: 5,
    recencyBoost: true
  });
  allMemories.push(...decisions);

  // 4. Deduplicate and rank
  const uniqueMemories = deduplicateById(allMemories);
  const rankedMemories = prioritizeForContext(uniqueMemories);

  // 5. Trim to token budget
  const selectedMemories = trimToBudget(rankedMemories, cfg.tokenBudget);

  // 6. Format as prompt
  const contextPrompt = formatMemoriesAsPrompt(selectedMemories, loadedClusters);
  const tokenEstimate = estimateTokens(contextPrompt);

  return {
    memories: selectedMemories,
    contextPrompt,
    tokenEstimate,
    clusterInfo: loadedClusters.length > 0 ? {
      loaded: loadedClusters,
      memoryCount: selectedMemories.filter(m => 
        loadedClusters.some(c => m.clusterId === c)
      ).length
    } : undefined
  };
}

/**
 * Store memory with auto-cluster classification
 * Call this when creating new memories
 */
export async function storeMemoryWithCluster(
  content: string,
  metadata: {
    type: string;
    projectId?: string;
    priority?: number;
    confidence?: number;
  }
): Promise<{
  memoryId: string;
  clusterId: string;
  relatedMemories: string[];
}> {
  // 1. Classify into cluster
  const clusterId = await classifyCluster(content, {
    projectId: metadata.projectId,
    type: metadata.type
  });

  // 2. Store memory (placeholder - would integrate with actual storage)
  const memoryId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // 3. Find related memories in cluster
  const relatedMemories = await findRelatedInCluster(memoryId, clusterId);

  console.log(`[SessionContext] Stored memory ${memoryId} in cluster ${clusterId}`);
  console.log(`[SessionContext] Related memories: ${relatedMemories.length}`);

  return {
    memoryId,
    clusterId,
    relatedMemories
  };
}

/**
 * Search memories using hybrid scoring
 */
async function searchMemories(
  query: string,
  options: {
    types?: string[];
    limit?: number;
    recencyBoost?: boolean;
    minConfidence?: number;
  }
): Promise<any[]> {
  const semanticResults = await memory_search({
    query,
    maxResults: options.limit || 10
  });

  const hybridResults = applyHybridScoring(
    semanticResults.results || [],
    query,
    {
      boostRecent: options.recencyBoost,
      boostPinned: true
    }
  );

  if (options.minConfidence && options.minConfidence > 0) {
    return hybridResults.filter(m => {
      const confidence = extractConfidence(m.snippet);
      return confidence >= options.minConfidence!;
    });
  }

  return hybridResults;
}

function extractConfidence(snippet: string): number {
  const match = snippet.match(/confidence:\s*([\d.]+)/);
  return match ? parseFloat(match[1]) : 0.5;
}

function deduplicateById(memories: any[]): any[] {
  const seen = new Set<string>();
  return memories.filter(m => {
    const id = `${m.path}:${m.startLine}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function prioritizeForContext(memories: any[]): any[] {
  return memories.sort((a, b) => {
    const aPinned = a.snippet?.includes('📌') || false;
    const bPinned = b.snippet?.includes('📌') || false;
    if (aPinned !== bPinned) return bPinned ? 1 : -1;

    if (Math.abs(a.hybridScore - b.hybridScore) > 0.05) {
      return b.hybridScore - a.hybridScore;
    }

    const aRecent = a.path?.includes('2026-02-23') || a.path?.includes('2026-02-22');
    const bRecent = b.path?.includes('2026-02-23') || b.path?.includes('2026-02-22');
    if (aRecent !== bRecent) return aRecent ? -1 : 1;

    return 0;
  });
}

function trimToBudget(memories: any[], budget: number): any[] {
  let totalTokens = 0;
  const selected: any[] = [];

  for (const memory of memories) {
    const tokens = estimateTokens(memory.snippet || '');
    if (totalTokens + tokens > budget) break;
    totalTokens += tokens;
    selected.push(memory);
  }

  return selected;
}

function formatMemoriesAsPrompt(memories: any[], loadedClusters?: string[]): string {
  if (memories.length === 0) return '';

  const lines = ['\n### Relevant Context'];
  
  if (loadedClusters && loadedClusters.length > 0) {
    lines.push(`\n*Loaded from clusters: ${loadedClusters.join(', ')}*`);
  }

  const grouped = groupByType(memories);

  for (const [type, typeMemories] of Object.entries(grouped)) {
    if (typeMemories.length === 0) continue;
    lines.push(`\n**${capitalize(type)}s:**`);

    for (const m of typeMemories) {
      const pin = m.snippet?.includes('📌') ? '📌 ' : '';
      const preview = (m.snippet || '')
        .replace(/---[\s\S]*?---/g, '')
        .replace(/##?\s*\w+/g, '')
        .slice(0, 150)
        .trim();
      lines.push(`• ${pin}${preview}`);
    }
  }

  return lines.join('\n');
}

function groupByType(memories: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};

  for (const m of memories) {
    const type = extractType(m.snippet) || 'unknown';
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push(m);
  }

  return grouped;
}

function extractType(snippet: string): string | null {
  const match = snippet.match(/memory_type:\s*(\w+)/);
  if (match) return match[1];
  const headerMatch = snippet.match(/^##?\s*([A-Z]+)/m);
  return headerMatch ? headerMatch[1].toLowerCase() : null;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function testSessionContext(): Promise<string> {
  console.log('Testing session context injection with clusters...');

  const context = await loadSessionContext(
    'memory architecture',
    'memory-architecture'
  );

  console.log(`\nLoaded ${context.memories.length} memories`);
  if (context.clusterInfo) {
    console.log(`Clusters loaded: ${context.clusterInfo.loaded.join(', ')}`);
    console.log(`Cluster memory count: ${context.clusterInfo.memoryCount}`);
  }
  console.log(`Token estimate: ${context.tokenEstimate}`);
  console.log('\nContext prompt preview:');
  console.log(context.contextPrompt.slice(0, 500) + '...');

  return 'Test complete!';
}

export default {
  loadSessionContext,
  storeMemoryWithCluster,
  testSessionContext
};
