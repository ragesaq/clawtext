/**
 * Entity State Tracking
 * 
 * Extracts structured entities from memories and tracks their state over time.
 * Inspired by Memvid's entity state feature, adapted for Clawtext's file-based approach.
 * 
 * Example:
 * Memory: "Alice works at Anthropic as a Senior Engineer"
 * Entity: { name: "Alice", type: "person", state: { employer: "Anthropic", role: "Senior Engineer" }}
 * 
 * Query: entityState.get("Alice")
 * Result: { employer: "Anthropic", role: "Senior Engineer", lastUpdated: "2026-02-25" }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

export interface Entity {
  id: string;
  name: string;
  type: 'person' | 'organization' | 'project' | 'technology' | 'concept' | string;
  state: Record<string, any>;
  firstSeen: string;
  lastUpdated: string;
  sourceMemories: string[];
  confidence: number;
}

export interface EntityExtractionResult {
  entity: Entity;
  extracted: boolean;
  method: 'pattern' | 'llm' | 'manual';
}

export interface EntityQuery {
  name?: string;
  type?: string;
  hasProperty?: string;
  propertyValue?: { key: string; value: any };
}

// Common entity patterns for rule-based extraction
const ENTITY_PATTERNS = {
  person: {
    patterns: [
      /(\w+) works at (\w+) as an? ([\w\s]+)/i,
      /(\w+) is an? ([\w\s]+) at (\w+)/i,
      /(\w+) (?:is|joined) (?:the|as) ([\w\s]+) (?:at|for) (\w+)/i,
      /meet (\w+), (?:our|the) ([\w\s]+)/i
    ],
    extractors: [
      (match: RegExpMatchArray) => ({ 
        name: match[1], 
        employer: match[2], 
        role: match[3] 
      }),
      (match: RegExpMatchArray) => ({ 
        name: match[1], 
        role: match[2], 
        employer: match[3] 
      }),
      (match: RegExpMatchArray) => ({ 
        name: match[1], 
        role: match[2], 
        employer: match[3] 
      }),
      (match: RegExpMatchArray) => ({ 
        name: match[1], 
        role: match[2] 
      })
    ]
  },
  project: {
    patterns: [
      /(project|repo|repository) (\w+) (?:is|uses) ([\w\s]+)/i,
      /(\w+) (?:project|repo) (?:is built on|uses) ([\w\s]+)/i,
      /(Project \w+|\w+ Project):?\s*([\w\s]+)/i
    ],
    extractors: [
      (match: RegExpMatchArray) => ({ 
        name: match[2], 
        type: 'project',
        description: match[3] 
      }),
      (match: RegExpMatchArray) => ({ 
        name: match[1], 
        technology: match[2] 
      }),
      (match: RegExpMatchArray) => ({ 
        name: match[1], 
        description: match[2] 
      })
    ]
  },
  technology: {
    patterns: [
      /using (\w+) (?:version|v)?(\d+\.?\d*)/i,
      /migrated to (\w+) (?:from|\()/i,
      /(?:switched|upgraded) to (\w+) (?:version|v)?(\d+\.?\d*)/i,
      /(\w+) (?:version|v)?(\d+\.?\d*) (?:is now|now in) (?:production|use)/i
    ],
    extractors: [
      (match: RegExpMatchArray) => ({ 
        name: match[1], 
        version: match[2] 
      }),
      (match: RegExpMatchArray) => ({ 
        name: match[1], 
        status: 'adopted' 
      }),
      (match: RegExpMatchArray) => ({ 
        name: match[1], 
        version: match[2],
        status: 'upgraded' 
      }),
      (match: RegExpMatchArray) => ({ 
        name: match[1], 
        version: match[2],
        status: 'production' 
      })
    ]
  }
};

/**
 * Extract entities from a memory text using pattern matching
 */
export function extractEntities(
  text: string, 
  memoryId: string,
  timestamp: string = new Date().toISOString()
): EntityExtractionResult[] {
  const results: EntityExtractionResult[] = [];
  
  for (const [type, config] of Object.entries(ENTITY_PATTERNS)) {
    for (let i = 0; i < config.patterns.length; i++) {
      const pattern = config.patterns[i];
      const extractor = config.extractors[i];
      
      const match = text.match(pattern);
      if (match) {
        const extracted = extractor(match);
        const entity: Entity = {
          id: `${extracted.name.toLowerCase().replace(/\s+/g, '-')}-${type}`,
          name: extracted.name,
          type,
          state: { ...extracted, name: undefined },
          firstSeen: timestamp,
          lastUpdated: timestamp,
          sourceMemories: [memoryId],
          confidence: 0.8 // Pattern match confidence
        };
        
        results.push({
          entity,
          extracted: true,
          method: 'pattern'
        });
      }
    }
  }
  
  return results;
}

/**
 * Merge entity state with existing entity
 */
export function mergeEntityState(
  existing: Entity,
  newExtraction: Entity,
  strategy: 'overwrite' | 'merge' | 'keep-newer' = 'merge'
): Entity {
  const merged: Entity = {
    ...existing,
    lastUpdated: newExtraction.lastUpdated,
    sourceMemories: [...new Set([...existing.sourceMemories, ...newExtraction.sourceMemories])]
  };
  
  switch (strategy) {
    case 'overwrite':
      merged.state = { ...newExtraction.state };
      break;
      
    case 'merge':
      merged.state = { ...existing.state, ...newExtraction.state };
      break;
      
    case 'keep-newer':
      // Keep existing unless new has different value
      merged.state = { ...existing.state };
      for (const [key, value] of Object.entries(newExtraction.state)) {
        if (value !== existing.state[key]) {
          merged.state[key] = value;
        }
      }
      break;
  }
  
  // Increase confidence with multiple sources
  merged.confidence = Math.min(0.95, existing.confidence + 0.05);
  
  return merged;
}

/**
 * Entity State Manager
 */
export class EntityStateManager {
  private entities: Map<string, Entity> = new Map();
  private storagePath: string;
  
  constructor(storagePath: string = './memory/entities.json') {
    this.storagePath = storagePath;
    this.load();
  }
  
  /**
   * Process a memory and extract/update entities
   */
  processMemory(memoryId: string, text: string, timestamp?: string): EntityExtractionResult[] {
    const extracted = extractEntities(text, memoryId, timestamp);
    
    for (const result of extracted) {
      if (result.extracted) {
        this.updateEntity(result.entity);
      }
    }
    
    this.save();
    return extracted;
  }
  
  /**
   * Update or add an entity
   */
  updateEntity(entity: Entity, mergeStrategy: 'overwrite' | 'merge' | 'keep-newer' = 'merge'): void {
    const existing = this.entities.get(entity.id);
    
    if (existing) {
      const merged = mergeEntityState(existing, entity, mergeStrategy);
      this.entities.set(entity.id, merged);
    } else {
      this.entities.set(entity.id, entity);
    }
  }
  
  /**
   * Get entity by name
   */
  get(name: string, type?: string): Entity | undefined {
    const searchName = name.toLowerCase();
    
    for (const entity of this.entities.values()) {
      const nameMatch = entity.name.toLowerCase() === searchName ||
                       entity.name.toLowerCase().includes(searchName);
      const typeMatch = !type || entity.type === type;
      
      if (nameMatch && typeMatch) {
        return entity;
      }
    }
    
    return undefined;
  }
  
  /**
   * Get entity state (convenience method like Memvid)
   */
  getState(name: string, type?: string): Record<string, any> | undefined {
    const entity = this.get(name, type);
    return entity?.state;
  }
  
  /**
   * Query entities
   */
  query(query: EntityQuery): Entity[] {
    const results: Entity[] = [];
    
    for (const entity of this.entities.values()) {
      let match = true;
      
      if (query.name && !entity.name.toLowerCase().includes(query.name.toLowerCase())) {
        match = false;
      }
      
      if (query.type && entity.type !== query.type) {
        match = false;
      }
      
      if (query.hasProperty && !(query.hasProperty in entity.state)) {
        match = false;
      }
      
      if (query.propertyValue) {
        const { key, value } = query.propertyValue;
        if (entity.state[key] !== value) {
          match = false;
        }
      }
      
      if (match) {
        results.push(entity);
      }
    }
    
    return results.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Get all entities of a type
   */
  getByType(type: string): Entity[] {
    return this.query({ type });
  }
  
  /**
   * Get entity history (all states over time)
   */
  getHistory(entityId: string): Entity[] {
    // In a full implementation, this would track state changes over time
    // For now, return current state
    const entity = this.entities.get(entityId);
    return entity ? [entity] : [];
  }
  
  /**
   * Export all entities
   */
  export(): Record<string, Entity> {
    return Object.fromEntries(this.entities);
  }
  
  /**
   * Get entity count
   */
  get count(): number {
    return this.entities.size;
  }
  
  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    avgConfidence: number;
  } {
    const byType: Record<string, number> = {};
    let totalConfidence = 0;
    
    for (const entity of this.entities.values()) {
      byType[entity.type] = (byType[entity.type] || 0) + 1;
      totalConfidence += entity.confidence;
    }
    
    return {
      total: this.entities.size,
      byType,
      avgConfidence: this.entities.size > 0 ? totalConfidence / this.entities.size : 0
    };
  }
  
  /**
   * Save entities to disk
   */
  save(): void {
    try {
      const dir = dirname(this.storagePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      
      const data = {
        entities: Object.fromEntries(this.entities),
        metadata: {
          lastUpdated: new Date().toISOString(),
          version: '1.0'
        }
      };
      
      writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[EntityState] Failed to save:', error);
    }
  }
  
  /**
   * Load entities from disk
   */
  load(): void {
    try {
      if (existsSync(this.storagePath)) {
        const data = JSON.parse(readFileSync(this.storagePath, 'utf8'));
        
        if (data.entities) {
          this.entities = new Map(Object.entries(data.entities));
        }
      }
    } catch (error) {
      console.warn('[EntityState] Failed to load:', error);
      this.entities = new Map();
    }
  }
}

/**
 * Create singleton instance
 */
let globalManager: EntityStateManager | null = null;

export function getEntityStateManager(storagePath?: string): EntityStateManager {
  if (!globalManager) {
    globalManager = new EntityStateManager(storagePath);
  }
  return globalManager;
}

export function resetEntityStateManager(): void {
  globalManager = null;
}

export default {
  EntityStateManager,
  extractEntities,
  mergeEntityState,
  getEntityStateManager,
  resetEntityStateManager
};