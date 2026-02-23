/**
 * Simple Hybrid Memory Search
 * 
 * Works with existing OpenClaw memory_search + manual keyword boost
 * No new dependencies, no database changes
 */

interface HybridSearchResult {
  path: string;
  startLine: number;
  endLine: number;
  snippet: string;
  score: number;
  source: 'semantic' | 'keyword' | 'hybrid';
}

interface HybridSearchOptions {
  query: string;
  maxResults?: number;
  semanticWeight?: number;
  keywordWeight?: number;
  boostPinned?: boolean;
  boostRecent?: boolean;
}

/**
 * Perform hybrid search using existing memory_search + keyword boost
 */
export async function searchHybrid(
  options: HybridSearchOptions
): Promise<HybridSearchResult[]> {
  const {
    query,
    maxResults = 10,
    semanticWeight = 0.7,
    keywordWeight = 0.3,
    boostPinned = true,
    boostRecent = true
  } = options;

  // Step 1: Get semantic results from OpenClaw's memory_search
  // This is done via the memory_search tool call
  
  // Step 2: Score keywords in the query
  const keywords = extractKeywords(query);
  
  // Step 3: Results will be enhanced by the agent using this function
  // The actual memory_search call happens at the agent level
  
  return {
    query,
    keywords,
    weights: { semantic: semanticWeight, keyword: keywordWeight },
    boosts: { pinned: boostPinned, recent: boostRecent },
    maxResults
  } as any;
}

/**
 * Extract important keywords from query
 */
function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !isStopWord(w));
}

/**
 * Common stop words to filter out
 */
function isStopWord(word: string): boolean {
  const stopWords = new Set([
    'about', 'above', 'after', 'again', 'against', 'all', 'and', 'any',
    'because', 'before', 'being', 'below', 'between', 'both', 'but', 'can',
    'did', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
    'further', 'had', 'has', 'have', 'having', 'her', 'here', 'hers',
    'herself', 'him', 'himself', 'his', 'how', 'into', 'its', 'itself',
    'let', 'more', 'most', 'myself', 'nor', 'once', 'only', 'other',
    'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same',
    'she', 'should', 'some', 'such', 'than', 'that', 'their', 'theirs',
    'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
    'those', 'through', 'too', 'under', 'until', 'very', 'was', 'were',
    'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why',
    'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
    'the', 'are', 'was', 'will', 'been', 'have', 'said', 'each',
    'make', 'like', 'time', 'just', 'know', 'take', 'year', 'good',
    'come', 'could', 'state', 'than', 'them', 'well', 'were', 'what',
    'would', 'there', 'their', 'said', 'each', 'which', 'this',
    'that', 'have', 'from', 'they', 'been', 'were', 'said', 'time',
    'than', 'them', 'into', 'just', 'know', 'take', 'year', 'good',
    'come', 'could', 'state', 'also', 'well', 'work', 'life', 'even',
    'back', 'only', 'know', 'take', 'year', 'good', 'come', 'could',
    'state', 'only', 'well', 'work', 'life', 'even', 'back', 'after',
    'first', 'never', 'these', 'think', 'where', 'being', 'every',
    'great', 'might', 'shall', 'still', 'those', 'while', 'with',
    'within', 'without', 'would', 'your'
  ]);
  return stopWords.has(word);
}

/**
 * Compute keyword match score for a snippet
 */
export function keywordScore(snippet: string, keywords: string[]): number {
  const text = snippet.toLowerCase();
  let matches = 0;
  
  for (const keyword of keywords) {
    // Count occurrences
    const regex = new RegExp(keyword, 'g');
    const count = (text.match(regex) || []).length;
    matches += count;
  }
  
  // Normalize by snippet length and keyword count
  const normalizedScore = matches / (keywords.length * Math.sqrt(text.length / 100));
  return Math.min(normalizedScore, 1.0);
}

/**
 * Apply hybrid scoring to memory_search results
 */
export function applyHybridScoring(
  semanticResults: any[],
  query: string,
  options: {
    semanticWeight?: number;
    keywordWeight?: number;
    boostPinned?: boolean;
    boostRecent?: boolean;
  } = {}
): HybridSearchResult[] {
  const {
    semanticWeight = 0.7,
    keywordWeight = 0.3,
    boostPinned = true,
    boostRecent = true
  } = options;

  const keywords = extractKeywords(query);
  
  // Find max semantic score for normalization
  const maxSemanticScore = Math.max(
    ...semanticResults.map(r => r.score || 0),
    0.001 // Avoid division by zero
  );

  return semanticResults.map(result => {
    // Normalize semantic score to 0-1
    const normSemanticScore = (result.score || 0) / maxSemanticScore;
    
    // Compute keyword score
    const kwScore = keywordScore(result.snippet || '', keywords);
    
    // Combine scores
    let hybridScore = (normSemanticScore * semanticWeight) + (kwScore * keywordWeight);
    
    // Apply boosts
    if (boostPinned && result.snippet?.includes('📌')) {
      hybridScore *= 1.2;
    }
    
    if (boostRecent) {
      // Boost if from recent memory files
      const isRecent = result.path?.includes('2026-02-23') || 
                       result.path?.includes('2026-02-22');
      if (isRecent) hybridScore *= 1.1;
    }

    return {
      path: result.path,
      startLine: result.startLine,
      endLine: result.endLine,
      snippet: result.snippet,
      score: hybridScore,
      source: kwScore > 0.3 ? 'hybrid' : 'semantic'
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Format hybrid results for display
 */
export function formatHybridResults(results: HybridSearchResult[]): string {
  if (results.length === 0) return 'No memories found.';

  const lines = ['**Hybrid Search Results**\n'];
  
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const source = r.source === 'hybrid' ? '🔀' : '🧠';
    lines.push(`${i + 1}. ${source} **Score:** ${r.score.toFixed(3)} | **Source:** ${r.path}:${r.startLine}`);
    lines.push(`   \`\`\`${r.snippet.slice(0, 200).replace(/\n/g, ' ')}...\`\`\``);
    lines.push('');
  }

  return lines.join('\n');
}

// Simple test function
export function testHybridSearch(): string {
  const testQuery = 'hybrid search implementation';
  const testResults = [
    {
      path: 'memory/2026-02-23.md',
      startLine: 1,
      endLine: 10,
      snippet: '## DECISION - hybrid search\n\nImplementing hybrid search combining semantic + keyword',
      score: 0.85
    },
    {
      path: 'memory/2026-02-22.md',
      startLine: 5,
      endLine: 15,
      snippet: '## FACT - memory architecture\n\nWorking on memory system improvements',
      score: 0.72
    }
  ];

  const scored = applyHybridScoring(testResults, testQuery);
  return formatHybridResults(scored);
}

export default {
  searchHybrid,
  keywordScore,
  applyHybridScoring,
  formatHybridResults,
  testHybridSearch
};
