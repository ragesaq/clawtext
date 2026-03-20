/**
 * ClawText Peer — Push/Pull Replication Protocol
 *
 * HTTP-based peer protocol for multi-node transaction sync.
 * Each node can push new transactions to peers and pull missing ones.
 *
 * Spec: docs/FLEET_COMMAND_SPEC.md (Replication Flow section)
 */

import { join } from 'path';
import {
  loadNodeRegistry,
  loadNodeConfig,
  recordHeartbeat,
  type NodeRegistryEntry,
  type Heartbeat,
} from '../fleet/index.js';
import {
  readTransactions,
  appendTransaction,
  getRecordStatus,
  hashPayload,
  type Transaction,
} from '../record/index.js';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface PeerPushRequest {
  transactions: Transaction[];
  sourceNode: string;
}

export interface PeerPushResponse {
  accepted: number;
  skipped: number;
  errors: string[];
}

export interface PeerPullRequest {
  from: number;
  to?: number;
}

export interface PeerPullResponse {
  transactions: Transaction[];
  nodeSeq: number;
}

export interface PeerStatusResponse {
  nodeId: string;
  seq: number;
  hash: string | null;
  status: 'online';
}

export interface SyncResult {
  peer: string;
  pulled: number;
  pushed: number;
  errors: string[];
}

// ──────────────────────────────────────────────
// Outbound: push transactions to a peer
// ──────────────────────────────────────────────

async function fetchJSON<T>(
  url: string,
  method: 'GET' | 'POST',
  body?: unknown,
  timeoutMs = 10_000
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const resp = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!resp.ok) {
      return { ok: false, error: `HTTP ${resp.status}` };
    }

    const data = await resp.json() as T;
    return { ok: true, data };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Push transactions to a single peer.
 */
export async function pushToPeer(
  peer: NodeRegistryEntry,
  transactions: Transaction[]
): Promise<PeerPushResponse> {
  const url = (peer.endpoints.record || peer.endpoints.api) + '/push';
  const req: PeerPushRequest = {
    transactions,
    sourceNode: process.env.CLAWTEXT_NODE_ID || 'local',
  };

  const result = await fetchJSON<PeerPushResponse>(url, 'POST', req);

  if (!result.ok || !result.data) {
    return { accepted: 0, skipped: 0, errors: [result.error || 'unknown error'] };
  }

  return result.data;
}

/**
 * Get peer's current record status.
 */
export async function getPeerStatus(peer: NodeRegistryEntry): Promise<PeerStatusResponse | null> {
  const url = (peer.endpoints.record || peer.endpoints.api) + '/status';
  const result = await fetchJSON<PeerStatusResponse>(url, 'GET');
  return result.ok ? result.data || null : null;
}

/**
 * Pull missing transactions from a peer.
 */
export async function pullFromPeer(
  peer: NodeRegistryEntry,
  fromSeq: number,
  toSeq?: number
): Promise<Transaction[]> {
  const base = peer.endpoints.record || peer.endpoints.api;
  const url = `${base}/pull?from=${fromSeq}${toSeq ? `&to=${toSeq}` : ''}`;
  const result = await fetchJSON<PeerPullResponse>(url, 'GET');

  if (!result.ok || !result.data) return [];
  return result.data.transactions;
}

/**
 * Send heartbeat to a peer.
 */
export async function sendHeartbeat(peer: NodeRegistryEntry, hb: Heartbeat): Promise<boolean> {
  const url = (peer.endpoints.record || peer.endpoints.api) + '/heartbeat';
  const result = await fetchJSON(url, 'POST', hb);
  return result.ok;
}

// ──────────────────────────────────────────────
// Inbound: receive transactions from peers (server-side handlers)
// ──────────────────────────────────────────────

/**
 * Handle an inbound push from a peer.
 *
 * Validates each transaction and replays new ones locally.
 * Idempotent — duplicate transactions are skipped silently.
 */
export async function handleInboundPush(
  req: PeerPushRequest,
  stateRoot?: string
): Promise<PeerPushResponse> {
  const status = getRecordStatus(stateRoot);
  const existing = new Set(
    readTransactions({ stateRoot }).map((t) => t.id)
  );

  let accepted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const txn of req.transactions) {
    if (existing.has(txn.id)) {
      skipped++;
      continue;
    }

    // Verify payload hash
    const expectedHash = hashPayload(txn.payload);
    if (txn.hash !== expectedHash) {
      errors.push(`txn ${txn.id}: hash mismatch`);
      continue;
    }

    // Replay transaction locally
    try {
      appendTransaction(txn.type, txn.payload, { stateRoot, sourceNode: txn.sourceNode });
      accepted++;
    } catch (err: unknown) {
      errors.push(`txn ${txn.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { accepted, skipped, errors };
}

/**
 * Handle an inbound heartbeat from a peer.
 */
export function handleInboundHeartbeat(hb: Heartbeat, stateRoot?: string): void {
  recordHeartbeat(hb, stateRoot);
}

// ──────────────────────────────────────────────
// Sync: full push/pull cycle with all online peers
// ──────────────────────────────────────────────

/**
 * Sync with all online peers:
 * 1. Pull any transactions we're missing from each peer
 * 2. Push any transactions peers are missing from us
 *
 * Returns summary of what was synced.
 */
export async function syncWithPeers(stateRoot?: string): Promise<SyncResult[]> {
  const registry = loadNodeRegistry(stateRoot);
  const myConfig = loadNodeConfig(stateRoot);
  const myNodeId = myConfig?.nodeId || process.env.CLAWTEXT_NODE_ID || 'local';
  const myStatus = getRecordStatus(stateRoot);

  const results: SyncResult[] = [];

  for (const peer of Object.values(registry.nodes)) {
    if (peer.nodeId === myNodeId) continue;
    if (peer.status !== 'online' && peer.status !== 'degraded') continue;

    const result: SyncResult = { peer: peer.nodeId, pulled: 0, pushed: 0, errors: [] };

    // Get peer status
    const peerStatus = await getPeerStatus(peer);
    if (!peerStatus) {
      result.errors.push('unreachable');
      results.push(result);
      continue;
    }

    // Pull: if peer has more than us
    if (peerStatus.seq > myStatus.lastSeq) {
      const missing = await pullFromPeer(peer, myStatus.lastSeq + 1, peerStatus.seq);
      const pushResp = await handleInboundPush(
        { transactions: missing, sourceNode: peer.nodeId },
        stateRoot
      );
      result.pulled = pushResp.accepted;
      result.errors.push(...pushResp.errors);
    }

    // Push: if we have more than peer
    if (myStatus.lastSeq > peerStatus.seq) {
      const toSend = readTransactions({ from: peerStatus.seq + 1, stateRoot });
      if (toSend.length > 0) {
        const pushResp = await pushToPeer(peer, toSend);
        result.pushed = pushResp.accepted;
        result.errors.push(...pushResp.errors);
      }
    }

    results.push(result);
  }

  return results;
}
