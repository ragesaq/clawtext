/**
 * Reflect Slot Provider — Adds {{memory.reflect:query}} selector
 * 
 * This is a simpler integration that can be used with expandSlotTemplates
 * or called directly from the retrieval path.
 */

import { reflect, shouldReflect, type Memory } from '../reflect';

export interface ReflectSlotOptions {
  memories?: Memory[];
  autoTrigger?: boolean;
}

export interface ReflectSlotResult {
  output: string;
  success: boolean;
  replaced: boolean;
  error?: string;
  metadata?: {
    model: string;
    memoriesUsed: number;
    latencyMs: number;
    fromCache?: boolean;
  };
}

/**
 * Resolve a reflect selector
 * 
 * Usage: {{memory.reflect:what did we decide about auth}}
 */
export async function resolveReflectSelector(
  selector: string,
  options: ReflectSlotOptions = {}
): Promise<ReflectSlotResult> {
  // Parse selector: memory.reflect:query
  const match = selector.match(/^memory\.reflect:(.+)$/);
  if (!match) {
    return {
      output: '',
      success: false,
      replaced: false,
      error: `Invalid reflect selector: ${selector}`
    };
  }
  
  const query = match[1].trim();
  const memories = options?.memories || [];
  
  // If no memories, return empty
  if (memories.length === 0) {
    return {
      output: '',
      success: true,
      replaced: false
    };
  }
  
  try {
    // Check if reflect should trigger
    const shouldDoReflect = await shouldReflect(memories);
    
    if (!shouldDoReflect) {
      // Fall back to raw memories
      return {
        output: memories.map(m => m.content).join('\n'),
        success: true,
        replaced: false
      };
    }
    
    // Execute reflect
    const result = await reflect({
      query,
      memories
    });
    
    return {
      output: result.reflection,
      success: true,
      replaced: true,
      metadata: {
        model: result.model,
        memoriesUsed: result.memoriesUsed,
        latencyMs: result.latencyMs,
        fromCache: result.fromCache
      }
    };
  } catch (error) {
    return {
      output: '',
      success: false,
      replaced: false,
      error: `Reflect failed: ${error}`
    };
  }
}

export default {
  resolveReflectSelector
};
