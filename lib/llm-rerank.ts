/**
 * LLM Re-ranking
 * 
 * Inspired by QMD: use local LLM to re-rank search results for better relevance
 * 
 * Can use OpenRouter, Ollama, or other local LLM providers
 */

export interface RerankConfig {
  provider: 'openrouter' | 'ollama' | 'none';
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface RerankResult {
  results: SearchResult[];
  reranked: boolean;
  providerUsed?: string;
  timeMs: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RerankConfig = {
  provider: 'none', // Default to no re-ranking
  model: 'openrouter/google/gemini-2.0-flash-001', // Fast, cheap
  temperature: 0.1,
  maxTokens: 100
};

/**
 * Simple relevance prompt for LLM
 */
function buildRelevancePrompt(query: string, results: SearchResult[]): string {
  const formattedResults = results.map((r, i) => 
    `[${i + 1}] ${r.content.substring(0, 200)}${r.content.length > 200 ? '...' : ''}`
  ).join('\n\n');

  return `You are a relevance ranking assistant. Given the query and search results, rank them from most to least relevant.

QUERY: "${query}"

SEARCH RESULTS:
${formattedResults}

INSTRUCTIONS:
1. Return ONLY a JSON array of indices in order of relevance (most relevant first)
2. Example: [3, 0, 1, 2]
3. Base ranking on semantic relevance to the query
4. Consider technical accuracy, recency, and completeness

RANKING:`;
}

/**
 * Re-rank using OpenRouter (cloud)
 */
async function rerankWithOpenRouter(
  query: string, 
  results: SearchResult[], 
  config: RerankConfig
): Promise<number[]> {
  // In a real implementation, this would call OpenRouter API
  // For now, mock implementation
  console.log(`[LLM-Rerank] Using OpenRouter ${config.model} to re-rank ${results.length} results`);
  
  // Mock: Return original order for now
  return results.map((_, i) => i);
}

/**
 * Re-rank using Ollama (local)
 */
async function rerankWithOllama(
  query: string,
  results: SearchResult[],
  config: RerankConfig
): Promise<number[]> {
  console.log(`[LLM-Rerank] Using Ollama ${config.model} to re-rank ${results.length} results`);
  
  // Mock: Return original order for now
  return results.map((_, i) => i);
}

/**
 * Heuristic re-ranking without LLM
 */
function heuristicRerank(query: string, results: SearchResult[]): number[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  
  // Score each result
  const scored = results.map((result, index) => {
    let score = result.score || 0;
    const contentLower = result.content.toLowerCase();
    
    // Boost exact matches
    for (const word of queryWords) {
      if (word.length > 3 && contentLower.includes(word)) {
        score += 0.2;
      }
    }
    
    // Boost recency
    if (result.metadata?.timestamp) {
      const age = Date.now() - new Date(result.metadata.timestamp).getTime();
      const daysOld = age / (1000 * 60 * 60 * 24);
      if (daysOld < 7) score += 0.1; // Recent
      if (daysOld < 1) score += 0.2; // Very recent
    }
    
    // Boost confidence
    if (result.metadata?.confidence) {
      score += result.metadata.confidence * 0.1;
    }
    
    return { index, score };
  });
  
  // Sort by score
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.index);
}

/**
 * Main re-ranking function
 */
export async function rerankSearchResults(
  query: string,
  results: SearchResult[],
  config: Partial<RerankConfig> = {}
): Promise<RerankResult> {
  const startTime = Date.now();
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Don't re-rank if too few results
  if (results.length <= 3) {
    return {
      results,
      reranked: false,
      timeMs: Date.now() - startTime
    };
  }
  
  let rankedIndices: number[];
  let providerUsed = 'none';
  
  try {
    switch (mergedConfig.provider) {
      case 'openrouter':
        rankedIndices = await rerankWithOpenRouter(query, results, mergedConfig);
        providerUsed = 'openrouter';
        break;
        
      case 'ollama':
        rankedIndices = await rerankWithOllama(query, results, mergedConfig);
        providerUsed = 'ollama';
        break;
        
      case 'none':
      default:
        rankedIndices = heuristicRerank(query, results);
        providerUsed = 'heuristic';
        break;
    }
    
    // Apply ranking
    const rankedResults = rankedIndices.map(i => results[i]);
    
    return {
      results: rankedResults,
      reranked: true,
      providerUsed,
      timeMs: Date.now() - startTime
    };
    
  } catch (error) {
    console.error('[LLM-Rerank] Failed to re-rank, using heuristic fallback', error);
    
    // Fallback to heuristic
    const fallbackIndices = heuristicRerank(query, results);
    const fallbackResults = fallbackIndices.map(i => results[i]);
    
    return {
      results: fallbackResults,
      reranked: true,
      providerUsed: 'heuristic-fallback',
      timeMs: Date.now() - startTime
    };
  }
}

/**
 * Determine if re-ranking is worthwhile
 */
export function shouldRerank(
  query: string,
  results: SearchResult[],
  config: RerankConfig
): boolean {
  // Don't re-rank trivial queries
  if (query.split(/\s+/).length <= 2) return false;
  
  // Don't re-rank if we already have high confidence top results
  if (results.length > 0 && results[0].score > 0.9) return false;
  
  // Only re-rank if we have enough results to potentially improve
  if (results.length < 4) return false;
  
  // Check provider availability
  if (config.provider === 'none') return false;
  
  return true;
}

/**
 * Benchmark re-ranking effectiveness
 */
export async function benchmarkRerank(
  query: string,
  originalResults: SearchResult[],
  rerankedResults: SearchResult[]
): Promise<{
  relevanceImprovement: number;
  timeCostMs: number;
  worthwhile: boolean;
}> {
  // Simple heuristic: compare scores of top 3 results
  const originalTopScore = originalResults.slice(0, 3).reduce((sum, r) => sum + (r.score || 0), 0);
  const rerankedTopScore = rerankedResults.slice(0, 3).reduce((sum, r) => sum + (r.score || 0), 0);
  
  const improvement = ((rerankedTopScore - originalTopScore) / originalTopScore) * 100;
  
  // Rough time cost estimate (would be measured)
  const timeCost = 1000; // ms estimate
  
  // Worthwhile if improvement > 10% and time cost < 2000ms
  const worthwhile = improvement > 10 && timeCost < 2000;
  
  return {
    relevanceImprovement: improvement,
    timeCostMs: timeCost,
    worthwhile
  };
}

/**
 * Configuration helper for OpenClaw integration
 */
export function getRerankConfigFromOpenClaw(): RerankConfig {
  // In real implementation, read from OpenClaw config
  // For now, return sensible defaults
  return {
    provider: 'none', // Disabled by default until configured
    model: 'openrouter/google/gemini-2.0-flash-001',
    temperature: 0.1,
    maxTokens: 100
  };
}