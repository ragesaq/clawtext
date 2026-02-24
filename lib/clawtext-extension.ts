#!/usr/bin/env node
/**
 * Clawtext Extension
 * 
 * Auto-integrates Clawtext with OpenClaw - makes it "just work"
 * 
 * Installation:
 * 1. npm install clawtext (from your repo)
 * 2. cp ~/clawtext/lib/clawtext-extension.ts ~/.openclaw/extensions/
 * 3. restart openclaw gateway
 */

export async function register() {
  console.log('[Clawtext] Auto-integrating enhanced memory system');
  
  // Wait for OpenClaw to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    // Dynamic import to avoid circular dependencies
    const { loadSessionContext } = await import('./session-context');
    const { hybridSearch } = await import('./hybrid-search-simple');
    const { autoClusterMemories } = await import('./memory-clusters');
    
    // Get global OpenClaw hooks (available in extension context)
    const hooks = (global as any).openclaw?.hooks;
    const memory = (global as any).openclaw?.memory;
    const cron = (global as any).openclaw?.cron;
    
    if (!hooks || !memory || !cron) {
      console.log('[Clawtext] Running in diagnostic mode - OpenClaw globals not found');
      return;
    }
    
    // 1. Replace default memory search with Clawtext's hybrid search
    const originalSearch = memory.search;
    memory.search = async function clawtextEnhancedSearch(query, options = {}) {
      console.log(`[Clawtext] Enhanced search for: "${query.substring(0, 50)}..."`);
      
      try {
        return await hybridSearch(query, {
          ...options,
          // Pass through OpenClaw's memory_search tool
          openclawMemorySearch: originalSearch
        });
      } catch (error) {
        console.error('[Clawtext] Hybrid search failed, falling back to default', error);
        return originalSearch(query, options);
      }
    };
    
    console.log('[Clawtext] Memory search enhanced ✓');
    
    // 2. Auto-inject context at session start
    if (hooks.onSessionStart) {
      hooks.onSessionStart(async (session) => {
        try {
          const projectId = session.projectId || 
                           session.metadata?.projectId || 
                           'default';
          
          const context = await loadSessionContext(
            session.topic || session.userQuery,
            projectId,
            {
              maxMemories: 10,
              tokenBudget: 2000,
              minConfidence: 0.7,
              useClusters: true
            }
          );
          
          if (context.memories.length > 0) {
            console.log(`[Clawtext] Injected ${context.memories.length} memories for session`);
            // OpenClaw should auto-inject this context
            return context;
          }
        } catch (error) {
          console.error('[Clawtext] Context injection failed', error);
          // Fall back to default behavior
        }
      });
      
      console.log('[Clawtext] Session context auto-injection enabled ✓');
    }
    
    // 3. Schedule daily cluster optimization
    if (cron.every) {
      cron.every('1d', async () => {
        console.log('[Clawtext] Running daily cluster optimization');
        try {
          const stats = await autoClusterMemories();
          console.log(`[Clawtext] Optimized ${stats.clustersUpdated} clusters`);
        } catch (error) {
          console.error('[Clawtext] Cluster optimization failed', error);
        }
      });
      
      console.log('[Clawtext] Daily cluster optimization scheduled ✓');
    }
    
    // 4. Register CLI commands for manual control
    if ((global as any).openclaw?.commands) {
      const commands = (global as any).openclaw.commands;
      
      commands.register('clawtext-optimize', 'Optimize memory clusters', async () => {
        const stats = await autoClusterMemories();
        return `Optimized ${stats.clustersUpdated} clusters`;
      });
      
      commands.register('clawtext-stats', 'Show Clawtext statistics', async () => {
        // Implementation would read cluster stats
        return 'Clawtext stats: Active clusters: X, Total memories: Y';
      });
      
      console.log('[Clawtext] CLI commands registered ✓');
    }
    
    console.log('[Clawtext] Integration complete! Enhanced memory system active.');
    
  } catch (error) {
    console.error('[Clawtext] Failed to integrate', error);
    // Graceful degradation - OpenClaw continues with default behavior
  }
}