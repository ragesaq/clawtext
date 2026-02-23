/**
 * Memory Clusters - RAG Foundation Layer
 * 
 * Auto-groups related memories by project/topic for instant loading.
 * Part of the RAG architecture for OpenClaw memory system.
 * 
 * RAG Alignment:
 * - Retrieval: Cluster-based retrieval is faster than full search
 * - Augmented: Pre-computed relationships augment context quality
 * - Generation: Rich cluster context improves LLM generation
 */

export interface MemoryCluster {
  id: string;
  name: string;
  description: string;
  created: string;
  updated: string;
  memberIds: string[];
  metadata: {
    projectId?: string;
    topic: string;
    memoryTypes: string[];
    confidence: number;
    lastAccessed: string;
  };
}

export interface ClusteredMemory {
  id: string;
  content: string;
  type: string;
  clusterId: string;
  clusterName: string;
  relatedMemories: string[];
  confidence: number;
  priority: number;
  created: string;
}

// Cluster configuration
const CLUSTER_CONFIG = {
  minClusterSize: 3,
  maxClusterSize: 20,
  similarityThreshold: 0.75,
  autoCluster: true,
  defaultTopics: [
    'memory-architecture',
    'agent-roles',
    'infra-management',
    'project-planning',
    'code-research'
  ]
};

/**
 * Classify memory into cluster based on content analysis
 */
export async function classifyCluster(
  content: string,
  metadata?: { projectId?: string; type?: string }
): Promise<string> {
  // Topic classification using keyword extraction
  const topics = extractTopics(content);
  
  // Priority: explicit projectId > detected topic > default
  if (metadata?.projectId) {
    return `cluster-${metadata.projectId}`;
  }
  
  if (topics.length > 0) {
    return `cluster-${topics[0]}`;
  }
  
  // Fallback to general cluster
  return 'cluster-general';
}

/**
 * Extract topics from memory content
 */
function extractTopics(content: string): string[] {
  const topicKeywords: Record<string, string[]> = {
    'memory-architecture': ['memory', 'rag', 'search', 'embedding', 'sqlite', 'cluster'],
    'agent-roles': ['agent', 'role', 'router', 'coder', 'researcher', 'orchestrator'],
    'infra-management': ['gateway', 'config', 'plugin', 'deploy', 'systemd'],
    'project-planning': ['roadmap', 'milestone', 'decision', 'plan', 'schedule'],
    'code-research': ['gitnexus', 'implementation', 'code', 'architecture', 'design']
  };
  
  const contentLower = content.toLowerCase();
  const matchedTopics: string[] = [];
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const matches = keywords.filter(kw => contentLower.includes(kw));
    if (matches.length >= 2) {
      matchedTopics.push(topic);
    }
  }
  
  return matchedTopics;
}

/**
 * Create or update a memory cluster
 */
export async function createOrUpdateCluster(
  clusterId: string,
  memoryId: string,
  metadata?: { projectId?: string; type?: string }
): Promise<MemoryCluster> {
  // In real implementation, this would read/write to a clusters file
  const cluster: MemoryCluster = {
    id: clusterId,
    name: clusterId.replace('cluster-', ''),
    description: `Auto-generated cluster for ${clusterId}`,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    memberIds: [memoryId],
    metadata: {
      projectId: metadata?.projectId,
      topic: clusterId.replace('cluster-', ''),
      memoryTypes: metadata?.type ? [metadata.type] : [],
      confidence: 0.8,
      lastAccessed: new Date().toISOString()
    }
  };
  
  return cluster;
}

/**
 * Load entire cluster context (O(1) vs O(n) search)
 */
export async function loadClusterContext(
  clusterId: string
): Promise<{
  cluster: MemoryCluster;
  memories: any[];
  formattedContext: string;
}> {
  // Load cluster metadata
  const cluster = await loadCluster(clusterId);
  
  // Load all member memories
  const memories = await loadClusterMemories(cluster.memberIds);
  
  // Format for context injection
  const formattedContext = formatClusterContext(cluster, memories);
  
  return {
    cluster,
    memories,
    formattedContext
  };
}

/**
 * Find related memories within cluster
 */
export async function findRelatedInCluster(
  memoryId: string,
  clusterId: string
): Promise<string[]> {
  const cluster = await loadCluster(clusterId);
  
  // Return all other members of the cluster
  return cluster.memberIds.filter(id => id !== memoryId);
}

/**
 * Merge clusters if they're too similar
 */
export async function mergeClusters(
  clusterId1: string,
  clusterId2: string
): Promise<MemoryCluster | null> {
  const c1 = await loadCluster(clusterId1);
  const c2 = await loadCluster(clusterId2);
  
  // Check overlap
  const overlap = c1.memberIds.filter(id => c2.memberIds.includes(id));
  const similarity = overlap.length / Math.min(c1.memberIds.length, c2.memberIds.length);
  
  if (similarity > CLUSTER_CONFIG.similarityThreshold) {
    // Merge into larger cluster
    const merged: MemoryCluster = {
      id: c1.memberIds.length > c2.memberIds.length ? clusterId1 : clusterId2,
      name: `${c1.name}-${c2.name}`,
      description: `Merged: ${c1.description} + ${c2.description}`,
      created: c1.created,
      updated: new Date().toISOString(),
      memberIds: [...new Set([...c1.memberIds, ...c2.memberIds])],
      metadata: {
        projectId: c1.metadata.projectId || c2.metadata.projectId,
        topic: `${c1.metadata.topic},${c2.metadata.topic}`,
        memoryTypes: [...new Set([...c1.metadata.memoryTypes, ...c2.metadata.memoryTypes])],
        confidence: Math.max(c1.metadata.confidence, c2.metadata.confidence),
        lastAccessed: new Date().toISOString()
      }
    };
    
    return merged;
  }
  
  return null;
}

/**
 * Auto-cluster memories from daily files
 */
export async function autoClusterMemories(): Promise<{
  clustersCreated: number;
  memoriesClustered: number;
  clusters: MemoryCluster[];
}> {
  const clusters = new Map<string, MemoryCluster>();
  let memoriesClustered = 0;
  
  // In real implementation, scan memory files
  // For now, placeholder logic
  
  for (const topic of CLUSTER_CONFIG.defaultTopics) {
    const clusterId = `cluster-${topic}`;
    const cluster: MemoryCluster = {
      id: clusterId,
      name: topic,
      description: `Auto-clustered memories about ${topic}`,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      memberIds: [],
      metadata: {
        topic,
        memoryTypes: ['fact', 'decision', 'preference'],
        confidence: 0.8,
        lastAccessed: new Date().toISOString()
      }
    };
    clusters.set(clusterId, cluster);
  }
  
  return {
    clustersCreated: clusters.size,
    memoriesClustered,
    clusters: Array.from(clusters.values())
  };
}

// Placeholder functions (would read from disk in real implementation)
async function loadCluster(clusterId: string): Promise<MemoryCluster> {
  throw new Error(`Cluster ${clusterId} not found (placeholder)`);
}

async function loadClusterMemories(memberIds: string[]): Promise<any[]> {
  return [];
}

function formatClusterContext(cluster: MemoryCluster, memories: any[]): string {
  const lines = [
    `\n### Cluster: ${cluster.name}`,
    `Topic: ${cluster.metadata.topic}`,
    `Members: ${memories.length} memories\n`
  ];
  
  for (const mem of memories.slice(0, 10)) {
    lines.push(`• [${mem.type}] ${mem.content.slice(0, 100)}...`);
  }
  
  return lines.join('\n');
}

// Export for use
export default {
  classifyCluster,
  createOrUpdateCluster,
  loadClusterContext,
  findRelatedInCluster,
  mergeClusters,
  autoClusterMemories
};
