/**
 * Memory data layer — loads clusters + daily YAML files and serves them to the API.
 * Watches the memory directory for changes and hot-reloads.
 */

import { readFileSync, existsSync } from 'fs';
import { readdir, readFile } from 'fs/promises';
import { join, basename } from 'path';
import { glob } from 'glob';
import yaml from 'js-yaml';
import chokidar from 'chokidar';

export class MemoryStore {
  constructor(memoryDir) {
    this.memoryDir = memoryDir;
    this.clustersDir = join(memoryDir, 'clusters');
    this.clusters = new Map();     // clusterId → {topic, memories[], ...}
    this.memories = [];            // flat list of all memories (for search)
    this.entities = new Map();     // entityName → Set<clusterId>
    this._loadAll();
    this._watch();
  }

  _loadAll() {
    this._loadClusters();
    this._buildEntityIndex();
  }

  _loadClusters() {
    this.clusters.clear();
    this.memories = [];

    if (!existsSync(this.clustersDir)) return;

    let files;
    try {
      files = require('fs').readdirSync(this.clustersDir).filter(f => f.endsWith('.json'));
    } catch {
      return;
    }

    for (const file of files) {
      try {
        const raw = readFileSync(join(this.clustersDir, file), 'utf8');
        const cluster = JSON.parse(raw);
        this.clusters.set(cluster.id || basename(file, '.json'), cluster);
        if (Array.isArray(cluster.memories)) {
          for (const mem of cluster.memories) {
            this.memories.push({ ...mem, clusterId: cluster.id, clusterTopic: cluster.topic });
          }
        }
      } catch {
        // skip bad files
      }
    }
  }

  _buildEntityIndex() {
    this.entities.clear();
    for (const [clusterId, cluster] of this.clusters) {
      const entitySources = [
        ...(cluster.entities || []),
        ...(cluster.keywords || []),
        cluster.topic,
      ].filter(Boolean);

      for (const entity of entitySources) {
        if (!this.entities.has(entity)) this.entities.set(entity, new Set());
        this.entities.get(entity).add(clusterId);
      }
    }
  }

  _watch() {
    const watcher = chokidar.watch(this.memoryDir, {
      ignored: /(^|[/\\])\../,
      persistent: false,
      depth: 2,
    });
    watcher.on('change', () => this._loadAll());
    watcher.on('add', () => this._loadAll());
  }

  getClusters() {
    return Array.from(this.clusters.values());
  }

  getClusterById(id) {
    return this.clusters.get(id) ?? null;
  }

  getAllEntities() {
    return Array.from(this.entities.keys()).sort();
  }

  /**
   * BM25-style search across flat memory list.
   * Simple token frequency scoring — good enough without a vector DB.
   */
  search(query, { limit = 20, projectFilter = null } = {}) {
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];

    const scored = this.memories.map(mem => {
      const text = [
        mem.content || '',
        mem.title || '',
        mem.keywords?.join(' ') || '',
        mem.entities?.join(' ') || '',
        mem.project || '',
        mem.clusterTopic || '',
      ].join(' ').toLowerCase();

      let score = 0;
      for (const token of tokens) {
        const count = (text.match(new RegExp(token, 'g')) || []).length;
        score += count * (token.length > 4 ? 2 : 1); // weight longer tokens more
      }

      return { ...mem, _score: score };
    });

    let results = scored
      .filter(m => m._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    if (projectFilter) {
      results = results.filter(m => m.project === projectFilter);
    }

    return results;
  }

  /**
   * Build a relationship graph: nodes (clusters) + edges (semantic overlap).
   * Edge weight = number of shared keywords/entities between clusters.
   * Anti-patterns get flagged as negative edges.
   */
  buildGraph(antiPatterns) {
    const nodes = [];
    const edges = [];

    for (const [id, cluster] of this.clusters) {
      nodes.push({
        id,
        label: cluster.topic || id,
        project: cluster.project,
        memoryCount: cluster.memories?.length ?? 0,
        keywords: cluster.keywords || [],
        entities: cluster.entities || [],
      });
    }

    // Build positive edges from shared entities/keywords
    const clusterList = Array.from(this.clusters.entries());
    for (let i = 0; i < clusterList.length; i++) {
      for (let j = i + 1; j < clusterList.length; j++) {
        const [idA, clusterA] = clusterList[i];
        const [idB, clusterB] = clusterList[j];

        const setA = new Set([...(clusterA.entities || []), ...(clusterA.keywords || [])]);
        const setB = new Set([...(clusterB.entities || []), ...(clusterB.keywords || [])]);
        const shared = [...setA].filter(x => setB.has(x));

        if (shared.length > 0) {
          edges.push({
            id: `${idA}__${idB}`,
            source: idA,
            target: idB,
            weight: shared.length,
            shared,
            type: 'positive',
          });
        }
      }
    }

    // Flag anti-pattern edges
    const allPatterns = antiPatterns.getAll({ status: undefined });
    for (const ap of allPatterns) {
      if (ap.status === 'dismissed') continue;

      // Try to find matching cluster IDs by entity/topic name
      const sourceCluster = this._findClusterByEntity(ap.from);
      const targetCluster = this._findClusterByEntity(ap.to);

      if (sourceCluster && targetCluster) {
        // Remove or replace positive edge with anti-pattern edge
        const existingIdx = edges.findIndex(
          e => (e.source === sourceCluster && e.target === targetCluster) ||
               (e.source === targetCluster && e.target === sourceCluster)
        );

        const antiEdge = {
          id: `ap__${ap.id}`,
          source: sourceCluster,
          target: targetCluster,
          weight: 1,
          type: ap.status === 'partial' ? 'partial' : 'negative',
          antiPatternId: ap.id,
          reason: ap.reason,
          partialNote: ap.partialNote,
        };

        if (existingIdx >= 0) {
          edges[existingIdx] = antiEdge;
        } else {
          edges.push(antiEdge);
        }
      }
    }

    return { nodes, edges };
  }

  _findClusterByEntity(entityName) {
    // Exact match on cluster topic
    for (const [id, cluster] of this.clusters) {
      if (cluster.topic?.toLowerCase() === entityName.toLowerCase()) return id;
    }
    // Fuzzy match via entity index
    for (const [entity, clusterIds] of this.entities) {
      if (entity.toLowerCase().includes(entityName.toLowerCase())) {
        return clusterIds.values().next().value;
      }
    }
    return null;
  }

  getStats() {
    return {
      clusterCount: this.clusters.size,
      memoryCount: this.memories.length,
      entityCount: this.entities.size,
    };
  }
}
