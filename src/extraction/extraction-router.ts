import fs from 'fs';
import path from 'path';
import { getClawTextProdStateRoot } from '../runtime-paths.js';

export type ExtractionMode = 'full' | 'lightweight' | 'recall' | 'disabled';
export type ExtractionDepth = 'verbose' | 'concise' | 'minimal';
export type BudgetLevel = 'low' | 'medium' | 'high';

export interface ExtractionConfig {
  depth: ExtractionDepth;
  entityTypes: string[];
  sentiment: boolean;
  decisions: boolean;
  tasks: boolean;
  topics: boolean;
  confidenceThreshold: number;
}

export interface RetentionConfig {
  everyNTurns: number;
  maxAge?: string;
  maxEntries?: number;
  tags: string[];
}

export interface RecallConfig {
  budget: BudgetLevel;
  maxTokens: number;
  includeRecent: boolean;
}

export interface ExtractionStrategy {
  strategyId: string;
  displayName: string;
  description: string;
  mode: ExtractionMode;
  extraction?: ExtractionConfig;
  retention?: RetentionConfig;
  recall?: RecallConfig;
}

export interface TopicMapping {
  topic: string;
  strategy: string;
}

export interface ExtractionMappings {
  mappings: TopicMapping[];
  default: string;
}

export interface ExtractionState {
  strategies: Record<string, ExtractionStrategy>;
  mappings: ExtractionMappings;
}

const DEFAULT_STATE: ExtractionState = {
  strategies: {},
  mappings: {
    mappings: [],
    default: 'lightweight',
  },
};

function extractionDir(workspacePath: string): string {
  return path.join(getClawTextProdStateRoot(workspacePath), 'extraction');
}

function strategiesDir(workspacePath: string): string {
  return path.join(extractionDir(workspacePath), 'strategies');
}

export function getStrategiesPath(workspacePath: string): string {
  return path.join(strategiesDir(workspacePath), 'strategies.json');
}

export function getMappingsPath(workspacePath: string): string {
  return path.join(extractionDir(workspacePath), 'mappings.json5');
}

export function loadExtractionState(workspacePath: string): ExtractionState {
  const strategiesPath = getStrategiesPath(workspacePath);
  const mappingsPath = getMappingsPath(workspacePath);

  let strategies: Record<string, ExtractionStrategy> = {};
  let mappings: ExtractionMappings = { mappings: [], default: 'lightweight' };

  // Load strategies
  try {
    if (fs.existsSync(strategiesPath)) {
      const raw = JSON.parse(fs.readFileSync(strategiesPath, 'utf8'));
      if (Array.isArray(raw)) {
        strategies = Object.fromEntries(raw.map((s: ExtractionStrategy) => [s.strategyId, s]));
      } else if (raw.strategies) {
        strategies = raw.strategies;
      }
    }
  } catch {
    strategies = {};
  }

  // Load mappings
  try {
    if (fs.existsSync(mappingsPath)) {
      const content = fs.readFileSync(mappingsPath, 'utf8');
      // Simple JSON5-like parsing for now
      const parsed = JSON.parse(content.replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));
      if (parsed.mappings && parsed.default) {
        mappings = parsed;
      }
    }
  } catch {
    mappings = { mappings: [], default: 'lightweight' };
  }

  return { strategies, mappings };
}

export function saveExtractionState(workspacePath: string, state: ExtractionState): ExtractionState {
  const dir = strategiesDir(workspacePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Save strategies as JSON array
  const strategiesArray = Object.values(state.strategies);
  fs.writeFileSync(
    getStrategiesPath(workspacePath),
    JSON.stringify(strategiesArray, null, 2) + '\n',
    'utf8',
  );

  // Save mappings as JSON5
  const mappingsContent = JSON.stringify(state.mappings, null, 2);
  fs.writeFileSync(getMappingsPath(workspacePath), mappingsContent + '\n', 'utf8');

  return state;
}

export function getStrategyForTopic(workspacePath: string, topic: string): ExtractionStrategy | null {
  const state = loadExtractionState(workspacePath);

  // Exact match first
  const mapping = state.mappings.mappings.find((m) => m.topic === topic);
  if (mapping && state.strategies[mapping.strategy]) {
    return state.strategies[mapping.strategy];
  }

  // Fallback to default
  if (state.strategies[state.mappings.default]) {
    return state.strategies[state.mappings.default];
  }

  return null;
}

export function isExtractionEnabled(workspacePath: string, topic: string): boolean {
  const strategy = getStrategyForTopic(workspacePath, topic);
  return strategy !== null && strategy.mode !== 'disabled';
}

export function getExtractionConfig(workspacePath: string, topic: string): ExtractionConfig | null {
  const strategy = getStrategyForTopic(workspacePath, topic);
  if (!strategy || !strategy.extraction) return null;
  return strategy.extraction;
}

export function getRetentionConfig(workspacePath: string, topic: string): RetentionConfig | null {
  const strategy = getStrategyForTopic(workspacePath, topic);
  if (!strategy || !strategy.retention) return null;
  return strategy.retention;
}

export function getRecallConfig(workspacePath: string, topic: string): RecallConfig | null {
  const strategy = getStrategyForTopic(workspacePath, topic);
  if (!strategy || !strategy.recall) return null;
  return strategy.recall;
}

// Seed default strategies if none exist
export function seedDefaultStrategies(workspacePath: string): ExtractionState {
  const existing = loadExtractionState(workspacePath);

  if (Object.keys(existing.strategies).length > 0) {
    return existing;
  }

  const defaults: ExtractionStrategy[] = [
    {
      strategyId: 'deep-analysis',
      displayName: 'Deep Analysis',
      description: 'Verbose extraction for important discussions',
      mode: 'full',
      extraction: {
        depth: 'verbose',
        entityTypes: ['*'],
        sentiment: true,
        decisions: true,
        tasks: true,
        topics: true,
        confidenceThreshold: 0.5,
      },
      retention: {
        everyNTurns: 1,
        maxAge: '30d',
        tags: ['important', 'decision', 'task'],
      },
      recall: {
        budget: 'high',
        maxTokens: 4096,
        includeRecent: true,
      },
    },
    {
      strategyId: 'lightweight',
      displayName: 'Lightweight',
      description: 'Minimal extraction for quick questions',
      mode: 'lightweight',
      extraction: {
        depth: 'concise',
        entityTypes: ['decision', 'task'],
        sentiment: false,
        decisions: true,
        tasks: true,
        topics: false,
        confidenceThreshold: 0.7,
      },
      retention: {
        everyNTurns: 5,
        maxAge: '7d',
        tags: ['quick'],
      },
      recall: {
        budget: 'low',
        maxTokens: 512,
        includeRecent: true,
      },
    },
    {
      strategyId: 'disabled',
      displayName: 'No Memory',
      description: 'Ephemeral — no memory retained',
      mode: 'disabled',
    },
    {
      strategyId: 'recall-only',
      displayName: 'Recall Only',
      description: 'Can read memory but cannot store',
      mode: 'recall',
      extraction: {
        depth: 'minimal',
        entityTypes: ['*'],
        sentiment: false,
        decisions: false,
        tasks: false,
        topics: false,
        confidenceThreshold: 0.8,
      },
      recall: {
        budget: 'high',
        maxTokens: 4096,
        includeRecent: false,
      },
    },
  ];

  const defaultMappings: ExtractionMappings = {
    mappings: [
      { topic: 'architecture', strategy: 'deep-analysis' },
      { topic: 'project-planning', strategy: 'deep-analysis' },
      { topic: 'debug-help', strategy: 'lightweight' },
      { topic: 'quick-question', strategy: 'lightweight' },
      { topic: 'random', strategy: 'disabled' },
      { topic: 'water-cooler', strategy: 'disabled' },
    ],
    default: 'lightweight',
  };

  return saveExtractionState(workspacePath, {
    strategies: Object.fromEntries(defaults.map((s) => [s.strategyId, s])),
    mappings: defaultMappings,
  });
}

// Initialize defaults on first load
seedDefaultStrategies('/home/lumadmin/.openclaw/workspace');

export { DEFAULT_STATE };
