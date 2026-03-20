# ClawText Fleet Command — Node Registry Specification

**Status:** Proposed  
**Date:** 2026-03-20  
**Purpose:** Define how ClawText nodes discover and communicate with each other

---

## Overview

**Fleet Command** is ClawText's cluster node registry. Each node knows about its peers, their capabilities, and how to reach them.

This enables:
- Peer discovery
- Replication push/pull
- Health monitoring
- Load balancing

---

## Registry Structure

**Location:** `state/clawtext/prod/fleet/`

```
fleet/
  config.json      # this node's config
  nodes.json       # known nodes
  network.json     # network topology hints
```

---

## Node Config

Each node has its own configuration:

```json5
// luminous: state/clawtext/prod/hive/config.json
{
  "nodeId": "luminous",
  "displayName": "Luminous (Main)",
  "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
  "endpoints": {
    "api": "https://luminous:443",
    "ledger": "https://luminous:444/ledger",
    "health": "https://luminous:444/health"
  },
  "capabilities": ["memory", "ledger", "gateway"],
  "region": "home",
  "replication": {
    "pushOnWrite": true,
    "pullOnConnect": true,
    "heartbeatIntervalMs": 30000
  },
  "roles": ["primary", "gateway"]
}
```

---

## Known Nodes

The registry of all known nodes in the cluster:

```json5
// nodes.json
{
  "nodes": {
    "luminous": {
      "nodeId": "luminous",
      "displayName": "Luminous (Main)",
      "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
      "endpoints": {
        "api": "https://luminous:443",
        "ledger": "https://luminous:444/ledger"
      },
      "status": "online",
      "lastSeen": "2026-03-20T02:42:00Z",
      "seq": 142,
      "region": "home"
    },
    "cerberus": {
      "nodeId": "cerberus",
      "displayName": "Cerberus (Streaming)",
      "publicKey": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
      "endpoints": {
        "api": "https://cerberus:443",
        "ledger": "https://cerberus:444/ledger"
      },
      "status": "online",
      "lastSeen": "2026-03-20T02:41:58Z",
      "seq": 140,
      "region": "streaming"
    },
    "backup-1": {
      "nodeId": "backup-1",
      "displayName": "Backup Node 1",
      "publicKey": "...",
      "endpoints": {
        "api": "https://backup-1:443"
      },
      "status": "offline",
      "lastSeen": "2026-03-19T12:00:00Z",
      "seq": 89,
      "region": "backup"
    }
  },
  "updatedAt": "2026-03-20T02:42:00Z"
}
```

---

## Node Status

| Status | Meaning |
|--------|---------|
| `online` | Active, responding to heartbeats |
| `degraded` | Responding but lagging |
| `offline` | Not responding |
| `syncing` | Catching up after reconnect |

---

## Node Discovery

### Static
Nodes are configured manually in `nodes.json`.

### Dynamic (Future)
- mDNS / broadcast discovery
- DNS SRV records
- Service mesh integration

---

## Heartbeat Protocol

Each node periodically sends heartbeat:

```json5
{
  "type": "heartbeat",
  "nodeId": "luminous",
  "seq": 142,
  "status": "online",
  "timestamp": "2026-03-20T02:42:00Z"
}
```

Peers update `lastSeen` and `status` accordingly.

If no heartbeat for `timeoutMs` (default 2 minutes), node marked `offline`.

---

## Replication Flow

### On Write

1. Node A processes event, writes to local ledger
2. Node A reads `nodes.json` to find peers
3. Node A pushes transaction to each peer's `/ledger/push` endpoint
4. Peers verify signature, replay transaction
5. Peers acknowledge

### On Connect

1. Node B starts up
2. Node B loads `nodes.json`
3. Node B connects to each online peer
4. Node B asks: "what's your latest seq?"
5. Peer responds: "seq 142"
6. Node B's local seq: 100
7. Node B pulls entries 101→142
8. Node B replays to catch up

---

## Security

### mTLS
All node-to-node communication uses mutual TLS.

### Signing
Each transaction signed with node's private key.
Peers verify signature before replay.

### Hash Chain
Each transaction references previous — prevents insertion attacks.

---

## API Endpoints

### GET /health
Liveness probe for load balancers.

```json
{ "status": "online", "nodeId": "luminous", "seq": 142 }
```

### POST /ledger/push
Push new transactions to peer.

```json
{ "transactions": [ ... ] }
```

### GET /ledger/pull?from=100&to=142
Pull transaction range.

```json
{ "transactions": [ ... ] }
```

### GET /ledger/status
Peer reports its current state.

```json
{ "seq": 142, "hash": "abc123" }
```

---

## CLI Commands (Future)

```bash
clawtext fleet status              # show all nodes, status
clawtext fleet add <url>           # add peer by URL
clawtext fleet remove <nodeId>     # remove peer
clawtext fleet verify              # verify node signatures
clawtext fleet heartbeat           # force heartbeat
```

---

## Failure Scenarios

### Node dies
- Others mark it `offline`
- Continue serving
- When it returns, it pulls missing transactions

### Network partition
- Each node serves locally
- On reconnect, sync missing transactions

### Slow node
- If >10 seq behind, marked `degraded`
- Load balancer can deprioritize

---

## Why "Fleet Command"?

- It's the command center for the fleet
- Nodes report in, health is tracked, coordination happens
- Fits our existing fleet terminology
- Not crypto-related

---

*This is the infrastructure behind "RAID of Claws" — making multiple ClawText nodes work as one.*
