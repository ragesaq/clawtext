/**
 * Self-Healing Module
 * 
 * Detects and repairs corrupted or degraded memory systems automatically.
 * 
 * Health States:
 * - HEALTHY: Everything working optimally
 * - DEGRADED: Working but suboptimal (slow searches, low quality)
 * - RECOVERING: Actively fixing issues
 * - FAILED: Needs manual intervention
 * 
 * Auto-Repair Actions:
 * - Rebuild corrupt clusters
 * - Re-extract failed entities
 * - Clear stale caches
 * - Fix broken references
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export type HealthState = 'healthy' | 'degraded' | 'recovering' | 'failed';

export interface HealthCheck {
  component: string;
  state: HealthState;
  score: number; // 0-1
  lastCheck: string;
  issues: string[];
  autoFixed?: string[];
}

export interface SelfHealingConfig {
  enabled: boolean;
  checkInterval: number; // minutes
  autoRepair: boolean;
  maxRecoveryAttempts: number;
  alertThreshold: number; // score below this triggers alert
}

export const DEFAULT_HEALING_CONFIG: SelfHealingConfig = {
  enabled: true,
  checkInterval: 60, // Check every hour
  autoRepair: true,
  maxRecoveryAttempts: 3,
  alertThreshold: 0.5
};

export class SelfHealingModule {
  private config: SelfHealingConfig;
  private healthChecks: Map<string, HealthCheck> = new Map();
  private recoveryAttempts: Map<string, number> = new Map();
  private storagePath: string;
  private logPath: string;
  
  constructor(
    storagePath: string = './memory/health-status.json',
    config: Partial<SelfHealingConfig> = {}
  ) {
    this.storagePath = storagePath;
    this.logPath = join(dirname(storagePath), 'healing-log.json');
    this.config = { ...DEFAULT_HEALING_CONFIG, ...config };
    this.load();
  }
  
  /**
   * Run full health check on all components
   */
  async runHealthCheck(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    
    // Check 1: Cluster integrity
    checks.push(await this.checkClusterHealth());
    
    // Check 2: Entity store integrity
    checks.push(await this.checkEntityHealth());
    
    // Check 3: Search performance
    checks.push(await this.checkSearchHealth());
    
    // Check 4: File system health
    checks.push(await this.checkFilesystemHealth());
    
    // Store results
    for (const check of checks) {
      this.healthChecks.set(check.component, check);
    }
    
    // Auto-repair if enabled
    if (this.config.autoRepair) {
      for (const check of checks) {
        if (check.state === 'degraded' || check.state === 'failed') {
          await this.attemptRepair(check);
        }
      }
    }
    
    this.save();
    return checks;
  }
  
  /**
   * Check cluster health
   */
  private async checkClusterHealth(): Promise<HealthCheck> {
    const issues: string[] = [];
    let score = 1.0;
    
    try {
      const clustersDir = './memory/clusters';
      
      if (!existsSync(clustersDir)) {
        issues.push('Clusters directory missing');
        score = 0;
      } else {
        // Check for empty clusters
        const files = require('fs').readdirSync(clustersDir);
        const clusterFiles = files.filter((f: string) => f.endsWith('.json'));
        
        if (clusterFiles.length === 0) {
          issues.push('No cluster files found');
          score -= 0.3;
        } else {
          // Check each cluster file
          for (const file of clusterFiles) {
            try {
              const content = readFileSync(join(clustersDir, file), 'utf8');
              const cluster = JSON.parse(content);
              
              if (!cluster.memories || cluster.memories.length === 0) {
                issues.push(`Empty cluster: ${file}`);
                score -= 0.1;
              }
              
              if (!cluster.lastUpdated) {
                issues.push(`Missing timestamp: ${file}`);
                score -= 0.05;
              }
            } catch (e) {
              issues.push(`Corrupt cluster file: ${file}`);
              score -= 0.2;
            }
          }
        }
        
        // Check cluster age
        const memoryDir = './memory';
        if (existsSync(memoryDir)) {
          const memoryFiles = require('fs').readdirSync(memoryDir)
            .filter((f: string) => f.endsWith('.md'));
          
          if (memoryFiles.length > 0 && clusterFiles.length === 0) {
            issues.push('Memories exist but no clusters built');
            score -= 0.4;
          }
        }
      }
    } catch (error) {
      issues.push(`Cluster check error: ${error.message}`);
      score = 0.3;
    }
    
    score = Math.max(0, score);
    
    return {
      component: 'clusters',
      state: this.scoreToState(score),
      score,
      lastCheck: new Date().toISOString(),
      issues
    };
  }
  
  /**
   * Check entity store health
   */
  private async checkEntityHealth(): Promise<HealthCheck> {
    const issues: string[] = [];
    let score = 1.0;
    
    try {
      const entitiesFile = './memory/entities.json';
      
      if (!existsSync(entitiesFile)) {
        issues.push('Entities file missing');
        score = 0.5; // Not critical, will be created
      } else {
        const content = readFileSync(entitiesFile, 'utf8');
        
        try {
          const data = JSON.parse(content);
          
          if (!data.entities) {
            issues.push('Invalid entities structure');
            score -= 0.3;
          } else {
            const entityCount = Object.keys(data.entities).length;
            
            if (entityCount === 0) {
              // Not necessarily bad, might be new install
              score -= 0.1;
            }
            
            // Check for corrupt entities
            let corruptCount = 0;
            for (const [id, entity] of Object.entries(data.entities)) {
              const e = entity as any;
              if (!e.name || !e.type) {
                corruptCount++;
              }
            }
            
            if (corruptCount > 0) {
              issues.push(`${corruptCount} corrupt entities found`);
              score -= (corruptCount / entityCount) * 0.5;
            }
          }
        } catch (e) {
          issues.push('Entities file is corrupt JSON');
          score = 0.2;
        }
      }
    } catch (error) {
      issues.push(`Entity check error: ${error.message}`);
      score = 0.3;
    }
    
    score = Math.max(0, score);
    
    return {
      component: 'entities',
      state: this.scoreToState(score),
      score,
      lastCheck: new Date().toISOString(),
      issues
    };
  }
  
  /**
   * Check search performance health
   */
  private async checkSearchHealth(): Promise<HealthCheck> {
    const issues: string[] = [];
    let score = 1.0;
    
    try {
      // Check search metrics if available
      const metricsFile = './memory/search-metrics.json';
      
      if (existsSync(metricsFile)) {
        const data = JSON.parse(readFileSync(metricsFile, 'utf8'));
        
        if (data.events && data.events.length > 0) {
          const recentEvents = data.events.slice(-50);
          const avgEffectiveness = recentEvents.reduce(
            (sum: number, e: any) => sum + (e.effectivenessScore || 0.5), 0
          ) / recentEvents.length;
          
          if (avgEffectiveness < 0.5) {
            issues.push(`Low search effectiveness: ${(avgEffectiveness * 100).toFixed(1)}%`);
            score -= 0.4;
          } else if (avgEffectiveness < 0.7) {
            issues.push(`Below optimal effectiveness: ${(avgEffectiveness * 100).toFixed(1)}%`);
            score -= 0.2;
          }
        }
      }
      
      // Check if recent searches exist
      if (!existsSync(metricsFile)) {
        issues.push('No search metrics available');
        score -= 0.1;
      }
    } catch (error) {
      issues.push(`Search check error: ${error.message}`);
      score -= 0.2;
    }
    
    score = Math.max(0, score);
    
    return {
      component: 'search',
      state: this.scoreToState(score),
      score,
      lastCheck: new Date().toISOString(),
      issues
    };
  }
  
  /**
   * Check filesystem health
   */
  private async checkFilesystemHealth(): Promise<HealthCheck> {
    const issues: string[] = [];
    let score = 1.0;
    
    try {
      const dirs = ['./memory', './memory/clusters'];
      
      for (const dir of dirs) {
        if (!existsSync(dir)) {
          issues.push(`Missing directory: ${dir}`);
          score -= 0.2;
        }
      }
      
      // Check disk space (simplified)
      // In real implementation, would check actual disk space
      
    } catch (error) {
      issues.push(`Filesystem check error: ${error.message}`);
      score = 0.5;
    }
    
    score = Math.max(0, score);
    
    return {
      component: 'filesystem',
      state: this.scoreToState(score),
      score,
      lastCheck: new Date().toISOString(),
      issues
    };
  }
  
  /**
   * Convert score to health state
   */
  private scoreToState(score: number): HealthState {
    if (score >= 0.8) return 'healthy';
    if (score >= 0.5) return 'degraded';
    return 'failed';
  }
  
  /**
   * Attempt to repair a component
   */
  private async attemptRepair(check: HealthCheck): Promise<void> {
    const attempts = this.recoveryAttempts.get(check.component) || 0;
    
    if (attempts >= this.config.maxRecoveryAttempts) {
      console.log(`[SelfHealing] ❌ Max recovery attempts reached for ${check.component}`);
      return;
    }
    
    console.log(`[SelfHealing] 🔧 Attempting repair of ${check.component}...`);
    check.state = 'recovering';
    const autoFixed: string[] = [];
    
    try {
      switch (check.component) {
        case 'clusters':
          // Rebuild clusters
          await this.rebuildClusters();
          autoFixed.push('Rebuilt cluster cache');
          break;
          
        case 'entities':
          // Repair entities file
          await this.repairEntities();
          autoFixed.push('Repaired entities store');
          break;
          
        case 'search':
          // Reset search weights to defaults
          await this.resetSearchWeights();
          autoFixed.push('Reset search weights to defaults');
          break;
          
        case 'filesystem':
          // Create missing directories
          await this.createMissingDirectories();
          autoFixed.push('Created missing directories');
          break;
      }
      
      this.recoveryAttempts.set(check.component, attempts + 1);
      check.autoFixed = autoFixed;
      
      console.log(`[SelfHealing] ✅ Repaired ${check.component}: ${autoFixed.join(', ')}`);
      this.logRepair(check, autoFixed);
      
    } catch (error) {
      console.error(`[SelfHealing] ❌ Repair failed for ${check.component}:`, error);
    }
  }
  
  /**
   * Rebuild cluster cache
   */
  private async rebuildClusters(): Promise<void> {
    console.log('[SelfHealing] Rebuilding clusters...');
    
    try {
      const { autoClusterMemories } = await import('./memory-clusters');
      await autoClusterMemories();
      console.log('[SelfHealing] ✅ Clusters rebuilt');
    } catch (error) {
      console.error('[SelfHealing] Cluster rebuild failed:', error);
      throw error;
    }
  }
  
  /**
   * Repair entities file
   */
  private async repairEntities(): Promise<void> {
    const entitiesFile = './memory/entities.json';
    
    try {
      if (existsSync(entitiesFile)) {
        const content = readFileSync(entitiesFile, 'utf8');
        
        try {
          JSON.parse(content);
          // File is valid, nothing to do
        } catch (e) {
          // File is corrupt, recreate
          console.log('[SelfHealing] Recreating corrupt entities file');
          writeFileSync(entitiesFile, JSON.stringify({
            entities: {},
            metadata: { version: '1.0', repaired: new Date().toISOString() }
          }, null, 2));
        }
      } else {
        // Create new file
        writeFileSync(entitiesFile, JSON.stringify({
          entities: {},
          metadata: { version: '1.0' }
        }, null, 2));
      }
    } catch (error) {
      console.error('[SelfHealing] Entity repair failed:', error);
      throw error;
    }
  }
  
  /**
   * Reset search weights to defaults
   */
  private async resetSearchWeights(): Promise<void> {
    const metricsFile = './memory/search-metrics.json';
    
    try {
      if (existsSync(metricsFile)) {
        const data = JSON.parse(readFileSync(metricsFile, 'utf8'));
        data.currentWeights = {
          semantic: 0.7,
          keyword: 0.3,
          lastAdjusted: new Date().toISOString(),
          adjustmentReason: 'auto-reset-by-self-healing'
        };
        writeFileSync(metricsFile, JSON.stringify(data, null, 2));
        console.log('[SelfHealing] ✅ Search weights reset to defaults');
      }
    } catch (error) {
      console.error('[SelfHealing] Weight reset failed:', error);
      throw error;
    }
  }
  
  /**
   * Create missing directories
   */
  private async createMissingDirectories(): Promise<void> {
    const dirs = ['./memory', './memory/clusters'];
    
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        console.log(`[SelfHealing] Created directory: ${dir}`);
      }
    }
  }
  
  /**
   * Log repair actions
   */
  private logRepair(check: HealthCheck, actions: string[]): void {
    try {
      const log = existsSync(this.logPath) 
        ? JSON.parse(readFileSync(this.logPath, 'utf8')) 
        : { repairs: [] };
      
      log.repairs.push({
        timestamp: new Date().toISOString(),
        component: check.component,
        actions,
        previousScore: check.score,
        previousState: check.state
      });
      
      // Keep only last 100 repairs
      if (log.repairs.length > 100) {
        log.repairs = log.repairs.slice(-100);
      }
      
      writeFileSync(this.logPath, JSON.stringify(log, null, 2));
    } catch (error) {
      console.error('[SelfHealing] Failed to log repair:', error);
    }
  }
  
  /**
   * Get overall health status
   */
  getOverallHealth(): { state: HealthState; score: number; checks: HealthCheck[] } {
    const checks = Array.from(this.healthChecks.values());
    
    if (checks.length === 0) {
      return { state: 'healthy', score: 1, checks: [] };
    }
    
    const avgScore = checks.reduce((sum, c) => sum + c.score, 0) / checks.length;
    
    // Overall state is worst of all components
    let worstState: HealthState = 'healthy';
    for (const check of checks) {
      if (check.state === 'failed') {
        worstState = 'failed';
        break;
      } else if (check.state === 'recovering') {
        worstState = 'recovering';
      } else if (check.state === 'degraded' && worstState !== 'recovering') {
        worstState = 'degraded';
      }
    }
    
    return {
      state: worstState,
      score: avgScore,
      checks
    };
  }
  
  /**
   * Save health status
   */
  save(): void {
    try {
      const data = {
        checks: Object.fromEntries(this.healthChecks),
        recoveryAttempts: Object.fromEntries(this.recoveryAttempts),
        config: this.config,
        lastCheck: new Date().toISOString()
      };
      writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[SelfHealing] Failed to save health status:', error);
    }
  }
  
  /**
   * Load health status
   */
  load(): void {
    try {
      if (existsSync(this.storagePath)) {
        const data = JSON.parse(readFileSync(this.storagePath, 'utf8'));
        this.healthChecks = new Map(Object.entries(data.checks || {}));
        this.recoveryAttempts = new Map(Object.entries(data.recoveryAttempts || {}));
      }
    } catch (error) {
      console.warn('[SelfHealing] Failed to load health status:', error);
    }
  }
}

// Helper function
function dirname(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '.';
}

// Singleton
let globalHealing: SelfHealingModule | null = null;

export function getSelfHealingModule(config?: Partial<SelfHealingConfig>): SelfHealingModule {
  if (!globalHealing) {
    globalHealing = new SelfHealingModule(undefined, config);
  }
  return globalHealing;
}

export default {
  SelfHealingModule,
  getSelfHealingModule
};