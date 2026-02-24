/**
 * Temporal Decay
 * 
 * Memories lose relevance over time unless reinforced.
 * Inspired by QMD's optional temporal decay feature.
 * 
 * Formula: decayed_score = original_score * e^(-λ * age_days)
 * where λ is the decay rate (higher = faster decay)
 */

export interface DecayConfig {
  enabled: boolean;
  decayRate: number; // λ (lambda) - higher = faster decay
  maxAgeDays: number; // Memories older than this get minimum score
  minScore: number; // Minimum score after decay
  recencyBoost: boolean; // Boost very recent memories
  recencyWindowDays: number; // Window for recency boost
}

export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  enabled: true,
  decayRate: 0.1, // 10% decay per day
  maxAgeDays: 90, // After 90 days, minimum score
  minScore: 0.1, // Don't go below 0.1
  recencyBoost: true,
  recencyWindowDays: 7 // Boost memories from last week
};

/**
 * Calculate decayed score based on memory age
 */
export function calculateDecayedScore(
  originalScore: number,
  ageDays: number,
  config: Partial<DecayConfig> = {}
): number {
  const mergedConfig = { ...DEFAULT_DECAY_CONFIG, ...config };
  
  if (!mergedConfig.enabled) {
    return originalScore;
  }
  
  // Apply exponential decay
  const decayFactor = Math.exp(-mergedConfig.decayRate * ageDays);
  let decayedScore = originalScore * decayFactor;
  
  // Apply minimum score floor
  decayedScore = Math.max(decayedScore, mergedConfig.minScore);
  
  // Apply maximum age cap
  if (ageDays > mergedConfig.maxAgeDays) {
    decayedScore = mergedConfig.minScore;
  }
  
  return decayedScore;
}

/**
 * Calculate recency boost
 */
export function calculateRecencyBoost(
  ageDays: number,
  config: Partial<DecayConfig> = {}
): number {
  const mergedConfig = { ...DEFAULT_DECAY_CONFIG, ...config };
  
  if (!mergedConfig.recencyBoost) {
    return 1.0;
  }
  
  if (ageDays <= 1) {
    return 1.3; // 30% boost for today
  } else if (ageDays <= 3) {
    return 1.2; // 20% boost for last 3 days
  } else if (ageDays <= mergedConfig.recencyWindowDays) {
    return 1.1; // 10% boost for last week
  }
  
  return 1.0; // No boost
}

/**
 * Apply temporal decay to search results
 */
export function applyTemporalDecay(
  results: Array<{
    id: string;
    score: number;
    path?: string;
    metadata?: { timestamp?: string; created?: string };
  }>,
  config: Partial<DecayConfig> = {}
): Array<{ id: string; score: number; originalScore: number; ageDays: number }> {
  return results.map(result => {
    // Extract age from path or metadata
    const ageDays = extractAgeFromResult(result);
    
    // Calculate decayed score
    const decayedScore = calculateDecayedScore(result.score, ageDays, config);
    
    // Apply recency boost
    const recencyBoost = calculateRecencyBoost(ageDays, config);
    const finalScore = decayedScore * recencyBoost;
    
    return {
      id: result.id,
      score: finalScore,
      originalScore: result.score,
      ageDays
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Extract age in days from a result
 */
function extractAgeFromResult(result: {
  path?: string;
  metadata?: { timestamp?: string; created?: string };
}): number {
  // Try metadata first
  if (result.metadata?.timestamp) {
    const date = new Date(result.metadata.timestamp);
    return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  }
  
  if (result.metadata?.created) {
    const date = new Date(result.metadata.created);
    return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  }
  
  // Try extracting from path (memory/YYYY-MM-DD.md)
  if (result.path) {
    const match = result.path.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const date = new Date(match[1]);
      return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    }
  }
  
  // Default: assume today
  return 0;
}

/**
 * Calculate optimal decay rate based on usage patterns
 */
export function calculateOptimalDecayRate(
  accessFrequency: number, // accesses per day
  importanceScore: number // 0-1 importance
): number {
  // High frequency + high importance = slow decay
  // Low frequency + low importance = fast decay
  
  const baseRate = 0.1; // 10% per day
  const frequencyFactor = Math.max(0.5, 1 - accessFrequency * 0.1);
  const importanceFactor = 0.5 + importanceScore * 0.5;
  
  return baseRate * frequencyFactor * importanceFactor;
}

/**
 * Memory freshness score (0-1)
 * Combines age, access frequency, and importance
 */
export function calculateFreshness(
  ageDays: number,
  accessCount: number,
  importanceScore: number,
  config: Partial<DecayConfig> = {}
): number {
  const mergedConfig = { ...DEFAULT_DECAY_CONFIG, ...config };
  
  // Base decay
  const decayFactor = Math.exp(-mergedConfig.decayRate * ageDays);
  
  // Access frequency boost (more accesses = fresher)
  const accessBoost = Math.min(accessCount * 0.1, 0.5);
  
  // Importance preservation
  const importanceFactor = 0.5 + importanceScore * 0.5;
  
  // Combine
  const freshness = (decayFactor + accessBoost) * importanceFactor;
  
  return Math.min(Math.max(freshness, 0), 1);
}

export default {
  calculateDecayedScore,
  calculateRecencyBoost,
  applyTemporalDecay,
  calculateOptimalDecayRate,
  calculateFreshness,
  DEFAULT_DECAY_CONFIG
};