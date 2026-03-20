/**
 * ClawText Fleet Command — Node Registry
 *
 * Each ClawText node knows about its peers, their capabilities,
 * and how to reach them. Foundation for peer push/pull replication.
 *
 * Spec: docs/FLEET_COMMAND_SPEC.md
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type NodeStatus = 'online' | 'degraded' | 'offline' | 'syncing';
export type NodeRole = 'primary' | 'secondary' | 'gateway' | 'backup' | 'readonly';
export type NodeCapability = 'memory' | 'record' | 'gateway' | 'reflect' | 'fleet';

export interface NodeEndpoints {
  api: string;
  record?: string;
  health?: string;
}

export interface NodeConfig {
  nodeId: string;
  displayName: string;
  publicKey?: string;
  endpoints: NodeEndpoints;
  capabilities: NodeCapability[];
  region?: string;
  replication?: {
    pushOnWrite: boolean;
    pullOnConnect: boolean;
    heartbeatIntervalMs: number;
  };
  roles: NodeRole[];
}

export interface NodeRegistryEntry extends NodeConfig {
  status: NodeStatus;
  lastSeen: string;
  seq: number;
}

export interface NodeRegistry {
  nodes: Record<string, NodeRegistryEntry>;
  updatedAt: string;
}

export interface Heartbeat {
  type: 'heartbeat';
  nodeId: string;
  seq: number;
  status: NodeStatus;
  timestamp: string;
}

// ──────────────────────────────────────────────
// Path helpers
// ──────────────────────────────────────────────

export function getFleetRoot(stateRoot?: string): string {
  const base = stateRoot ||
    join(process.env.HOME || '', '.openclaw', 'workspace', 'state', 'clawtext', 'prod');
  return join(base, 'fleet');
}

function getNodeConfigPath(root: string): string {
  return join(root, 'config.json');
}

function getNodesPath(root: string): string {
  return join(root, 'nodes.json');
}

// ──────────────────────────────────────────────
// Loaders
// ──────────────────────────────────────────────

function loadJSON<T>(path: string, fallback: T): T {
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8')) as T;
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function loadNodeConfig(stateRoot?: string): NodeConfig | null {
  const root = getFleetRoot(stateRoot);
  return loadJSON<NodeConfig | null>(getNodeConfigPath(root), null);
}

export function loadNodeRegistry(stateRoot?: string): NodeRegistry {
  const root = getFleetRoot(stateRoot);
  return loadJSON<NodeRegistry>(getNodesPath(root), { nodes: {}, updatedAt: new Date().toISOString() });
}

function saveNodeRegistry(registry: NodeRegistry, stateRoot?: string): void {
  const root = getFleetRoot(stateRoot);
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  writeFileSync(getNodesPath(root), JSON.stringify(registry, null, 2));
}

// ──────────────────────────────────────────────
// Registry operations
// ──────────────────────────────────────────────

/**
 * Register or update a node in the registry.
 */
export function upsertNode(
  entry: NodeRegistryEntry,
  stateRoot?: string
): NodeRegistry {
  const registry = loadNodeRegistry(stateRoot);
  registry.nodes[entry.nodeId] = { ...entry };
  registry.updatedAt = new Date().toISOString();
  saveNodeRegistry(registry, stateRoot);
  return registry;
}

/**
 * Record a heartbeat from a peer node.
 *
 * Updates lastSeen, status, and seq.
 */
export function recordHeartbeat(hb: Heartbeat, stateRoot?: string): NodeRegistry {
  const registry = loadNodeRegistry(stateRoot);
  const existing = registry.nodes[hb.nodeId];

  if (existing) {
    existing.status = hb.status;
    existing.lastSeen = hb.timestamp;
    existing.seq = hb.seq;
  } else {
    // Unknown node — register it with minimal info
    registry.nodes[hb.nodeId] = {
      nodeId: hb.nodeId,
      displayName: hb.nodeId,
      endpoints: { api: '' },
      capabilities: [],
      roles: [],
      status: hb.status,
      lastSeen: hb.timestamp,
      seq: hb.seq,
    };
  }

  registry.updatedAt = new Date().toISOString();
  saveNodeRegistry(registry, stateRoot);
  return registry;
}

/**
 * Remove a node from the registry.
 */
export function removeNode(nodeId: string, stateRoot?: string): NodeRegistry {
  const registry = loadNodeRegistry(stateRoot);
  delete registry.nodes[nodeId];
  registry.updatedAt = new Date().toISOString();
  saveNodeRegistry(registry, stateRoot);
  return registry;
}

/**
 * Get nodes that are online or degraded (reachable).
 */
export function getOnlineNodes(stateRoot?: string): NodeRegistryEntry[] {
  const registry = loadNodeRegistry(stateRoot);
  return Object.values(registry.nodes).filter(
    (n) => n.status === 'online' || n.status === 'degraded'
  );
}

/**
 * Check if a node should be marked offline (no heartbeat for timeoutMs).
 *
 * Returns updated registry with stale nodes marked offline.
 */
export function sweepStaleNodes(
  timeoutMs = 120_000,
  stateRoot?: string
): NodeRegistry {
  const registry = loadNodeRegistry(stateRoot);
  const now = Date.now();
  let changed = false;

  for (const node of Object.values(registry.nodes)) {
    const lastSeen = new Date(node.lastSeen).getTime();
    if (node.status !== 'offline' && now - lastSeen > timeoutMs) {
      node.status = 'offline';
      changed = true;
    }
  }

  if (changed) {
    registry.updatedAt = new Date().toISOString();
    saveNodeRegistry(registry, stateRoot);
  }

  return registry;
}

/**
 * Fleet status summary.
 */
export function getFleetStatus(stateRoot?: string): {
  total: number;
  online: number;
  degraded: number;
  offline: number;
  syncing: number;
  nodes: NodeRegistryEntry[];
} {
  const registry = loadNodeRegistry(stateRoot);
  const nodes = Object.values(registry.nodes);

  return {
    total: nodes.length,
    online: nodes.filter((n) => n.status === 'online').length,
    degraded: nodes.filter((n) => n.status === 'degraded').length,
    offline: nodes.filter((n) => n.status === 'offline').length,
    syncing: nodes.filter((n) => n.status === 'syncing').length,
    nodes,
  };
}

/**
 * Build a heartbeat payload for this node.
 */
export function buildHeartbeat(seq: number, stateRoot?: string): Heartbeat | null {
  const config = loadNodeConfig(stateRoot);
  if (!config) return null;

  return {
    type: 'heartbeat',
    nodeId: config.nodeId,
    seq,
    status: 'online',
    timestamp: new Date().toISOString(),
  };
}
