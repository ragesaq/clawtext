# ClawText

**Version:** 1.0.0 | **Status:** Production-Ready

Intelligent retrieval-augmented generation (RAG) layer for OpenClaw. Automatically searches your memories and injects relevant context into every prompt before execution.

Think of it as a smart filter: instead of passing all memories to your model, ClawText identifies what matters and injects only that context.

## Why

OpenClaw's `memory-core` stores memories. ClawText retrieves them automatically:

| Without ClawText | With ClawText |
|---|---|
| Manual memory retrieval | Automatic search (5-7ms) |
| Inconsistent context | 85%+ confidence scoring |
| Wasted token budget | 12% efficient injection |
| Every conversation from scratch | Agents learn and improve |

## Features

- **Automatic retrieval** — Searches memories on every prompt
- **RAG-based scoring** — BM25 keyword matching + metadata awareness (project routing, pattern recognition, entity tracking)
- **Efficient injection** — Only relevant memories, token-aware (~12% of budget)
- **Agent-friendly** — Fully automated setup with exit codes for automation
- **No breaking changes** — Works alongside memory-core, optional YAML headers

## Installation

```bash
git clone https://github.com/ragesaq/clawtext.git
cd clawtext
npm install
node install.js --auto-config
```

Enable in OpenClaw config:
```json
{
  "skills": {
    "clawtext": { "enabled": true }
  }
}
```

## Performance

- **Search latency:** 5-7ms
- **Injection overhead:** <100ms
- **Memory footprint:** <8MB
- **Quality:** 85%+ avg confidence, <5% false positives
- **Tested with:** 476+ memories, 15 clusters

## Configuration

Out-of-the-box works for most use cases. Tunable per-agent:

```javascript
{
  "maxMemories": 7,        // Memories per query
  "minConfidence": 0.70,   // Quality threshold
  "tokenBudget": 4000,     // Injection limit
  "injectMode": "smart"    // Full text vs snippets
}
```

See README for advanced tuning scenarios (hallucination control, context loss, pattern recognition).

## How It Works

```
Prompt → memory-core (storage) + ClawText RAG (search) → Enriched prompt → Model
```

ClawText handles:
- BM25 keyword matching (fast, accurate)
- Project-aware filtering (prevent cross-domain noise)
- Pattern recognition (error prevention)
- Entity tracking (multi-agent cooperation)
- Token budgeting (safe, predictable)

## Docs

- **README.md** — Full guide, API, examples
- **AGENT_INSTALL.md** — Automation checklist
- **TROUBLESHOOTING.md** — 10 common issues + solutions

## License

MIT
