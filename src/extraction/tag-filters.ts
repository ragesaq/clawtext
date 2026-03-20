import fs from 'fs';
import path from 'path';
import { getClawTextProdStateRoot } from '../runtime-paths.js';

export interface TagFilterRule {
  include?: string[];
  exclude?: string[];
  match?: 'any' | 'all' | 'any_strict';
}

export interface RecallFilter {
  tagFilters?: TagFilterRule[];
  entityTypes?: string[];
  dateRange?: {
    after?: string;
    before?: string;
  };
  confidenceMin?: number;
}

export interface TagFilterState {
  filters: Record<string, RecallFilter>;
}

function filtersDir(workspacePath: string): string {
  return path.join(getClawTextProdStateRoot(workspacePath), 'extraction', 'filters');
}

export function getFiltersPath(workspacePath: string): string {
  return path.join(filtersDir(workspacePath), 'filters.json');
}

export function loadTagFilters(workspacePath: string): TagFilterState {
  const filtersPath = getFiltersPath(workspacePath);
  
  try {
    if (fs.existsSync(filtersPath)) {
      const raw = JSON.parse(fs.readFileSync(filtersPath, 'utf8'));
      return raw;
    }
  } catch {
    // Ignore
  }
  
  return { filters: {} };
}

export function saveTagFilters(workspacePath: string, state: TagFilterState): TagFilterState {
  const dir = filtersDir(workspacePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(getFiltersPath(workspacePath), JSON.stringify(state, null, 2) + '\n', 'utf8');
  return state;
}

export function addTagFilter(workspacePath: string, filterId: string, filter: RecallFilter): TagFilterState {
  const state = loadTagFilters(workspacePath);
  state.filters[filterId] = filter;
  return saveTagFilters(workspacePath, state);
}

export function removeTagFilter(workspacePath: string, filterId: string): TagFilterState {
  const state = loadTagFilters(workspacePath);
  delete state.filters[filterId];
  return saveTagFilters(workspacePath, state);
}

export function getTagFilter(workspacePath: string, filterId: string): RecallFilter | null {
  const state = loadTagFilters(workspacePath);
  return state.filters[filterId] || null;
}

/**
 * Apply tag filters to a list of memories
 */
export function applyTagFilters(
  workspacePath: string,
  filterId: string,
  memories: Array<{ text: string; tags?: string[]; entityTypes?: string[]; confidence?: number; timestamp?: string }>
): Array<{ text: string; tags?: string[]; entityTypes?: string[]; confidence?: number; timestamp?: string }> {
  const filter = getTagFilter(workspacePath, filterId);
  if (!filter) return memories;

  return memories.filter((mem) => {
    // Tag filters
    if (filter.tagFilters) {
      for (const rule of filter.tagFilters) {
        const memTags = mem.tags || [];
        
        // Include check
        if (rule.include && rule.include.length > 0) {
          const hasInclude = rule.match === 'all'
            ? rule.include.every((t) => memTags.includes(t))
            : rule.include.some((t) => memTags.includes(t));
          if (!hasInclude) return false;
        }
        
        // Exclude check
        if (rule.exclude && rule.exclude.length > 0) {
          const hasExclude = rule.exclude.some((t) => memTags.includes(t));
          if (hasExclude) return false;
        }
      }
    }

    // Entity type filters
    if (filter.entityTypes && filter.entityTypes.length > 0) {
      const memEntities = mem.entityTypes || [];
      const hasEntity = filter.entityTypes.some((e) => memEntities.includes(e) || e === '*');
      if (!hasEntity && memEntities.length > 0) return false;
    }

    // Confidence filter
    if (filter.confidenceMin !== undefined && mem.confidence !== undefined) {
      if (mem.confidence < filter.confidenceMin) return false;
    }

    // Date range
    if (filter.dateRange && mem.timestamp) {
      const memTime = new Date(mem.timestamp).getTime();
      if (filter.dateRange.after) {
        const after = new Date(filter.dateRange.after).getTime();
        if (memTime < after) return false;
      }
      if (filter.dateRange.before) {
        const before = new Date(filter.dateRange.before).getTime();
        if (memTime > before) return false;
      }
    }

    return true;
  });
}

// Seed default filters
const defaultFilters: TagFilterState = {
  filters: {
    'no-sensitivity': {
      tagFilters: [
        { exclude: ['sensitivity:restricted', 'sensitivity:private'] }
      ]
    },
    'decisions-only': {
      tagFilters: [
        { include: ['decision'], match: 'any' }
      ]
    },
    'high-confidence': {
      confidenceMin: 0.8
    }
  }
};

// Try to seed defaults
try {
  const dir = '/home/lumadmin/.openclaw/workspace/state/clawtext/prod/extraction/filters';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const pf = path.join(dir, 'filters.json');
  if (!fs.existsSync(pf)) {
    fs.writeFileSync(pf, JSON.stringify(defaultFilters, null, 2) + '\n', 'utf8');
  }
} catch {
  // Ignore
}

export { defaultFilters };
