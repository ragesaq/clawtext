/**
 * Smart Memory Consolidation
 * 
 * Automatically compresses old memories while preserving key facts.
 * 
 * Strategy:
 * 1. Identify old/low-value memories (based on age, access frequency, importance)
 * 2. Extract key facts using entity extraction
 * 3. Create compressed summary
 * 4. Archive original, keep summary in active memory
 * 5. Maintain links for full reconstruction if needed
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { join } from 'path';

export interface ConsolidationConfig {
  enabled: boolean;
  ageThreshold: number; // Days before considering for consolidation
  minAccessCount: number; // Must be accessed at least this many times to keep
  compressionRatio: number; // Target compression (0.5 = 50% smaller)
  preserveTypes: string[]; // Never consolidate these types
  archiveDir: string;
}

export interface MemoryStats {
  path: string;
  created: string;
  lastAccessed: string;
  accessCount: number;
  size: number;
  importanceScore: number;
}

export interface ConsolidatedMemory {
  originalPath: string;
  archivePath: string;
  summary: string;
  keyFacts: string[];
  entities: string[];
  compressionRatio: number;
  consolidatedAt: string;
}

export const DEFAULT_CONSOLIDATION_CONFIG: ConsolidationConfig = {
  enabled: true,
  ageThreshold: 90, // 3 months
  minAccessCount: 3, // Must be accessed at least 3 times
  compressionRatio: 0.6, // 60% of original size
  preserveTypes: ['decision', 'preference', 'project_context'],
  archiveDir: './memory/archive'
};

export class MemoryConsolidator {
  private config: ConsolidationConfig;
  private accessLog: Map<string, { count: number; lastAccessed: string }> = new Map();
  private consolidationLog: ConsolidatedMemory[] = [];
  private storagePath: string;
  
  constructor(
    storagePath: string = './memory/consolidation-log.json',
    config: Partial<ConsolidationConfig> = {}
  ) {
    this.storagePath = storagePath;
    this.config = { ...DEFAULT_CONSOLIDATION_CONFIG, ...config };
    this.load();
  }
  
  /**
   * Record memory access for tracking
   */
  recordAccess(memoryPath: string): void {
    const existing = this.accessLog.get(memoryPath) || {
      count: 0,
      lastAccessed: new Date().toISOString()
    };
    
    existing.count++;
    existing.lastAccessed = new Date().toISOString();
    
    this.accessLog.set(memoryPath, existing);
    
    // Save every 10 accesses
    if (existing.count % 10 === 0) {
      this.save();
    }
  }
  
  /**
   * Analyze memory file for consolidation candidacy
   */
  analyzeMemory(filePath: string, content: string): MemoryStats | null {
    try {
      // Extract date from filename (memory/YYYY-MM-DD.md)
      const dateMatch = filePath.match(/(\d{4}-\d{2}-\d{2})/);
      const created = dateMatch ? dateMatch[1] : new Date().toISOString();
      
      // Get access stats
      const access = this.accessLog.get(filePath) || {
        count: 0,
        lastAccessed: created
      };
      
      // Calculate age
      const age = (Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24);
      
      // Calculate importance score (0-1)
      // Factors: recency, access frequency, content signals
      let importanceScore = 0.5;
      
      // Boost for recent access
      const daysSinceAccess = (Date.now() - new Date(access.lastAccessed).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceAccess < 7) importanceScore += 0.2;
      if (daysSinceAccess < 30) importanceScore += 0.1;
      
      // Boost for frequent access
      if (access.count > 10) importanceScore += 0.2;
      if (access.count > 5) importanceScore += 0.1;
      
      // Boost for important keywords
      const importantSignals = [
        /decided|decision/i,
        /important|critical|key/i,
        /architecture|design/i,
        /bug|fix|issue|error/i
      ];
      
      for (const signal of importantSignals) {
        if (signal.test(content)) {
          importanceScore += 0.05;
        }
      }
      
      // Check for type in content (frontmatter or text)
      const typeMatch = content.match(/type:\s*(\w+)/);
      if (typeMatch && this.config.preserveTypes.includes(typeMatch[1])) {
        importanceScore = 1.0; // Never consolidate
      }
      
      importanceScore = Math.min(1, importanceScore);
      
      return {
        path: filePath,
        created,
        lastAccessed: access.lastAccessed,
        accessCount: access.count,
        size: content.length,
        importanceScore
      };
      
    } catch (error) {
      console.error(`[Consolidation] Failed to analyze ${filePath}:`, error);
      return null;
    }
  }
  
  /**
   * Determine if memory should be consolidated
   */
  shouldConsolidate(stats: MemoryStats): boolean {
    // Check age threshold
    const age = (Date.now() - new Date(stats.created).getTime()) / (1000 * 60 * 60 * 24);
    if (age < this.config.ageThreshold) return false;
    
    // Check access frequency
    if (stats.accessCount >= this.config.minAccessCount) return false;
    
    // Check importance score
    if (stats.importanceScore > 0.7) return false;
    
    // Check if already consolidated
    const alreadyConsolidated = this.consolidationLog.some(
      c => c.originalPath === stats.path
    );
    if (alreadyConsolidated) return false;
    
    return true;
  }
  
  /**
   * Consolidate a single memory file
   */
  async consolidateMemory(filePath: string, content: string): Promise<ConsolidatedMemory | null> {
    try {
      console.log(`[Consolidation] Processing: ${filePath}`);
      
      // Extract key facts
      const keyFacts = this.extractKeyFacts(content);
      
      // Extract entities
      const entities = this.extractEntityNames(content);
      
      // Create summary
      const summary = this.createSummary(content, keyFacts);
      
      // Calculate compression
      const originalSize = content.length;
      const summarySize = summary.length;
      const compressionRatio = summarySize / originalSize;
      
      // Ensure archive directory exists
      if (!existsSync(this.config.archiveDir)) {
        mkdirSync(this.config.archiveDir, { recursive: true });
      }
      
      // Generate archive path
      const fileName = filePath.split('/').pop() || 'memory.md';
      const archivePath = join(this.config.archiveDir, `${fileName}.archive`);
      
      // Archive original
      writeFileSync(archivePath, content);
      
      // Create consolidated version
      const consolidated: ConsolidatedMemory = {
        originalPath: filePath,
        archivePath,
        summary,
        keyFacts,
        entities,
        compressionRatio,
        consolidatedAt: new Date().toISOString()
      };
      
      // Write consolidated version to original path
      const consolidatedContent = this.formatConsolidated(consolidated, content);
      writeFileSync(filePath, consolidatedContent);
      
      // Log consolidation
      this.consolidationLog.push(consolidated);
      this.save();
      
      console.log(`[Consolidation] ✅ Consolidated: ${filePath} (${(compressionRatio * 100).toFixed(1)}% of original)`);
      
      return consolidated;
      
    } catch (error) {
      console.error(`[Consolidation] ❌ Failed to consolidate ${filePath}:`, error);
      return null;
    }
  }
  
  /**
   * Extract key facts from memory content
   */
  private extractKeyFacts(content: string): string[] {
    const facts: string[] = [];
    
    // Look for decision patterns
    const decisionMatches = content.match(/(?:decided|decision):?\s*(.+)/gi);
    if (decisionMatches) {
      facts.push(...decisionMatches.slice(0, 3));
    }
    
    // Look for action items
    const actionMatches = content.match(/(?:action|todo|task):?\s*(.+)/gi);
    if (actionMatches) {
      facts.push(...actionMatches.slice(0, 2));
    }
    
    // Look for key findings
    const findingMatches = content.match(/(?:finding|discovered|learned):?\s*(.+)/gi);
    if (findingMatches) {
      facts.push(...findingMatches.slice(0, 2));
    }
    
    // Extract first paragraph if short
    const firstParagraph = content.split('\n\n')[0];
    if (firstParagraph && firstParagraph.length < 200 && facts.length === 0) {
      facts.push(firstParagraph);
    }
    
    return facts.slice(0, 5); // Max 5 facts
  }
  
  /**
   * Extract entity names from content
   */
  private extractEntityNames(content: string): string[] {
    const entities: string[] = [];
    
    // Pattern: Entity is/worked at/did something
    const patterns = [
      /(\w+) works? at/i,
      /(\w+) is an? \w+ at/i,
      /(\w+) (?:is|was) (?:the|a)n? \w+/i,
      /(?:Project|System) (\w+)/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && !entities.includes(match[1])) {
        entities.push(match[1]);
      }
    }
    
    return entities.slice(0, 5);
  }
  
  /**
   * Create a summary of the memory
   */
  private createSummary(content: string, keyFacts: string[]): string {
    const parts: string[] = [];
    
    // Add type/context if available
    const typeMatch = content.match(/type:\s*(\w+)/);
    if (typeMatch) {
      parts.push(`[${typeMatch[1]}]`);
    }
    
    // Add first sentence
    const firstSentence = content.split('.')[0];
    if (firstSentence && firstSentence.length < 150) {
      parts.push(firstSentence.trim());
    }
    
    // Add key facts if summary is still short
    if (parts.join(' ').length < 200 && keyFacts.length > 0) {
      parts.push('Key facts:', ...keyFacts.map(f => `- ${f.trim()}`));
    }
    
    return parts.join('\n');
  }
  
  /**
   * Format consolidated memory file
   */
  private formatConsolidated(consolidated: ConsolidatedMemory, originalContent: string): string {
    const lines: string[] = [
      '---',
      `consolidated: true`,
      `consolidated_at: ${consolidated.consolidatedAt}`,
      `archive_path: ${consolidated.archivePath}`,
      `compression_ratio: ${consolidated.compressionRatio.toFixed(2)}`,
      '---',
      '',
      '# Summary',
      consolidated.summary,
      ''
    ];
    
    if (consolidated.keyFacts.length > 0) {
      lines.push('## Key Facts');
      for (const fact of consolidated.keyFacts) {
        lines.push(`- ${fact}`);
      }
      lines.push('');
    }
    
    if (consolidated.entities.length > 0) {
      lines.push('## Entities');
      lines.push(consolidated.entities.join(', '));
      lines.push('');
    }
    
    lines.push('---');
    lines.push(`*Original content archived at: ${consolidated.archivePath}*`);
    
    return lines.join('\n');
  }
  
  /**
   * Run consolidation on all eligible memories
   */
  async runConsolidation(memoryDir: string = './memory'): Promise<{
    scanned: number;
    consolidated: number;
    saved: number;
  }> {
    const result = {
      scanned: 0,
      consolidated: 0,
      saved: 0
    };
    
    try {
      const { readdirSync } = require('fs');
      const files = readdirSync(memoryDir);
      const mdFiles = files.filter((f: string) => f.endsWith('.md') && !f.includes('archive'));
      
      console.log(`[Consolidation] Scanning ${mdFiles.length} memory files...`);
      
      for (const file of mdFiles) {
        const filePath = join(memoryDir, file);
        
        try {
          const content = readFileSync(filePath, 'utf8');
          
          // Skip if already consolidated
          if (content.includes('consolidated: true')) continue;
          
          result.scanned++;
          
          const stats = this.analyzeMemory(filePath, content);
          if (stats && this.shouldConsolidate(stats)) {
            const consolidated = await this.consolidateMemory(filePath, content);
            if (consolidated) {
              result.consolidated++;
              result.saved += (stats.size - (stats.size * consolidated.compressionRatio));
            }
          }
        } catch (error) {
          console.error(`[Consolidation] Error processing ${file}:`, error);
        }
      }
      
      console.log(`[Consolidation] Complete: ${result.consolidated} files consolidated, ${(result.saved / 1024).toFixed(1)}KB saved`);
      
    } catch (error) {
      console.error('[Consolidation] Failed to run consolidation:', error);
    }
    
    return result;
  }
  
  /**
   * Restore archived memory to original
   */
  restoreMemory(consolidatedPath: string): boolean {
    try {
      const consolidated = this.consolidationLog.find(
        c => c.originalPath === consolidatedPath
      );
      
      if (!consolidated) {
        console.error(`[Consolidation] No archive found for: ${consolidatedPath}`);
        return false;
      }
      
      if (!existsSync(consolidated.archivePath)) {
        console.error(`[Consolidation] Archive missing: ${consolidated.archivePath}`);
        return false;
      }
      
      // Restore original
      const originalContent = readFileSync(consolidated.archivePath, 'utf8');
      writeFileSync(consolidatedPath, originalContent);
      
      // Remove from consolidation log
      this.consolidationLog = this.consolidationLog.filter(
        c => c.originalPath !== consolidatedPath
      );
      this.save();
      
      console.log(`[Consolidation] ✅ Restored: ${consolidatedPath}`);
      return true;
      
    } catch (error) {
      console.error(`[Consolidation] ❌ Restore failed:`, error);
      return false;
    }
  }
  
  /**
   * Get consolidation statistics
   */
  getStats(): {
    totalConsolidated: number;
    totalSpaceSaved: number;
    avgCompression: number;
  } {
    if (this.consolidationLog.length === 0) {
      return { totalConsolidated: 0, totalSpaceSaved: 0, avgCompression: 0 };
    }
    
    const totalSaved = this.consolidationLog.reduce(
      (sum, c) => sum + (1 - c.compressionRatio),
      0
    );
    
    return {
      totalConsolidated: this.consolidationLog.length,
      totalSpaceSaved: totalSaved,
      avgCompression: this.consolidationLog.reduce((sum, c) => sum + c.compressionRatio, 0) / this.consolidationLog.length
    };
  }
  
  /**
   * Save state
   */
  save(): void {
    try {
      const data = {
        accessLog: Object.fromEntries(this.accessLog),
        consolidationLog: this.consolidationLog,
        config: this.config,
        lastRun: new Date().toISOString()
      };
      writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[Consolidation] Failed to save:', error);
    }
  }
  
  /**
   * Load state
   */
  load(): void {
    try {
      if (existsSync(this.storagePath)) {
        const data = JSON.parse(readFileSync(this.storagePath, 'utf8'));
        this.accessLog = new Map(Object.entries(data.accessLog || {}));
        this.consolidationLog = data.consolidationLog || [];
      }
    } catch (error) {
      console.warn('[Consolidation] Failed to load, starting fresh:', error);
    }
  }
}

// Singleton
let globalConsolidator: MemoryConsolidator | null = null;

export function getMemoryConsolidator(config?: Partial<ConsolidationConfig>): MemoryConsolidator {
  if (!globalConsolidator) {
    globalConsolidator = new MemoryConsolidator(undefined, config);
  }
  return globalConsolidator;
}

export default {
  MemoryConsolidator,
  getMemoryConsolidator
};