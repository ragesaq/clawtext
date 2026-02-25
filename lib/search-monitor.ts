/**
 * Search Effectiveness Monitor
 * 
 * Tracks search performance and automatically tunes weights for optimal results.
 * 
 * How it works:
 * 1. Track every search (query, results, user behavior)
 * 2. Detect success/failure signals (clicks, follow-up queries, session length)
 * 3. Adjust BM25 vs Semantic weights based on query patterns
 * 4. Auto-tune without user intervention
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface SearchEvent {
  id: string;
  timestamp: string;
  query: string;
  queryType: 'technical' | 'vague' | 'factual' | 'exploratory';
  resultsCount: number;
  avgConfidence: number;
  weights: {
    semantic: number;
    keyword: number;
  };
  // Success signals
  clickedResult?: boolean;
  followUpQuery?: string;
  sessionExtended?: boolean;
  contextUsed?: boolean;
  // Calculated score
  effectivenessScore?: number;
}

export interface WeightConfig {
  semantic: number;
  keyword: number;
  lastAdjusted: string;
  adjustmentReason: string;
}

export interface SearchMetrics {
  totalSearches: number;
  avgEffectiveness: number;
  byQueryType: Record<string, {
    count: number;
    avgEffectiveness: number;
    optimalWeights: { semantic: number; keyword: number };
  }>;
}

const DEFAULT_WEIGHTS: WeightConfig = {
  semantic: 0.7,
  keyword: 0.3,
  lastAdjusted: new Date().toISOString(),
  adjustmentReason: 'default'
};

export class SearchEffectivenessMonitor {
  private events: SearchEvent[] = [];
  private currentWeights: WeightConfig = { ...DEFAULT_WEIGHTS };
  private storagePath: string;
  private maxEvents: number = 1000; // Keep last 1000 searches
  
  constructor(storagePath: string = './memory/search-metrics.json') {
    this.storagePath = storagePath;
    this.load();
  }
  
  /**
   * Classify query type for pattern analysis
   */
  classifyQuery(query: string): SearchEvent['queryType'] {
    const technicalTerms = /\b(api|config|database|server|endpoint|function|class|method|error|bug|fix)\b/i;
    const questionWords = /\b(how|what|why|when|where|who|which)\b/i;
    const vagueTerms = /\b(thing|stuff|something|anything|it|that|this)\b/i;
    const exploratory = /\b(explore|find|discover|learn about|research)\b/i;
    
    if (technicalTerms.test(query)) return 'technical';
    if (exploratory.test(query)) return 'exploratory';
    if (vagueTerms.test(query)) return 'vague';
    if (questionWords.test(query)) return 'factual';
    return 'exploratory';
  }
  
  /**
   * Record a search event
   */
  recordSearch(
    query: string,
    results: { count: number; avgScore: number },
    weights: { semantic: number; keyword: number }
  ): string {
    const event: SearchEvent = {
      id: `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      query,
      queryType: this.classifyQuery(query),
      resultsCount: results.count,
      avgConfidence: results.avgScore,
      weights: { ...weights }
    };
    
    this.events.push(event);
    
    // Trim old events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
    
    // Auto-save every 10 searches
    if (this.events.length % 10 === 0) {
      this.save();
    }
    
    return event.id;
  }
  
  /**
   * Record success signals for a search
   */
  recordSuccess(
    searchId: string,
    signals: {
      clickedResult?: boolean;
      followUpQuery?: string;
      sessionExtended?: boolean;
      contextUsed?: boolean;
    }
  ): void {
    const event = this.events.find(e => e.id === searchId);
    if (!event) return;
    
    // Calculate effectiveness score (0-1)
    let score = 0.5; // Neutral baseline
    
    if (signals.clickedResult) score += 0.2;
    if (signals.contextUsed) score += 0.3;
    if (signals.sessionExtended) score += 0.15;
    if (!signals.followUpQuery) score += 0.15; // No follow-up = found what needed
    else score -= 0.1; // Follow-up might indicate failure
    
    event.effectivenessScore = Math.min(1, Math.max(0, score));
    event.clickedResult = signals.clickedResult;
    event.followUpQuery = signals.followUpQuery;
    event.sessionExtended = signals.sessionExtended;
    event.contextUsed = signals.contextUsed;
    
    // Check if we should auto-tune
    this.checkAndTuneWeights();
  }
  
  /**
   * Check if weights need adjustment and tune them
   */
  private checkAndTuneWeights(): void {
    // Need at least 20 recent searches with scores
    const scoredEvents = this.events.filter(e => e.effectivenessScore !== undefined);
    if (scoredEvents.length < 20) return;
    
    // Get recent events (last 50)
    const recent = scoredEvents.slice(-50);
    const avgEffectiveness = recent.reduce((sum, e) => sum + (e.effectivenessScore || 0), 0) / recent.length;
    
    // If effectiveness is good (>0.7), don't change
    if (avgEffectiveness > 0.7) return;
    
    // Analyze by query type
    const byType = this.analyzeByQueryType(recent);
    
    // Adjust weights based on patterns
    let newSemantic = this.currentWeights.semantic;
    let newKeyword = this.currentWeights.keyword;
    let reason = '';
    
    // Pattern 1: Technical queries performing poorly → boost keyword weight
    if (byType.technical?.avgEffectiveness < 0.5) {
      newKeyword = Math.min(0.5, newKeyword + 0.05);
      newSemantic = 1 - newKeyword;
      reason = 'technical queries underperforming';
    }
    
    // Pattern 2: Vague queries performing poorly → boost semantic weight
    if (byType.vague?.avgEffectiveness < 0.5) {
      newSemantic = Math.min(0.8, newSemantic + 0.05);
      newKeyword = 1 - newSemantic;
      reason = 'vague queries underperforming';
    }
    
    // Pattern 3: Overall poor performance → try balanced approach
    if (avgEffectiveness < 0.4 && reason === '') {
      newSemantic = 0.6;
      newKeyword = 0.4;
      reason = 'overall poor performance';
    }
    
    // Only update if there's a meaningful change
    if (reason && (Math.abs(newSemantic - this.currentWeights.semantic) > 0.02)) {
      this.currentWeights = {
        semantic: newSemantic,
        keyword: newKeyword,
        lastAdjusted: new Date().toISOString(),
        adjustmentReason: reason
      };
      
      console.log(`[SearchMonitor] 🔧 Auto-tuned weights: semantic=${newSemantic.toFixed(2)}, keyword=${newKeyword.toFixed(2)} (${reason})`);
      this.save();
    }
  }
  
  /**
   * Analyze effectiveness by query type
   */
  private analyzeByQueryType(events: SearchEvent[]): Record<string, { count: number; avgEffectiveness: number }> {
    const byType: Record<string, { count: number; totalScore: number }> = {};
    
    for (const event of events) {
      const type = event.queryType;
      if (!byType[type]) {
        byType[type] = { count: 0, totalScore: 0 };
      }
      byType[type].count++;
      byType[type].totalScore += event.effectivenessScore || 0;
    }
    
    // Calculate averages
    const result: Record<string, { count: number; avgEffectiveness: number }> = {};
    for (const [type, data] of Object.entries(byType)) {
      result[type] = {
        count: data.count,
        avgEffectiveness: data.count > 0 ? data.totalScore / data.count : 0
      };
    }
    
    return result;
  }
  
  /**
   * Get optimal weights for a query
   */
  getOptimalWeights(query: string): { semantic: number; keyword: number } {
    const queryType = this.classifyQuery(query);
    const byType = this.analyzeByQueryType(
      this.events.filter(e => e.effectivenessScore !== undefined).slice(-100)
    );
    
    // If we have data for this query type with good performance, use type-specific weights
    const typeData = byType[queryType];
    if (typeData && typeData.count >= 10 && typeData.avgEffectiveness > 0.6) {
      // Find best performing weights for this query type
      const typeEvents = this.events.filter(e => 
        e.queryType === queryType && e.effectivenessScore !== undefined && e.effectivenessScore > 0.7
      );
      
      if (typeEvents.length > 0) {
        // Average the weights of successful searches
        const avgSemantic = typeEvents.reduce((sum, e) => sum + e.weights.semantic, 0) / typeEvents.length;
        const avgKeyword = typeEvents.reduce((sum, e) => sum + e.weights.keyword, 0) / typeEvents.length;
        
        return {
          semantic: Math.round(avgSemantic * 100) / 100,
          keyword: Math.round(avgKeyword * 100) / 100
        };
      }
    }
    
    // Fall back to current auto-tuned weights
    return {
      semantic: this.currentWeights.semantic,
      keyword: this.currentWeights.keyword
    };
  }
  
  /**
   * Get metrics report
   */
  getMetrics(): SearchMetrics {
    const scoredEvents = this.events.filter(e => e.effectivenessScore !== undefined);
    const byType = this.analyzeByQueryType(scoredEvents);
    
    // Calculate optimal weights per type
    const byTypeWithWeights: SearchMetrics['byQueryType'] = {};
    for (const [type, data] of Object.entries(byType)) {
      const typeEvents = this.events.filter(e => 
        e.queryType === type && e.effectivenessScore !== undefined && e.effectivenessScore > 0.7
      );
      
      const optimalWeights = typeEvents.length > 0 ? {
        semantic: typeEvents.reduce((sum, e) => sum + e.weights.semantic, 0) / typeEvents.length,
        keyword: typeEvents.reduce((sum, e) => sum + e.weights.keyword, 0) / typeEvents.length
      } : { semantic: 0.7, keyword: 0.3 };
      
      byTypeWithWeights[type] = {
        count: data.count,
        avgEffectiveness: data.avgEffectiveness,
        optimalWeights
      };
    }
    
    return {
      totalSearches: this.events.length,
      avgEffectiveness: scoredEvents.length > 0 
        ? scoredEvents.reduce((sum, e) => sum + (e.effectivenessScore || 0), 0) / scoredEvents.length 
        : 0,
      byQueryType: byTypeWithWeights
    };
  }
  
  /**
   * Get current weights
   */
  getCurrentWeights(): WeightConfig {
    return { ...this.currentWeights };
  }
  
  /**
   * Save to disk
   */
  save(): void {
    try {
      const data = {
        events: this.events,
        currentWeights: this.currentWeights,
        lastUpdated: new Date().toISOString()
      };
      writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[SearchMonitor] Failed to save:', error);
    }
  }
  
  /**
   * Load from disk
   */
  load(): void {
    try {
      if (existsSync(this.storagePath)) {
        const data = JSON.parse(readFileSync(this.storagePath, 'utf8'));
        this.events = data.events || [];
        this.currentWeights = data.currentWeights || { ...DEFAULT_WEIGHTS };
      }
    } catch (error) {
      console.warn('[SearchMonitor] Failed to load, starting fresh:', error);
      this.events = [];
      this.currentWeights = { ...DEFAULT_WEIGHTS };
    }
  }
}

// Singleton instance
let globalMonitor: SearchEffectivenessMonitor | null = null;

export function getSearchMonitor(storagePath?: string): SearchEffectivenessMonitor {
  if (!globalMonitor) {
    globalMonitor = new SearchEffectivenessMonitor(storagePath);
  }
  return globalMonitor;
}

export default {
  SearchEffectivenessMonitor,
  getSearchMonitor
};