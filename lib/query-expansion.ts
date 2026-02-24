/**
 * Query Expansion
 * 
 * Inspired by QMD's approach: expand queries for better search recall
 * 
 * Example: "gateway setup" → ["server configuration", "port forwarding", "network setup"]
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ExpansionResult {
  original: string;
  expanded: string[];
  confidence: number;
}

/**
 * Simple rule-based expansion for common patterns
 */
export function ruleBasedExpansion(query: string): string[] {
  const expansions: string[] = [query.toLowerCase()];
  
  // Technical patterns
  if (query.includes('setup') || query.includes('configure')) {
    expansions.push('configuration', 'installation', 'deployment');
  }
  if (query.includes('error') || query.includes('fail')) {
    expansions.push('issue', 'problem', 'bug', 'crash');
  }
  if (query.includes('memory') || query.includes('ram')) {
    expansions.push('storage', 'cache', 'performance');
  }
  if (query.includes('api') || query.includes('endpoint')) {
    expansions.push('interface', 'rest', 'service');
  }
  if (query.includes('database') || query.includes('db')) {
    expansions.push('storage', 'persistence', 'records');
  }
  
  // Remove duplicates
  return [...new Set(expansions)];
}

/**
 * LLM-based expansion using local model (if available)
 * Falls back to rule-based if no LLM
 */
export async function llmExpansion(query: string): Promise<string[]> {
  try {
    // Try to use local LLM via ollama or llama.cpp
    const expansions = ruleBasedExpansion(query);
    
    // If we have access to an LLM, we could enhance further
    // For now, return rule-based expansions
    return expansions;
  } catch (error) {
    console.warn('[QueryExpansion] LLM expansion failed, using rule-based:', error);
    return ruleBasedExpansion(query);
  }
}

/**
 * Hybrid expansion: combine multiple strategies
 */
export async function hybridExpansion(query: string): Promise<ExpansionResult> {
  const ruleBased = ruleBasedExpansion(query);
  const llmBased = await llmExpansion(query);
  
  const allExpansions = [...new Set([...ruleBased, ...llmBased])];
  
  // Score confidence based on how many expansions we got
  const confidence = Math.min(0.7 + (allExpansions.length - 1) * 0.1, 0.95);
  
  return {
    original: query,
    expanded: allExpansions,
    confidence
  };
}

/**
 * Expand query for search
 */
export async function expandQueryForSearch(query: string, method: 'rule' | 'llm' | 'hybrid' = 'hybrid'): Promise<string[]> {
  switch (method) {
    case 'rule':
      return ruleBasedExpansion(query);
    case 'llm':
      return await llmExpansion(query);
    case 'hybrid':
      const result = await hybridExpansion(query);
      return result.expanded;
  }
}

/**
 * Generate alternative phrasings for a query
 */
export function generateAlternativePhrasings(query: string): string[] {
  const phrases: string[] = [query];
  
  // Add variations
  if (query.includes('how to')) {
    phrases.push(query.replace('how to', 'guide to'));
    phrases.push(query.replace('how to', 'tutorial for'));
    phrases.push(query.replace('how to', 'steps to'));
  }
  
  if (query.includes('best') || query.includes('better')) {
    phrases.push(query.replace('best', 'optimal'));
    phrases.push(query.replace('best', 'recommended'));
    phrases.push(query.replace('better', 'improved'));
  }
  
  if (query.includes('fix') || query.includes('solve')) {
    phrases.push(query.replace('fix', 'resolve'));
    phrases.push(query.replace('fix', 'repair'));
    phrases.push(query.replace('solve', 'troubleshoot'));
  }
  
  // Add generic technical synonyms
  const techSynonyms: Record<string, string[]> = {
    'server': ['host', 'machine', 'instance'],
    'client': ['frontend', 'ui', 'interface'],
    'database': ['store', 'repository', 'datastore'],
    'api': ['endpoint', 'interface', 'service'],
    'config': ['settings', 'configuration', 'options'],
    'error': ['issue', 'problem', 'failure'],
    'performance': ['speed', 'latency', 'throughput'],
  };
  
  let expanded = [...phrases];
  for (const [word, synonyms] of Object.entries(techSynonyms)) {
    if (query.toLowerCase().includes(word)) {
      for (const synonym of synonyms) {
        expanded.push(query.toLowerCase().replace(word, synonym));
      }
    }
  }
  
  return [...new Set(expanded)];
}

/**
 * Test if query expansion improves results
 */
export async function testExpansionEffectiveness(
  query: string,
  searchFn: (q: string) => Promise<any[]>
): Promise<{
  originalResults: number;
  expandedResults: number;
  improvement: number;
  usefulExpansions: string[];
}> {
  const original = await searchFn(query);
  const expansions = await expandQueryForSearch(query);
  
  const allResults = new Set();
  original.forEach(r => allResults.add(r.id));
  
  const usefulExpansions: string[] = [];
  
  for (const expansion of expansions) {
    if (expansion === query) continue;
    
    const results = await searchFn(expansion);
    const newResults = results.filter(r => !allResults.has(r.id));
    
    if (newResults.length > 0) {
      usefulExpansions.push(expansion);
      newResults.forEach(r => allResults.add(r.id));
    }
  }
  
  return {
    originalResults: original.length,
    expandedResults: allResults.size,
    improvement: allResults.size - original.length,
    usefulExpansions
  };
}