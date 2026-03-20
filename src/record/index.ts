/**
 * ClawText Record — Transaction Journal
 *
 * Append-only log of all state-changing events.
 * Foundation for "RAID of Claws" multi-node replication.
 *
 * Spec: docs/RECORD_SPEC.md
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { randomUUID } from 'crypto';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type TransactionType =
  // Session events
  | 'session.message'
  | 'session.assistant'
  | 'session.checkpoint'
  // Memory events
  | 'memory.extracted'
  | 'memory.promoted'
  | 'library.added'
  // Operational learning
  | 'operational.failure'
  | 'operational.pattern'
  // Vault/permission events
  | 'vault.permission_changed'
  // Infrastructure
  | 'node.registered'
  | 'node.heartbeat';

export interface Transaction {
  id: string;
  seq: number;
  type: TransactionType;
  timestamp: string;
  sourceNode: string;
  payload: Record<string, unknown>;
  hash: string;
  previousHash: string | null;
}

export interface RecordIndex {
  lastSeq: number;
  lastHash: string | null;
  count: number;
  updatedAt: string;
}

// ──────────────────────────────────────────────
// Path helpers
// ──────────────────────────────────────────────

export function getRecordRoot(stateRoot?: string): string {
  const base = stateRoot ||
    join(process.env.HOME || '', '.openclaw', 'workspace', 'state', 'clawtext', 'prod');
  return join(base, 'record');
}

function getTransactionsPath(root: string): string {
  return join(root, 'transactions.jsonl');
}

function getIndexPath(root: string): string {
  return join(root, 'index.json');
}

// ──────────────────────────────────────────────
// Hashing
// ──────────────────────────────────────────────

export function hashPayload(payload: Record<string, unknown>): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  return 'sha256-' + createHash('sha256').update(canonical).digest('hex');
}

// ──────────────────────────────────────────────
// Index management
// ──────────────────────────────────────────────

export function loadIndex(root: string): RecordIndex {
  const indexPath = getIndexPath(root);
  if (existsSync(indexPath)) {
    try {
      return JSON.parse(readFileSync(indexPath, 'utf-8')) as RecordIndex;
    } catch {
      // corrupt index, start fresh
    }
  }
  return { lastSeq: 0, lastHash: null, count: 0, updatedAt: new Date().toISOString() };
}

function saveIndex(root: string, index: RecordIndex): void {
  writeFileSync(getIndexPath(root), JSON.stringify(index, null, 2));
}

// ──────────────────────────────────────────────
// Core operations
// ──────────────────────────────────────────────

/**
 * Append a transaction to the journal.
 *
 * Returns the written transaction (with seq + hash assigned).
 */
export function appendTransaction(
  type: TransactionType,
  payload: Record<string, unknown>,
  options?: {
    sourceNode?: string;
    stateRoot?: string;
  }
): Transaction {
  const root = getRecordRoot(options?.stateRoot);
  if (!existsSync(root)) {
    mkdirSync(root, { recursive: true });
  }

  const index = loadIndex(root);
  const seq = index.lastSeq + 1;
  const hash = hashPayload(payload);

  const txn: Transaction = {
    id: randomUUID(),
    seq,
    type,
    timestamp: new Date().toISOString(),
    sourceNode: options?.sourceNode || process.env.CLAWTEXT_NODE_ID || 'local',
    payload,
    hash,
    previousHash: index.lastHash,
  };

  // Append to JSONL
  appendFileSync(getTransactionsPath(root), JSON.stringify(txn) + '\n');

  // Update index
  const newIndex: RecordIndex = {
    lastSeq: seq,
    lastHash: hash,
    count: index.count + 1,
    updatedAt: new Date().toISOString(),
  };
  saveIndex(root, newIndex);

  return txn;
}

/**
 * Read transactions from the journal.
 *
 * @param from - Starting seq (inclusive), defaults to 1
 * @param to   - Ending seq (inclusive), defaults to lastSeq
 */
export function readTransactions(
  options?: {
    from?: number;
    to?: number;
    stateRoot?: string;
  }
): Transaction[] {
  const root = getRecordRoot(options?.stateRoot);
  const txnsPath = getTransactionsPath(root);
  if (!existsSync(txnsPath)) return [];

  const lines = readFileSync(txnsPath, 'utf-8').split('\n').filter(Boolean);
  const txns: Transaction[] = [];

  for (const line of lines) {
    try {
      const txn = JSON.parse(line) as Transaction;
      if (options?.from !== undefined && txn.seq < options.from) continue;
      if (options?.to !== undefined && txn.seq > options.to) continue;
      txns.push(txn);
    } catch {
      // malformed line, skip
    }
  }

  return txns;
}

/**
 * Verify the hash chain integrity.
 *
 * Returns { valid: true } or { valid: false, firstBadSeq: number, reason: string }.
 */
export function verifyChain(stateRoot?: string): {
  valid: boolean;
  checked: number;
  firstBadSeq?: number;
  reason?: string;
} {
  const root = getRecordRoot(stateRoot);
  const txns = readTransactions({ stateRoot });

  let prevHash: string | null = null;

  for (const txn of txns) {
    // Check previous hash linkage
    if (txn.previousHash !== prevHash) {
      return {
        valid: false,
        checked: txn.seq - 1,
        firstBadSeq: txn.seq,
        reason: `hash chain break at seq ${txn.seq}: expected previousHash=${prevHash}, got ${txn.previousHash}`,
      };
    }

    // Check payload hash
    const expected = hashPayload(txn.payload);
    if (txn.hash !== expected) {
      return {
        valid: false,
        checked: txn.seq - 1,
        firstBadSeq: txn.seq,
        reason: `payload hash mismatch at seq ${txn.seq}`,
      };
    }

    prevHash = txn.hash;
  }

  return { valid: true, checked: txns.length };
}

/**
 * Get record status.
 */
export function getRecordStatus(stateRoot?: string): RecordIndex & { path: string } {
  const root = getRecordRoot(stateRoot);
  const index = loadIndex(root);
  return { ...index, path: root };
}

// ──────────────────────────────────────────────
// Typed transaction helpers
// ──────────────────────────────────────────────

export function recordMemoryExtracted(
  sessionId: string,
  memories: Array<{ text: string; confidence: number; tags: string[] }>,
  options?: { stateRoot?: string; sourceNode?: string }
): Transaction {
  return appendTransaction('memory.extracted', { sessionId, memories }, options);
}

export function recordMemoryPromoted(
  memoryId: string,
  fromLane: string,
  toLane: string,
  reason: string,
  options?: { stateRoot?: string; sourceNode?: string }
): Transaction {
  return appendTransaction('memory.promoted', { memoryId, fromLane, toLane, reason }, options);
}

export function recordSessionCheckpoint(
  sessionId: string,
  summary: string,
  openLoops: string[],
  decisions: string[],
  options?: { stateRoot?: string; sourceNode?: string }
): Transaction {
  return appendTransaction(
    'session.checkpoint',
    { sessionId, summary, openLoops, decisions },
    options
  );
}

export function recordOperationalFailure(
  sessionId: string,
  tool: string,
  error: string,
  context: Record<string, unknown>,
  options?: { stateRoot?: string; sourceNode?: string }
): Transaction {
  return appendTransaction(
    'operational.failure',
    { sessionId, tool, error, context },
    options
  );
}
