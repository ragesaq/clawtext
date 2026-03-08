import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import HotMemoryCache, { type CacheableMemory, type HotCacheConfig } from './hot-cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface Memory {
  id?: string;
  content: string;
  type: string;
  source: string;
  project: string;
  confidence: number;
  keywords: string[];
  entities?: string[];
  updatedAt: string;
  patternKey?: string;
  score?: number;
  retrievalSource?: 'cache' | 'cluster';
  cache?: Record<string, any>;
}

interface Cluster {
  builtAt: string;
  projectId: string;
  memories: Memory[];
}

interface RAGConfig {
  enabled: boolean;
  maxMemories: number;
  minConfidence: number;
  injectMode: 'smart' | 'full' | 'snippets' | 'off';
  tokenBudget: number;
  hotCache: HotCacheConfig;
}

/**
 * RAG layer for ClawText memory injection with a lightweight hot-cache tier.
 */
export class ClawTextRAG {
  private workspacePath: string;
  private clustersDir: string;
  private clusters: Map<string, Cluster> = new Map();
  private config: RAGConfig;
  private hotCache: HotMemoryCache;

  constructor(workspacePath: string = process.env.HOME + '/.openclaw/workspace') {
    this.workspacePath = workspacePath;
    this.clustersDir = path.join(workspacePath, 'memory', 'clusters');
    this.config = {
      enabled: true,
      maxMemories: 5,
      minConfidence: 0.6,
      injectMode: 'smart',
      tokenBudget: 4000,
      hotCache: {
        enabled: true,
        maxItems: 300,
        maxPerProject: 50,
        maxSnippetChars: 600,
        maxResultsPerQuery: 5,
        defaultTtlDays: 14,
        stickyTtlDays: 60,
        admissionConfidence: 0.78,
        admissionScore: 1.5,
        persistEveryAdmissions: 5,
        persistEveryHits: 10,
      },
    };

    this.hotCache = new HotMemoryCache(workspacePath, this.config.hotCache);
    this.loadClusters();
  }

  private loadClusters(): void {
    if (!fs.existsSync(this.clustersDir)) {
      console.warn(`Clusters directory not found: ${this.clustersDir}`);
      return;
    }

    const files = fs.readdirSync(this.clustersDir).filter(f => f.startsWith('cluster-'));
    files.forEach(file => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(this.clustersDir, file), 'utf8'));
        const projectId = data.projectId || path.basename(file, '.json').replace('cluster-', '');
        this.clusters.set(projectId, data);
      } catch (e) {
        console.error(`Failed to load cluster ${file}:`, e);
      }
    });

    console.log(`[ClawText RAG] Loaded ${this.clusters.size} clusters`);
  }

  private buildMemoryKey(memory: Memory): string {
    const seed = [memory.project || 'general', memory.type || 'fact', memory.content || ''].join('::');
    return crypto.createHash('sha1').update(seed).digest('hex').slice(0, 16);
  }

  private bm25Score(query: string, memory: Memory, targetProjects: string[] = []): number {
    const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const memoryText = [memory.content || '', ...(memory.keywords || []), ...(memory.entities || [])].join(' ').toLowerCase();

    let score = 0;
    queryTerms.forEach(term => {
      if (memoryText.includes(term)) score += 1;
    });

    score *= memory.confidence || 0;

    if (targetProjects.length > 0 && memory.project) {
      const isTargetProject = targetProjects.some(p => p.includes(memory.project) || memory.project.includes(p));
      score *= isTargetProject ? 2.0 : 0.5;
    }

    if (memory.patternKey) {
      const patternKeyTerms = memory.patternKey.toLowerCase().split(/[._\-]/);
      if (patternKeyTerms.some(pt => query.toLowerCase().includes(pt))) score *= 1.5;
    }

    if (memory.entities && Array.isArray(memory.entities)) {
      const queryHasEntity = memory.entities.some(e => query.toLowerCase().includes(String(e).toLowerCase()));
      if (queryHasEntity) score *= 1.5;
    }

    return Math.max(0, score);
  }

  private findClusterMemories(query: string, projectKeywords: string[] = []): Array<Memory & { score: number }> {
    if (!this.config.enabled || !query) return [];

    let targetProjects = projectKeywords.length > 0
      ? Array.from(this.clusters.keys()).filter(p => projectKeywords.some(kw => p.includes(kw) || kw.includes(p)))
      : Array.from(this.clusters.keys());

    if (targetProjects.length === 0) targetProjects = Array.from(this.clusters.keys());

    const allMemories: Array<Memory & { score: number }> = [];
    targetProjects.forEach(project => {
      const cluster = this.clusters.get(project);
      if (!cluster) return;

      cluster.memories.forEach(memory => {
        if ((memory.confidence || 0) >= this.config.minConfidence) {
          const score = this.bm25Score(query, memory, targetProjects);
          if (score > 0) allMemories.push({ ...memory, score, project, retrievalSource: 'cluster' });
        }
      });
    });

    return allMemories.sort((a, b) => b.score - a.score);
  }

  private mergeMemories(cacheMemories: Memory[], clusterMemories: Array<Memory & { score: number }>): Memory[] {
    const combined: Array<Memory & { score: number; _ordinal: number }> = [];
    const seen = new Set<string>();

    [...cacheMemories, ...clusterMemories].forEach((memory, index) => {
      const key = this.buildMemoryKey(memory);
      if (seen.has(key)) return;
      seen.add(key);

      const sourceBoost = memory.retrievalSource === 'cache' || memory.cache ? 0.35 : 0;
      const score = (memory.score || 0) + sourceBoost;
      combined.push({ ...memory, score, _ordinal: index });
    });

    return combined
      .sort((a, b) => (b.score !== a.score ? b.score - a.score : a._ordinal - b._ordinal))
      .slice(0, this.config.maxMemories)
      .map(({ _ordinal, ...memory }) => memory);
  }

  findRelevantMemories(query: string, projectKeywords: string[] = []): Memory[] {
    if (!this.config.enabled || !query) return [];

    const cacheMemories = this.hotCache
      .query(query, projectKeywords, this.config.hotCache.maxResultsPerQuery)
      .map(memory => ({ ...memory, retrievalSource: 'cache', score: (memory.confidence || 0) + 1 } as Memory));

    const clusterMemories = this.findClusterMemories(query, projectKeywords);
    const merged = this.mergeMemories(cacheMemories, clusterMemories);

    this.hotCache.admit(clusterMemories.slice(0, Math.max(this.config.maxMemories * 2, 10)) as CacheableMemory[]);

    return merged.map(({ score, retrievalSource, ...memory }) => memory);
  }

  formatMemories(memories: Memory[]): string {
    if (memories.length === 0) return '';

    const sections: Record<string, string[]> = {
      context: [],
      decision: [],
      fact: [],
      code: [],
      learning: [],
      protocol: [],
    };

    memories.forEach(m => {
      const type = m.type || 'fact';
      if (!sections[type]) sections.fact.push(m.content);
      else sections[type].push(m.content);
    });

    let output = '\n## 🧠 Relevant Context\n\n';
    if (sections.context.length > 0) output += '### Context\n' + sections.context.map(c => `- ${c}`).join('\n') + '\n\n';
    if (sections.decision.length > 0) output += '### Key Decisions\n' + sections.decision.map(d => `- ${d}`).join('\n') + '\n\n';
    if (sections.fact.length > 0) output += '### Facts\n' + sections.fact.map(f => `- ${f}`).join('\n') + '\n\n';
    if (sections.learning.length > 0) output += '### Learnings\n' + sections.learning.map(f => `- ${f}`).join('\n') + '\n\n';
    if (sections.protocol.length > 0) output += '### Protocols\n' + sections.protocol.map(f => `- ${f}`).join('\n') + '\n\n';
    if (sections.code.length > 0) output += '### Code Reference\n' + sections.code.join('\n') + '\n\n';
    return output;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private fitMemoriesToBudget(memories: Memory[]): Memory[] {
    const selected: Memory[] = [];
    for (const memory of memories) {
      const candidate = [...selected, memory];
      const formatted = this.formatMemories(candidate);
      const tokens = this.estimateTokens(formatted);
      if (tokens <= this.config.tokenBudget) selected.push(memory);
      else break;
    }
    return selected;
  }

  injectMemories(systemPrompt: string, query: string, projectKeywords: string[] = []): { prompt: string; injected: number; tokens: number } {
    if (this.config.injectMode === 'off') return { prompt: systemPrompt, injected: 0, tokens: 0 };

    const memories = this.findRelevantMemories(query, projectKeywords);
    if (memories.length === 0) return { prompt: systemPrompt, injected: 0, tokens: 0 };

    const budgetedMemories = this.fitMemoriesToBudget(memories);
    if (budgetedMemories.length === 0) {
      const first = memories[0];
      const compactFirst: Memory = { ...first, content: (first.content || '').slice(0, Math.max(this.config.tokenBudget * 3, 400)) };
      budgetedMemories.push(compactFirst);
    }

    const formatted = this.formatMemories(budgetedMemories);
    const injectedTokens = this.estimateTokens(formatted);

    let injectedPrompt = systemPrompt;
    if (this.config.injectMode === 'smart' || this.config.injectMode === 'full') {
      injectedPrompt = systemPrompt + formatted;
    } else if (this.config.injectMode === 'snippets') {
      const snippets = budgetedMemories.map(m => `- [${m.type}] ${m.content.split('\n')[0].substring(0, 100)}...`).join('\n');
      injectedPrompt = systemPrompt + '\n## Context Snippets\n' + snippets + '\n';
    }

    return { prompt: injectedPrompt, injected: budgetedMemories.length, tokens: injectedTokens };
  }

  setConfig(partial: Partial<RAGConfig>): void {
    this.config = {
      ...this.config,
      ...partial,
      hotCache: {
        ...this.config.hotCache,
        ...(partial.hotCache || {}),
      },
    };
    this.hotCache = new HotMemoryCache(this.workspacePath, this.config.hotCache);
  }

  getStats() {
    let totalMemories = 0;
    this.clusters.forEach(c => {
      totalMemories += c.memories.length;
    });

    return {
      clustersLoaded: this.clusters.size,
      totalMemories,
      config: this.config,
      hotCache: this.hotCache.getStats(),
    };
  }
}

export default ClawTextRAG;
