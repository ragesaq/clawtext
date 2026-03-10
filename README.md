# ClawText — Comprehensive Memory Platform for OpenClaw

**Version:** 1.4.0 | **Status:** Production | **Type:** OpenClaw Skill/Plugin

> Memory that captures, ingests, retrieves, curates, and learns — without letting `MEMORY.md` become your whole memory store.

---

## What Is ClawText?

OpenClaw agents already have basic memory through `MEMORY.md`. It works for small projects. It doesn't scale.

ClawText replaces that with a **three-lane memory platform**:

| Lane | What It Does |
|------|-------------|
| **Working Memory** | Captures conversation context automatically. Tiered retrieval injects the right memories at prompt time. |
| **Knowledge Ingest** | Bulk-loads repos, docs, Discord threads, exports, and data sources into a searchable knowledge base. |
| **Operational Learning** | Captures tool failures, recurring errors, and successful patterns. Reviews, promotes, and applies durable lessons to make the system more self-healing over time. |

**One install. One plugin. All three lanes.**

---

## Why This Matters

### The Problem

Every agent session starts from zero. Without persistent memory:
- You re-explain context every session
- The same mistakes happen again
- Knowledge built in one session disappears in the next
- Importing a codebase or doc set requires custom scripting every time
- Tool failures leave no trace — they just repeat

### The Solution

```
Without ClawText:
  Session 1 → learns something → lost
  Session 2 → starts over → re-learns same thing

With ClawText:
  Session 1 → auto-captured → tiered memory
  Session 2 → injected context → builds on session 1
  Session N → patterns reviewed → promoted to durable guidance
```

ClawText runs in the background. Your agents get smarter every session — and the system gets more self-healing over time.

---

## Three Lanes in Depth

### Lane 1: Working Memory

Captures from conversations. Organized into four tiers so retrieval stays fast and prompt-efficient.

```
Conversation
     ↓
L4 Staging    ← raw captures, bulk ingest buffer
     ↓ review/promote
L3 Archive    ← full history, searchable
     ↓ curated, deduped, ranked
L2 Curated    ← validated memories
     ↓ hot-admitted by BM25 score
L1 Hot Cache  ← sub-millisecond retrieval → injected into every prompt
```

**Key properties:**
- **BM25 scoring** — term frequency + confidence weighting + project-aware ranking
- **Semantic clustering** — memories grouped by topic, not just timestamp
- **Deduplication** — SHA1 hashing prevents re-storing the same memory
- **Token budgeting** — never exceeds your configured prompt context budget
- **Sticky retention** — high-value memories stay in hot cache longer

---

### Lane 2: Knowledge Ingest

Bulk-loads external sources into a separate knowledge base. Kept out of the prompt path by default — queried on-demand when relevant.

**Supported sources:**
- GitHub repos
- Markdown/doc directories
- Discord forums, channels, and threads (full hierarchy, progress bars, batch mode)
- JSON exports from any source
- Raw text

```bash
# Ingest a Discord forum
npm run ingest:discord -- --forum-id 123456789 --mode batch --verbose

# Ingest a folder of docs
clawtext-ingest ingest-files --input="docs/**/*.md" --project=myproject

# Ingest a full Discord forum (auto-detects batch vs full mode)
clawtext-ingest-discord fetch-discord --forum-id 123456789

# Check knowledge repo freshness
npm run knowledge:status
# → 🟢 fresh | 🟡 aging (30-90d) | 🔴 stale (>90d)
```

**Why keep it separate from working memory?**

Injecting a 500KB codebase into every prompt wastes tokens and confuses the LLM. Knowledge repos live separately — your agent queries them on-demand when it needs specifics, while working memory handles project context.

---

### Lane 3: Operational Learning

The self-healing lane. Captures failures and successes, detects recurring patterns, surfaces them for review, and promotes stable lessons into durable guidance.

**Lifecycle:**

```
Tool fails / command fails / hook fires
          ↓
    [Capture: raw]        ← automatic, silent
          ↓ recurs N times
    [Candidate]           ← auto-promoted
          ↓ agent-led review
    [Reviewed]
      ↙         ↘
  reject       approve
    ↓              ↓
 Archived      Promoted
                   ↓ agent proposes target, user confirms
           ┌───────────────────┐
           │  Durable Guidance │
           │  SOUL.md          │
           │  AGENTS.md        │
           │  TOOLS.md         │
           │  project docs     │
           └───────────────────┘
```

**What gets captured:**
- Tool failures (automatic via hooks)
- Command/script failures
- Repeated error patterns
- Successful recovery patterns
- Optimization discoveries

**Why this makes OpenClaw more robust:**
Most memory systems optimize for prompt efficiency — faster retrieval, better token use, cleaner context injection. ClawText's operational lane goes further: it actively makes the *system itself* more reliable by turning recurring failures into reviewed guidance. Less re-explaining. Fewer repeat mistakes. An agent that genuinely improves.

---

## Ownership Model

ClawText is designed to be automatic where safe, agent-led where orchestration is needed, and user-approved where judgment matters.

| What | Owner | How |
|------|-------|-----|
| Capture hooks, memory injection, failure capture, maintenance runs | 🤖 Automatic | No action needed |
| Review packets, promotion proposals, ingest orchestration, maintenance scheduling | 🤝 Agent | Agent presents; you glance |
| Approve/reject/defer candidates, approve durable promotions, approve recurring cadence | ✅ You | Your call |
| Raw CLI, cache tuning, direct memory edits | 🔧 Admin | Backend only |

---

## Compared to Alternatives

| Feature | **ClawText 1.4** | mem0 | QMD | MEMORY.md only |
|---------|:----------------:|:----:|:---:|:--------------:|
| Multi-tier retrieval (4 tiers) | ✅ | ⚠️ basic | ✅ 3 tiers | ❌ |
| BM25 + semantic clustering | ✅ | ❌ | ✅ | ❌ |
| Sub-ms hot cache | ✅ | ⚠️ DB latency | ⚠️ DB latency | ❌ |
| Knowledge repo / bulk ingest | ✅ (Discord, files, JSON, repos) | ⚠️ basic | ✅ | ❌ |
| Discord ingest (forums, threads, hierarchy) | ✅ | ❌ | ❌ | ❌ |
| Auto deduplication | ✅ SHA1 | ⚠️ | ⚠️ | ❌ |
| Agent-assisted maintenance | ✅ | ⚠️ manual | ⚠️ manual | ❌ |
| No external services required | ✅ | ❌ API calls | ❌ vector service | ✅ |
| Built for OpenClaw | ✅ | ❌ | ❌ | ✅ limited |
| **Operational learning lane** | ✅ | ❌ | ❌ | ❌ |
| **Failure capture + pattern review** | ✅ | ❌ | ❌ | ❌ |
| **Promotion to durable guidance** | ✅ | ❌ | ❌ | ❌ |
| **System self-healing over time** | ✅ | ❌ | ❌ | ❌ |

The bottom four rows are what v1.4 adds. Other memory systems focus on making prompts better. ClawText also makes the *agent system* more robust and self-healing over time.

---

## Quick Start

### 1. Activate

Add to your `openclaw.json`:

```json
{
  "plugins": {
    "load": {
      "paths": ["~/.openclaw/workspace/skills/clawtext"]
    },
    "allow": ["clawtext"],
    "entries": {
      "clawtext": { "enabled": true }
    }
  }
}
```

Restart your gateway, then verify:

```bash
openclaw plugins list
# Expected: ClawText | clawtext | loaded

openclaw gateway status
# Expected: running + RPC probe ok
```

### 2. Build

```bash
cd ~/.openclaw/workspace/skills/clawtext
npm install
npm run build
```

### 3. Use

```bash
# Check system health
npm run health

# Ingest a Discord forum
npm run ingest:discord -- --forum-id YOUR_FORUM_ID --verbose

# Ingest files
clawtext-ingest ingest-files --input="docs/**/*.md" --project=myproject

# Check working memory
npm run memory -- search "auth"

# Check operational patterns
npm run operational:status
```

---

## Architecture

```
~/.openclaw/workspace/skills/clawtext/   ← ONE install path
│
├── openclaw.plugin.json   ← plugin manifest
├── SKILL.md               ← skill definition
├── AGENT_INSTALL.md       ← activation story
│
├── src/
│   ├── index.ts           ← plugin entry
│   ├── plugin.ts          ← OpenClaw plugin wiring
│   ├── rag.ts             ← retrieval engine (BM25, clustering)
│   ├── hot-cache.ts       ← L1 cache
│   ├── memory.ts          ← L2/L3 memory management
│   ├── ingest/            ← bundled ingest engine
│   │   ├── index.js       ← ClawTextIngest class
│   │   ├── agent-runner.js
│   │   └── adapters/
│   │       └── discord.js ← Discord forum/channel/thread adapter
│   ├── operational.ts     ← operational memory store
│   ├── operational-capture.ts
│   ├── operational-aggregation.ts
│   ├── operational-retrieval.ts
│   ├── operational-review.ts
│   ├── operational-promotion.ts
│   └── operational-maintenance.ts
│
├── bin/
│   ├── ingest.js          ← clawtext-ingest CLI
│   └── discord.js         ← clawtext-ingest-discord CLI
│
├── scripts/               ← agent-owned backend commands
│   ├── operational-cli.mjs
│   ├── health-report.mjs
│   ├── review-digest.mjs
│   ├── ingest-all.mjs
│   └── ...
│
└── docs/
    ├── ARCHITECTURE.md
    ├── INGEST.md
    ├── OPERATIONAL_LEARNING.md
    └── ...
```

---

## Deployment

### Single-Node (Current, Recommended)

All agents share `~/.openclaw/workspace/memory/`. File-based, automatically synchronized. No locking needed.

**Covers 99% of real deployments.** One machine, many agents, shared memory.

### Multi-Node (Future)

Each Gateway has isolated memory. If you scale to multiple Gateways, add a sync layer: shared filesystem, central DB, Git-based sync, or S3-compatible storage. This is not v1.4 scope.

---

## Tuning

ClawText works out of the box. If you want to tune:

### Hot Cache Admission

In `src/hot-cache.ts`:

```javascript
admissionConfidence: 0.60,  // Min confidence to enter cache (0.0–1.0)
admissionScore: 0.8,        // Min BM25 score to enter cache
maxItems: 300,              // Max items in cache
defaultTtlDays: 14,         // Days before memory expires
stickyTtlDays: 60,          // Days before high-confidence memory expires
```

**When to adjust:**
- Hit rate dropping → lower thresholds
- Cache filling with noise → raise thresholds

### Monitor

```bash
npm run health
# Reports: hit rate, cache size, staleness, review backlog, recommendations
```

Target hit rate: **>95%**

---

## Documentation

- **[SKILL.md](SKILL.md)** — Runtime role, ownership model, plugin/skill story
- **[AGENT_INSTALL.md](AGENT_INSTALL.md)** — Activation, allowlist, restart, verification
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Memory tiers, retrieval algorithms, performance tuning
- **[docs/INGEST.md](docs/INGEST.md)** — Bulk ingest sources, Discord setup, deduplication
- **[docs/OPERATIONAL_LEARNING.md](docs/OPERATIONAL_LEARNING.md)** — Operational lane design, capture policy, review/promotion lifecycle
- **[docs/MULTI_AGENT.md](docs/MULTI_AGENT.md)** — Shared/private memory, agent collaboration
- **[docs/CURATION.md](docs/CURATION.md)** — Promotion, archiving, deduplication pipeline
- **[docs/TESTING.md](docs/TESTING.md)** — Verify installation, run integration tests

---

## GitHub

**https://github.com/ragesaq/clawtext**

---

## Version History

| Version | What Changed |
|---------|-------------|
| **1.4.0** | Bundled ingest engine (was separate package). Added operational learning lane: capture, review, promotion, maintenance. Three-lane architecture complete. |
| 1.3.0 | Hot cache optimization, BM25 scoring, plugin activation + allowlist story, SKILL.md / AGENT_INSTALL.md |
| 1.2.0 | Tiered memory (L1–L4), cluster rebuild, validate-rag tooling |
| 1.1.0 | Initial multi-source ingest, deduplication pipeline |
| 1.0.0 | Initial release — basic memory injection + retrieval |
