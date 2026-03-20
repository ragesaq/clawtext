# ClawText Record — Transaction Journal Specification

**Status:** Proposed  
**Date:** 2026-03-20  
**Purpose:** Define the transaction format for journal-based replication

---

## Overview

The **Record** is ClawText's transaction journal. Every state-changing event is an entry. Entries are pushed to peers and replayed to maintain coherence across the cluster.

This is the foundation for the "RAID of Claws" — true session/state replication.

---

## Transaction Format

```json5
{
  "id": "txn-abc123",
  "seq": 42,
  "type": "session.message",
  "timestamp": "2026-03-20T02:42:00Z",
  "sourceNode": "luminous",
  "payload": { ... },
  "hash": "sha256-of-payload",
  "signature": "node-private-key-sig",
  "previousHash": "sha256-of-txn-41"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique transaction ID (UUID) |
| `seq` | number | Sequence number for ordering |
| `type` | string | Transaction type (see below) |
| `timestamp` | ISO8601 | When it happened |
| `sourceNode` | string | Which node created it |
| `payload` | object | Type-specific data |
| `hash` | string | SHA-256 of payload for integrity |
| `signature` | string | Node's private key signature |
| `previousHash` | string | Hash of previous transaction (chain) |

---

## Transaction Types

### Session Events

```json5
{
  "type": "session.message",
  "payload": {
    "sessionId": "discord-thread:123",
    "role": "user",
    "content": "hello",
    "turn": 5
  }
}
```

```json5
{
  "type": "session.assistant",
  "payload": {
    "sessionId": "discord-thread:123",
    "content": "hi!",
    "turn": 6
  }
}
```

```json5
{
  "type": "session.checkpoint",
  "payload": {
    "sessionId": "discord-thread:123",
    "summary": "user asked about RBAC",
    "openLoops": ["permission model implementation"],
    "decisions": ["use 4-layer hierarchy"]
  }
}
```

### Memory Events

```json5
{
  "type": "memory.extracted",
  "payload": {
    "sessionId": "discord-thread:123",
    "memories": [
      { "text": "user likes RBAC model", "confidence": 0.9, "tags": ["preference"] },
      { "text": "needs journal replication", "confidence": 0.8, "tags": ["task"] }
    ]
  }
}
```

```json5
{
  "type": "memory.promoted",
  "payload": {
    "memoryId": "mem-xyz",
    "fromLane": "working",
    "toLane": "curated",
    "reason": "high-signal decision"
  }
}
```

```json5
{
  "type": "library.added",
  "payload": {
    "entryId": "lib-abc",
    "title": "RBAC Permission Model",
    "content": "...",
    "tags": ["architecture", "permissions"]
  }
}
```

### Operational Learning

```json5
{
  "type": "operational.failure",
  "payload": {
    "sessionId": "discord-thread:123",
    "tool": "exec",
    "error": "command timed out",
    "context": { ... }
  }
}
```

```json5
{
  "type": "operational.pattern",
  "payload": {
    "patternId": "pat-xyz",
    "signature": "exec-timeout-on-long-command",
    "frequency": 5,
    "recovery": "add timeout parameter"
  }
}
```

### Vault/Permission Events

```json5
{
  "type": "vault.permission_changed",
  "payload": {
    "vaultId": "financial-analysis",
    "userId": "user-1",
    "field": "recallBudget",
    "oldValue": "medium",
    "newValue": "high"
  }
}
```

---

## Chain Integrity

Each entry references the previous entry's hash:

```
txn-1 (genesis) → txn-2 → txn-3 → txn-4 → ...
```

This creates a **hash chain** — anyone can verify the entire sequence hasn't been tampered with.

---

## Replication Protocol

### Push Model (when event happens)

1. Node A processes event, creates transaction
2. Node A pushes to all configured peers
3. Peers verify hash + signature
4. Peers acknowledge

### Pull Model (on connect/reconnect)

1. Node B connects to cluster
2. Node B asks peers: "what's your latest seq?"
3. Peers respond: "I have up to seq 100"
4. Node B pulls entries 50→100 (missing ones)
5. Node B replays to catch up

### Conflict Resolution

- Last-write-wins for same seq
- Sequence numbers prevent gaps
- Hash chain catches tampering

---

## Storage

```
state/clawtext/prod/record/
  transactions.jsonl    # append-only log
  index.json            # seq → txnId mapping
  compacted/            # archived after checkpoint
```

---

## Idempotency

Each transaction is idempotent — applying it twice has the same effect as applying once.

- `memory.extracted` checks memoryId before inserting
- `library.added` checks entryId before inserting
- `session.checkpoint` overwrites previous checkpoint for same session

---

## CLI Commands (Future)

```bash
clawtext ledger status              # show current seq per node
clawtext ledger push                 # force push to peers
clawtext ledger pull                 # pull from peers
clawtext ledger verify               # verify chain integrity
clawtext ledger replay <from> <to>  # replay range
clawtext ledger compact              # archive old entries
```

---

## Why This Matters

- **Coherence** — Every node sees same session state
- **Failover** — Session survives node death
- **Audit** — Full history replayable
- **Integrity** — Hash chain prevents tampering

---

*This is the foundation for "RAID of Claws" — true multi-node replication.*
