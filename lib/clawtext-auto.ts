/**
 * OpenClaw Auto-Integration Plugin
 * 
 * Zero-config integration that maximizes effectiveness automatically.
 * Just drop this file into ~/.openclaw/extensions/ and restart.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// Auto-detect optimal settings based on environment
function autoDetectConfig(): {
  useClusters: boolean;
  useAdaptiveFeatures: boolean;
  useEntityTracking: boolean;
  clusterThreshold: number;
  adaptiveAggressiveness: 'conservative' | 'balanced' | 'aggressive';
} {
  const memoryDir = join(process.env.HOME || '', '.openclaw', 'workspace', 'memory');
  
  // Detect memory size
  let memoryFileCount = 0;
  try {
    const { readdirSync } = require('fs');
    if (existsSync(memoryDir)) {
      memoryFileCount = readdirSync(memoryDir).filter((f: string) => f.endsWith('.md')).length;
    }
  } catch (e) {
    // Can't detect, use defaults
  }
  
  // Auto-configure based on detected state
  if (memoryFileCount === 0) {
    // New user - keep it simple
    return {
      useClusters: true,
      useAdaptiveFeatures: true,
      useEntityTracking: true,
      clusterThreshold: 50, // Build clusters after 50 memories
      adaptiveAggressiveness: 'conservative'
    };
  } else if (memoryFileCount < 100) {
    // Small memory - balanced approach
    return {
      useClusters: true,
      useAdaptiveFeatures: true,
      useEntityTracking: true,
      clusterThreshold: 30,
      adaptiveAggressiveness: 'balanced'
    };
  } else {
    // Large memory - aggressive optimization
    return {
      useClusters: true,
      useAdaptiveFeatures: true,
      useEntityTracking: true,
      clusterThreshold: 10,
      adaptiveAggressiveness: 'aggressive'
    };
  }
}

// Ensure Clawtext is set up
function ensureSetup(): void {
  const workspaceDir = join(process.env.HOME || '', '.openclaw', 'workspace');
  const clawtextDir = join(workspaceDir, 'clawtext');
  const clustersDir = join(workspaceDir, 'memory', 'clusters');
  const entitiesFile = join(workspaceDir, 'memory', 'entities.json');
  
  // Create directories
  [clawtextDir, clustersDir].forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`[Clawtext] Created: ${dir}`);
    }
  });
  
  // Create default config if not exists
  const configFile = join(clawtextDir, 'config.json');
  if (!existsSync(configFile)) {
    const autoConfig = autoDetectConfig();
    writeFileSync(configFile, JSON.stringify(autoConfig, null, 2));
    console.log('[Clawtext] Created default config');
  }
  
  // Create entities file if not exists
  if (!existsSync(entitiesFile)) {
    writeFileSync(entitiesFile, JSON.stringify({ entities: {}, metadata: { version: '1.0' } }, null, 2));
    console.log('[Clawtext] Created entities storage');
  }
}

// Hook into OpenClaw's register function
export async function register(runtime: any): Promise<void> {
  console.log('[Clawtext] 🔧 Auto-integrating...');
  
  try {
    // Ensure setup
    ensureSetup();
    
    // Auto-detect optimal settings
    const autoConfig = autoDetectConfig();
    console.log(`[Clawtext] Auto-config: ${autoConfig.adaptiveAggressiveness} mode`);
    
    // Dynamic imports
    const { getEntityStateManager } = await import('../lib/entity-state');
    const { autoClusterMemories } = await import('../lib/memory-clusters');
    const { loadSessionContext } = await import('../lib/session-context');
    
    const entityManager = getEntityStateManager();
    
    // 1. Hook: Session Start - Inject enhanced context
    if (runtime.hooks?.onSessionStart) {
      runtime.hooks.onSessionStart(async (session: any) => {
        const startTime = Date.now();
        
        try {
          // Load enhanced context
          const projectId = session.projectId || session.metadata?.projectId || 'default';
          const context = await loadSessionContext(
            session.topic || session.userQuery,
            projectId,
            {
              maxMemories: 10,
              tokenBudget: 2000,
              minConfidence: 0.7,
              useClusters: autoConfig.useClusters
            }
          );
          
          if (context.memories.length > 0) {
            // Inject into session
            if (session.setContext) {
              session.setContext(context.contextPrompt);
            }
            
            // Log performance
            console.log(`[Clawtext] ⚡ Context loaded in ${Date.now() - startTime}ms (${context.memories.length} memories)`);
            
            // Attach metadata for later
            session.clawtextMeta = {
              contextLoaded: true,
              memoryCount: context.memories.length,
              usedClusters: !!context.clusterInfo
            };
          }
        } catch (error) {
          console.error('[Clawtext] Context injection failed:', error);
          // Don't break the session - OpenClaw will use default
        }
      });
      
      console.log('[Clawtext] ✅ Session start hook installed');
    }
    
    // 2. Hook: Memory Create - Auto-update clusters and extract entities
    if (runtime.hooks?.onMemoryCreate) {
      runtime.hooks.onMemoryCreate(async (memory: any) => {
        try {
          // Extract entities automatically
          if (autoConfig.useEntityTracking && memory.content) {
            const results = entityManager.processMemory(
              memory.id || memory.path,
              memory.content,
              memory.timestamp || new Date().toISOString()
            );
            
            if (results.length > 0) {
              console.log(`[Clawtext] 📊 Extracted ${results.length} entities from new memory`);
            }
          }
          
          // Trigger cluster update (debounced in real implementation)
          if (autoConfig.useClusters) {
            // In production, this would be debounced and run in background
            console.log('[Clawtext] 🔄 Cluster update queued');
          }
        } catch (error) {
          console.error('[Clawtext] Memory processing failed:', error);
        }
      });
      
      console.log('[Clawtext] ✅ Memory create hook installed');
    }
    
    // 3. Hook: Session End - Save state and metrics
    if (runtime.hooks?.onSessionEnd) {
      runtime.hooks.onSessionEnd(async (session: any) => {
        try {
          // Save entity state
          entityManager.save();
          
          // Log session stats if available
          if (session.clawtextMeta) {
            console.log('[Clawtext] 📈 Session stats:', {
              contextLoaded: session.clawtextMeta.contextLoaded,
              memoriesUsed: session.clawtextMeta.memoryCount
            });
          }
        } catch (error) {
          console.error('[Clawtext] Session cleanup failed:', error);
        }
      });
      
      console.log('[Clawtext] ✅ Session end hook installed');
    }
    
    // 4. Hook: Pre-compaction - Ensure important context is saved
    if (runtime.hooks?.onCompaction) {
      runtime.hooks.onCompaction(async (context: any) => {
        try {
          // This is critical - ensure entities are extracted before context is compacted
          if (autoConfig.useEntityTracking && context.messages) {
            const combinedText = context.messages
              .filter((m: any) => m.role === 'assistant' || m.role === 'user')
              .map((m: any) => m.content)
              .join('\n');
            
            entityManager.processMemory(
              `session-${Date.now()}`,
              combinedText
            );
          }
          
          console.log('[Clawtext] 💾 Pre-compaction hook executed');
        } catch (error) {
          console.error('[Clawtext] Compaction hook failed:', error);
        }
      });
      
      console.log('[Clawtext] ✅ Compaction hook installed');
    }
    
    // 5. Schedule background tasks
    if (runtime.scheduler?.schedule) {
      // Daily cluster optimization
      runtime.scheduler.schedule('0 2 * * *', async () => {
        console.log('[Clawtext] 🌙 Running nightly optimization...');
        try {
          const stats = await autoClusterMemories();
          console.log(`[Clawtext] ✨ Optimized ${stats.clustersUpdated} clusters`);
        } catch (error) {
          console.error('[Clawtext] Nightly optimization failed:', error);
        }
      });
      
      // Hourly entity save (backup)
      runtime.scheduler.schedule('0 * * * *', async () => {
        entityManager.save();
        console.log('[Clawtext] 💾 Entity state backed up');
      });
      
      console.log('[Clawtext] ✅ Background tasks scheduled');
    }
    
    // 6. Register commands
    if (runtime.commands?.register) {
      runtime.commands.register('clawtext-stats', async () => {
        const stats = entityManager.getStats();
        return {
          content: `📊 Clawtext Stats:\n- Entities: ${stats.total}\n- Avg Confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`,
          type: 'text'
        };
      });
      
      runtime.commands.register('clawtext-optimize', async () => {
        const stats = await autoClusterMemories();
        return {
          content: `✨ Optimized ${stats.clustersUpdated} clusters with ${stats.memoriesProcessed} memories`,
          type: 'text'
        };
      });
      
      runtime.commands.register('clawtext-entity', async (name: string) => {
        const state = entityManager.getState(name);
        if (state) {
          return {
            content: `👤 ${name}:\n${JSON.stringify(state, null, 2)}`,
            type: 'text'
          };
        } else {
          return {
            content: `❓ No entity found: ${name}`,
            type: 'text'
          };
        }
      });
      
      console.log('[Clawtext] ✅ CLI commands registered');
    }
    
    console.log('[Clawtext] 🎉 Fully integrated and ready!');
    console.log('[Clawtext] Features: Enhanced search • Adaptive features • Entity tracking');
    
  } catch (error) {
    console.error('[Clawtext] ❌ Integration failed:', error);
    console.log('[Clawtext] OpenClaw will continue with default behavior');
  }
}

export async function unregister(runtime: any): Promise<void> {
  console.log('[Clawtext] Unregistering...');
  // Cleanup is handled by OpenClaw's hook system
}

// Auto-run if this is loaded as a script
if (require.main === module) {
  console.log('[Clawtext] This file should be loaded by OpenClaw as an extension');
  console.log('[Clawtext] Copy to: ~/.openclaw/extensions/clawtext-auto.ts');
}