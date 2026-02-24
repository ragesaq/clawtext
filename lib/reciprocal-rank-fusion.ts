/**
 * Reciprocal Rank Fusion (RRF)
 * 
 * Industry-standard algorithm for combining rankings from multiple sources.
 * Used by QMD, Elasticsearch, and other hybrid search systems.
 * 
 * Formula: score = Σ(1 / (k + rank)) for each ranking
 * where k is a constant (usually 60)
 */

export interface RankedResult {
  id: string;
  score?: number;
  [key: string]: any;
}

export interface RRFOptions {
  k?: number; // Constant, usually 60
  weights?: Record<string, number>; // Optional weights per source
}

/**
 * Apply Reciprocal Rank Fusion to combine multiple ranked lists
 * 
 * @param rankings - Array of ranked result lists from different sources
 * @param options - RRF options
 * @returns Combined and re-ranked results
 */
export function reciprocalRankFusion(
  rankings: RankedResult[][],
  options: RRFOptions = {}
): RankedResult[] {
  const { k = 60, weights = {} } = options;
  
  // Track all unique results and their RRF scores
  const rrfScores = new Map<string, number>();
  const resultMap = new Map<string, RankedResult>();
  
  // Process each ranking
  rankings.forEach((ranking, sourceIndex) => {
    const sourceWeight = weights[sourceIndex] || 1.0;
    
    ranking.forEach((result, rank) => {
      const id = result.id;
      
      // Store the full result (use first occurrence)
      if (!resultMap.has(id)) {
        resultMap.set(id, result);
      }
      
      // Calculate RRF contribution: weight * (1 / (k + rank))
      // rank is 0-indexed, so add 1 for 1-indexed ranking
      const rrfContribution = sourceWeight * (1 / (k + rank + 1));
      
      // Accumulate RRF score
      const currentScore = rrfScores.get(id) || 0;
      rrfScores.set(id, currentScore + rrfContribution);
    });
  });
  
  // Convert to array and sort by RRF score
  const combinedResults = Array.from(resultMap.entries()).map(([id, result]) => ({
    ...result,
    id,
    rrfScore: rrfScores.get(id) || 0,
    source: 'rrf-fusion' as const
  }));
  
  // Sort by RRF score descending
  return combinedResults.sort((a, b) => b.rrfScore - a.rrfScore);
}

/**
 * Create rankings from different search methods
 */
export function createRankings(
  semanticResults: RankedResult[],
  keywordResults: RankedResult[],
  options: {
    semanticWeight?: number;
    keywordWeight?: number;
  } = {}
): RankedResult[][] {
  const { semanticWeight = 1.0, keywordWeight = 1.0 } = options;
  
  // Sort each by their internal score
  const sortedSemantic = [...semanticResults].sort((a, b) => 
    (b.score || 0) - (a.score || 0)
  );
  
  const sortedKeyword = [...keywordResults].sort((a, b) => 
    (b.score || 0) - (a.score || 0)
  );
  
  return [
    sortedSemantic.map((r, i) => ({ ...r, sourceRank: i })),
    sortedKeyword.map((r, i) => ({ ...r, sourceRank: i }))
  ];
}

/**
 * Hybrid search using RRF
 * 
 * This is the QMD-inspired approach: run semantic and keyword search in parallel,
 * then fuse results using RRF for better combined ranking.
 */
export function hybridSearchRRF(
  semanticResults: RankedResult[],
  keywordResults: RankedResult[],
  options: {
    k?: number;
    semanticWeight?: number;
    keywordWeight?: number;
    maxResults?: number;
  } = {}
): RankedResult[] {
  const { 
    k = 60, 
    semanticWeight = 1.0, 
    keywordWeight = 1.0,
    maxResults = 10
  } = options;
  
  // Create rankings
  const rankings = createRankings(semanticResults, keywordResults, {
    semanticWeight,
    keywordWeight
  });
  
  // Apply RRF
  const fusedResults = reciprocalRankFusion(rankings, {
    k,
    weights: { 0: semanticWeight, 1: keywordWeight }
  });
  
  // Return top results
  return fusedResults.slice(0, maxResults);
}

/**
 * Benchmark RRF vs weighted average
 */
export function benchmarkRRF(
  semanticResults: RankedResult[],
  keywordResults: RankedResult[],
  groundTruth: string[] // IDs of truly relevant results
): {
  rrfPrecision: number;
  weightedPrecision: number;
  winner: 'rrf' | 'weighted' | 'tie';
} {
  // RRF approach
  const rrfResults = hybridSearchRRF(semanticResults, keywordResults, {
    maxResults: 10
  });
  const rrfTopIds = rrfResults.slice(0, 5).map(r => r.id);
  const rrfHits = rrfTopIds.filter(id => groundTruth.includes(id)).length;
  const rrfPrecision = rrfHits / rrfTopIds.length;
  
  // Weighted average approach
  const allResults = new Map<string, RankedResult & { weightedScore: number }>();
  
  semanticResults.forEach(r => {
    allResults.set(r.id, { ...r, weightedScore: (r.score || 0) * 0.7 });
  });
  
  keywordResults.forEach(r => {
    const existing = allResults.get(r.id);
    if (existing) {
      existing.weightedScore += (r.score || 0) * 0.3;
    } else {
      allResults.set(r.id, { ...r, weightedScore: (r.score || 0) * 0.3 });
    }
  });
  
  const weightedResults = Array.from(allResults.values())
    .sort((a, b) => b.weightedScore - a.weightedScore);
  
  const weightedTopIds = weightedResults.slice(0, 5).map(r => r.id);
  const weightedHits = weightedTopIds.filter(id => groundTruth.includes(id)).length;
  const weightedPrecision = weightedHits / weightedTopIds.length;
  
  return {
    rrfPrecision,
    weightedPrecision,
    winner: rrfPrecision > weightedPrecision ? 'rrf' : 
            weightedPrecision > rrfPrecision ? 'weighted' : 'tie'
  };
}

/**
 * MMR (Maximal Marginal Relevance) for result diversity
 * 
 * Balances relevance with diversity to avoid redundant results.
 * QMD uses this implicitly in its re-ranking.
 */
export function maximalMarginalRelevance(
  results: RankedResult[],
  query: string,
  options: {
    lambda?: number; // Trade-off between relevance and diversity (0-1)
    maxResults?: number;
    similarityThreshold?: number;
  } = {}
): RankedResult[] {
  const {
    lambda = 0.5,
    maxResults = 10,
    similarityThreshold = 0.7
  } = options;
  
  if (results.length === 0) return [];
  
  const selected: RankedResult[] = [];
  const remaining = [...results];
  
  // Pick the most relevant result first
  remaining.sort((a, b) => (b.score || 0) - (a.score || 0));
  selected.push(remaining.shift()!);
  
  // Iteratively pick results that maximize marginal relevance
  while (selected.length < maxResults && remaining.length > 0) {
    let bestMMRScore = -Infinity;
    let bestIndex = -1;
    
    remaining.forEach((result, index) => {
      // Relevance component
      const relevance = result.score || 0;
      
      // Diversity component: max similarity to already selected
      const maxSimilarity = selected.reduce((max, selectedResult) => {
        // Simple similarity based on shared content
        // In practice, you'd use embeddings or Jaccard similarity
        const similarity = estimateSimilarity(result, selectedResult);
        return Math.max(max, similarity);
      }, 0);
      
      // MMR score: λ * relevance - (1-λ) * max_similarity
      const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;
      
      if (mmrScore > bestMMRScore) {
        bestMMRScore = mmrScore;
        bestIndex = index;
      }
    });
    
    if (bestIndex >= 0) {
      selected.push(remaining[bestIndex]);
      remaining.splice(bestIndex, 1);
    } else {
      break;
    }
  }
  
  return selected;
}

/**
 * Estimate similarity between two results
 * Simple implementation - in production use embeddings
 */
function estimateSimilarity(a: RankedResult, b: RankedResult): number {
  // Use snippet overlap as proxy for similarity
  const aSnippet = (a.snippet || a.content || '').toLowerCase();
  const bSnippet = (b.snippet || b.content || '').toLowerCase();
  
  if (!aSnippet || !bSnippet) return 0;
  
  // Count common words
  const aWords = new Set(aSnippet.split(/\s+/));
  const bWords = new Set(bSnippet.split(/\s+/));
  
  const intersection = new Set([...aWords].filter(w => bWords.has(w)));
  const union = new Set([...aWords, ...bWords]);
  
  // Jaccard similarity
  return intersection.size / union.size;
}

export default {
  reciprocalRankFusion,
  hybridSearchRRF,
  maximalMarginalRelevance,
  benchmarkRRF
};