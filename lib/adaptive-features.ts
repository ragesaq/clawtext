/**
 * Adaptive Feature Selection
 * 
 * Automatically decides when to use expensive features based on query analysis.
 * 
 * Strategy:
 * 1. Fast path: Use cheap features (clusters + basic hybrid)
 * 2. Detect if results are poor (low confidence, few matches)
 * 3. Escalate: Enable expensive features (query expansion, LLM re-ranking)
 * 4. Learn: Track which queries benefit from escalation
 */

import type { HybridSearchOptions } from './hybrid-search-simple';

export interface QueryAnalysis {
  complexity: 'simple' | 'medium' | 'complex';
  ambiguity: number; // 0-1, higher = more ambiguous
  specificity: number; // 0-1, higher = more specific terms
  domainSpecificity: number; // 0-1, technical vs general
  expectedRecall: 'high' | 'medium' | 'low';
}

export interface AdaptiveConfig {
  // Thresholds for escalation
  minResultsForEscalation: number;
  minConfidenceForEscalation: number;
  
  // Feature enablement
  enableQueryExpansion: 'auto' | 'always' | 'never';
  enableLLMReranking: 'auto' | 'always' | 'never';
  enableTemporalDecay: 'auto' | 'always' | 'never';
  
  // Learning
  trackPerformance: boolean;
  adaptiveThresholds: boolean;
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  minResultsForEscalation: 3,
  minConfidenceForEscalation: 0.6,
  enableQueryExpansion: 'auto',
  enableLLMReranking: 'auto',
  enableTemporalDecay: 'auto',
  trackPerformance: true,
  adaptiveThresholds: true
};

/**
 * Analyze query characteristics to determine complexity
 */
export function analyzeQuery(query: string): QueryAnalysis {
  const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  // Complexity indicators
  const technicalTerms = [
    'api', 'config', 'database', 'server', 'gateway', 'endpoint',
    'memory', 'search', 'embedding', 'vector', 'cluster',
    'async', 'await', 'promise', 'callback', 'function'
  ];
  
  const vagueTerms = [
    'thing', 'stuff', 'something', 'anything', 'it', 'that',
    'this', 'good', 'bad', 'nice', 'ok'
  ];
  
  const ambiguousPatterns = [
    /how (to|do|can)/i,
    /what (is|are|does)/i,
    /why (is|does)/i,
    /explain/i
  ];
  
  // Calculate metrics
  const technicalCount = words.filter(w => technicalTerms.includes(w)).length;
  const vagueCount = words.filter(w => vagueTerms.includes(w)).length;
  const hasAmbiguousPattern = ambiguousPatterns.some(p => p.test(query));
  
  const domainSpecificity = Math.min(technicalCount / Math.max(words.length, 1), 1);
  const ambiguity = (vagueCount / Math.max(words.length, 1)) + (hasAmbiguousPattern ? 0.3 : 0);
  const specificity = 1 - ambiguity;
  
  // Determine complexity
  let complexity: QueryAnalysis['complexity'];
  if (words.length <= 3 && !hasAmbiguousPattern) {
    complexity = 'simple';
  } else if (ambiguity > 0.4 || words.length > 8) {
    complexity = 'complex';
  } else {
    complexity = 'medium';
  }
  
  // Estimate recall needs
  let expectedRecall: QueryAnalysis['expectedRecall'];
  if (domainSpecificity > 0.5) {
    expectedRecall = 'low'; // Technical terms are specific
  } else if (ambiguity > 0.4) {
    expectedRecall = 'high'; // Vague queries need more results
  } else {
    expectedRecall = 'medium';
  }
  
  return {
    complexity,
    ambiguity: Math.min(ambiguity, 1),
    specificity: Math.max(Math.min(specificity, 1), 0),
    domainSpecificity,
    expectedRecall
  };
}

/**
 * Decide which features to enable based on query analysis
 */
export function selectFeatures(
  query: string,
  initialResults: Array<{ score: number }>,
  config: Partial<AdaptiveConfig> = {}
): {
  useQueryExpansion: boolean;
  useLLMReranking: boolean;
  useTemporalDecay: boolean;
  reasoning: string[];
} {
  const mergedConfig = { ...DEFAULT_ADAPTIVE_CONFIG, ...config };
  const analysis = analyzeQuery(query);
  
  const reasoning: string[] = [];
  
  // Check initial results quality
  const avgConfidence = initialResults.length > 0
    ? initialResults.reduce((sum, r) => sum + (r.score || 0), 0) / initialResults.length
    : 0;
  
  const needsEscalation = 
    initialResults.length < mergedConfig.minResultsForEscalation ||
    avgConfidence < mergedConfig.minConfidenceForEscalation;
  
  // Decide on query expansion
  let useQueryExpansion = false;
  if (mergedConfig.enableQueryExpansion === 'always') {
    useQueryExpansion = true;
    reasoning.push('Query expansion: forced on');
  } else if (mergedConfig.enableQueryExpansion === 'never') {
    useQueryExpansion = false;
    reasoning.push('Query expansion: forced off');
  } else {
    // Auto mode
    useQueryExpansion = needsEscalation || analysis.expectedRecall === 'high';
    if (useQueryExpansion) {
      if (needsEscalation) {
        reasoning.push(`Query expansion: enabled due to low results (${initialResults.length} < ${mergedConfig.minResultsForEscalation})`);
      } else {
        reasoning.push('Query expansion: enabled for high-recall query');
      }
    } else {
      reasoning.push('Query expansion: skipped (sufficient results)');
    }
  }
  
  // Decide on LLM re-ranking
  let useLLMReranking = false;
  if (mergedConfig.enableLLMReranking === 'always') {
    useLLMReranking = true;
    reasoning.push('LLM re-ranking: forced on');
  } else if (mergedConfig.enableLLMReranking === 'never') {
    useLLMReranking = false;
    reasoning.push('LLM re-ranking: forced off');
  } else {
    // Auto mode - only for complex queries with many results
    useLLMReranking = analysis.complexity === 'complex' && initialResults.length >= 5;
    if (useLLMReranking) {
      reasoning.push('LLM re-ranking: enabled for complex query with sufficient results');
    } else {
      reasoning.push('LLM re-ranking: skipped (simple query or few results)');
    }
  }
  
  // Decide on temporal decay
  let useTemporalDecay = false;
  if (mergedConfig.enableTemporalDecay === 'always') {
    useTemporalDecay = true;
    reasoning.push('Temporal decay: forced on');
  } else if (mergedConfig.enableTemporalDecay === 'never') {
    useTemporalDecay = false;
    reasoning.push('Temporal decay: forced off');
  } else {
    // Auto mode - enable for large memory stores or old queries
    useTemporalDecay = initialResults.length > 10 || analysis.expectedRecall === 'medium';
    if (useTemporalDecay) {
      reasoning.push('Temporal decay: enabled for result filtering');
    } else {
      reasoning.push('Temporal decay: skipped (small result set)');
    }
  }
  
  return {
    useQueryExpansion,
    useLLMReranking,
    useTemporalDecay,
    reasoning
  };
}

/**
 * Adaptive search that automatically escalates features
 */
export async function adaptiveSearch(
  query: string,
  baseSearchFn: (query: string, options: any) => Promise<any[]>,
  config: Partial<AdaptiveConfig> = {}
): Promise<{
  results: any[];
  featuresUsed: string[];
  reasoning: string[];
  timing: {
    baseSearch: number;
    queryExpansion?: number;
    llmReranking?: number;
    total: number;
  };
}> {
  const startTime = Date.now();
  
  // Phase 1: Fast base search
  const baseStart = Date.now();
  const baseResults = await baseSearchFn(query, {
    useClusters: true,
    useHybridSearch: true,
    expandQuery: false,
    rerankResults: false
  });
  const baseTime = Date.now() - baseStart;
  
  // Phase 2: Decide which features to use
  const featureDecision = selectFeatures(query, baseResults, config);
  
  let results = baseResults;
  let expansionTime: number | undefined;
  let rerankTime: number | undefined;
  
  // Phase 3: Conditional escalation
  if (featureDecision.useQueryExpansion) {
    const expStart = Date.now();
    // Re-run with query expansion
    results = await baseSearchFn(query, {
      ...results,
      expandQuery: true
    });
    expansionTime = Date.now() - expStart;
  }
  
  if (featureDecision.useLLMReranking && results.length >= 4) {
    const rerankStart = Date.now();
    // Import and apply LLM re-ranking
    const { rerankSearchResults } = await import('./llm-rerank');
    const reranked = await rerankSearchResults(query, results, {
      provider: 'none' // Use heuristic fallback for now
    });
    results = reranked.results;
    rerankTime = Date.now() - rerankStart;
  }
  
  const totalTime = Date.now() - startTime;
  
  return {
    results,
    featuresUsed: [
      ...(featureDecision.useQueryExpansion ? ['query-expansion'] : []),
      ...(featureDecision.useLLMReranking ? ['llm-reranking'] : []),
      ...(featureDecision.useTemporalDecay ? ['temporal-decay'] : [])
    ],
    reasoning: featureDecision.reasoning,
    timing: {
      baseSearch: baseTime,
      queryExpansion: expansionTime,
      llmReranking: rerankTime,
      total: totalTime
    }
  };
}

/**
 * Learning system: Track which queries benefit from features
 */
export class AdaptiveLearning {
  private queryPatterns: Map<string, {
    usesExpansion: number;
    totalUses: number;
    avgQualityWith: number;
    avgQualityWithout: number;
  }> = new Map();
  
  recordQuery(
    queryPattern: string,
    usedExpansion: boolean,
    resultQuality: number
  ): void {
    const existing = this.queryPatterns.get(queryPattern) || {
      usesExpansion: 0,
      totalUses: 0,
      avgQualityWith: 0,
      avgQualityWithout: 0
    };
    
    existing.totalUses++;
    if (usedExpansion) {
      existing.usesExpansion++;
      existing.avgQualityWith = 
        (existing.avgQualityWith * (existing.usesExpansion - 1) + resultQuality) /
        existing.usesExpansion;
    } else {
      existing.avgQualityWithout = 
        (existing.avgQualityWithout * (existing.totalUses - existing.usesExpansion - 1) + resultQuality) /
        (existing.totalUses - existing.usesExpansion);
    }
    
    this.queryPatterns.set(queryPattern, existing);
  }
  
  shouldUseExpansion(queryPattern: string): boolean | null {
    const data = this.queryPatterns.get(queryPattern);
    if (!data || data.totalUses < 3) return null; // Not enough data
    
    // Use expansion if it consistently improves quality
    return data.avgQualityWith > data.avgQualityWithout + 0.1;
  }
  
  getStats(): object {
    const patterns = Array.from(this.queryPatterns.entries());
    return {
      totalPatterns: patterns.length,
      patternsWithData: patterns.filter(([, d]) => d.totalUses >= 3).length,
      expansionHelpful: patterns.filter(([, d]) => 
        d.totalUses >= 3 && d.avgQualityWith > d.avgQualityWithout
      ).length
    };
  }
}

export default {
  analyzeQuery,
  selectFeatures,
  adaptiveSearch,
  AdaptiveLearning,
  DEFAULT_ADAPTIVE_CONFIG
};