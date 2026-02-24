/**
 * Clawtext Extension for OpenClaw
 * 
 * Auto-integrates Clawtext memory enhancements
 * 
 * Installation:
 * 1. Copy this file to ~/.openclaw/extensions/clawtext-extension.ts
 * 2. Restart OpenClaw gateway
 * 3. Check logs for "[Clawtext] Extension registered successfully"
 */

import type { OpenClawRuntime, Session, MemoryStore } from '../types/openclaw';

// Extension metadata
export const name = 'clawtext';
export const version = '1.0.0';
export const description = 'Enhanced memory retrieval with clusters and hybrid search';

// Feature flags from config
interface ClawtextConfig {
  enabled: boolean;
  useClusters: boolean;
  useHybridSearch: boolean;
  useQueryExpansion: boolean;
  useLLMReranking: boolean;
  minConfidence: number;
  maxMemories: number;
  tokenBudget: number;
}

const DEFAULT_CONFIG: ClawtextConfig = {
  enabled: true,
  useClusters: true,
  useHybridSearch: true,
  useQueryExpansion: true,
  useLLMReranking: false,
  minConfidence: 0.7,
  maxMemories: 10,
  tokenBudget: 2000
};

/**
 * Main registration function - called by OpenClaw on startup
 */
export async function register(runtime: OpenClawRuntime): Promise<void> {
  console.log('[Clawtext] Registering extension...');
  
  try {
    // Load configuration
    const config = await loadConfig(runtime);
    
    if (!config.enabled) {
      console.log('[Clawtext] Extension disabled in config');
      return;
    }
    
    // Import Clawtext modules dynamically
    const { loadSessionContext } = await import('../lib/session-context');
    const { hybridSearch } = await import('../lib/hybrid-search-simple');
    const { autoClusterMemories } = await import('../lib/memory-clusters');
    
    // 1. Enhance memory search if hybrid search enabled
    if (config.useHybridSearch && runtime.memory) {
      const originalSearch = runtime.memory.search.bind(runtime.memory);
      
      runtime.memory.search = async function clawtextEnhancedSearch(
        query: string, 
        options: any = {}
      ) {
        try {
          // First try cluster lookup (O(1))
          if (config.useClusters && options.projectId) {
            const clusterId = `cluster-${options.projectId}`;
            // Cluster lookup happens inside hybridSearch
          }
          
          // Use hybrid search with fallback to original
          return await hybridSearch(query, {
            ...options,
            expandQuery: config.useQueryExpansion,
            rerankResults: config.useLLMReranking,
            minConfidence: config.minConfidence,
            maxResults: options.maxResults || config.maxMemories
          });
          
        } catch (error) {
          console.warn('[Clawtext] Hybrid search failed, using fallback', error);
          return originalSearch(query, options);
        }
      };
      
      console.log('[Clawtext] Memory search enhanced ✓');
    }
    
    // 2. Hook into session lifecycle
    if (runtime.hooks?.onSessionStart) {
      runtime.hooks.onSessionStart(async (session: Session) => {
        try {
          if (!config.useClusters) return;
          
          const projectId = session.projectId || 
                           session.metadata?.projectId || 
                           'default';
          
          const context = await loadSessionContext(
            session.topic || session.userQuery,
            projectId,
            {
              maxMemories: config.maxMemories,
              tokenBudget: config.tokenBudget,
              minConfidence: config.minConfidence,
              useClusters: config.useClusters
            }
          );
          
          if (context.memories.length > 0) {
            console.log(`[Clawtext] Loaded ${context.memories.length} memories for session`);
            
            // Inject context into session
            if (session.setContext) {
              session.setContext(context.contextPrompt);
            }
            
            return context;
          }
        } catch (error) {
          console.error('[Clawtext] Context loading failed', error);
          // Don't throw - let OpenClaw continue with default behavior
        }
      });
      
      console.log('[Clawtext] Session context injection enabled ✓');
    }
    
    // 3. Schedule maintenance tasks
    if (runtime.scheduler?.schedule) {
      // Daily cluster optimization
      runtime.scheduler.schedule('0 2 * * *', async () => {
        console.log('[Clawtext] Running daily cluster optimization');
        try {
          const stats = await autoClusterMemories();
          console.log(`[Clawtext] Optimized ${stats.clustersUpdated} clusters`);
          
          // Report metrics if available
          if (runtime.metrics) {
            runtime.metrics.gauge('clawtext.clusters.updated', stats.clustersUpdated);
          }
        } catch (error) {
          console.error('[Clawtext] Cluster optimization failed', error);
        }
      });
      
      console.log('[Clawtext] Maintenance scheduled ✓');
    }
    
    // 4. Register CLI commands
    if (runtime.commands?.register) {
      runtime.commands.register('clawtext-optimize', async () => {
        const stats = await autoClusterMemories();
        return {
          content: `Optimized ${stats.clustersUpdated} clusters, ${stats.memoriesProcessed} memories`,
          type: 'text'
        };
      });
      
      runtime.commands.register('clawtext-stats', async () => {
        // Get current statistics
        return {
          content: 'Clawtext active: Enhanced search, auto-context, daily optimization',
          type: 'text'
        };
      });
      
      console.log('[Clawtext] CLI commands registered ✓');
    }
    
    console.log('[Clawtext] Extension registered successfully ✓');
    
  } catch (error) {
    console.error('[Clawtext] Failed to register extension:', error);
    // Don't throw - OpenClaw should continue without this extension
  }
}

/**
 * Load configuration from OpenClaw config
 */
async function loadConfig(runtime: OpenClawRuntime): Promise<ClawtextConfig> {
  try {
    if (runtime.config?.get) {
      const userConfig = await runtime.config.get('clawtext') || {};
      return { ...DEFAULT_CONFIG, ...userConfig };
    }
  } catch (error) {
    console.warn('[Clawtext] Could not load config, using defaults');
  }
  
  return DEFAULT_CONFIG;
}

/**
 * Graceful shutdown - called when OpenClaw is shutting down
 */
export async function unregister(runtime: OpenClawRuntime): Promise<void> {
  console.log('[Clawtext] Unregistering extension...');
  
  // Cleanup if needed
  // - Cancel scheduled tasks
  // - Close any open resources
  // - Save any pending state
  
  console.log('[Clawtext] Extension unregistered');
}

// Type definitions for OpenClaw runtime (simplified)
declare module '../types/openclaw' {
  interface OpenClawRuntime {
    config?: {
      get: (key: string) => Promise<any>;
    };
    memory?: MemoryStore & {
      search: (query: string, options?: any) => Promise<any[]>;
    };
    hooks?: {
      onSessionStart: (handler: (session: Session) => Promise<any>) => void;
    };
    scheduler?: {
      schedule: (cron: string, handler: () => Promise<void>) => void;
    };
    commands?: {
      register: (name: string, handler: () => Promise<any>) => void;
    };
    metrics?: {
      gauge: (name: string, value: number) => void;
    };
  }
  
  interface Session {
    id: string;
    topic?: string;
    userQuery?: string;
    projectId?: string;
    metadata?: Record<string, any>;
    setContext?: (context: string) => void;
  }
  
  interface MemoryStore {
    search: (query: string, options?: any) => Promise<any[]>;
  }
}