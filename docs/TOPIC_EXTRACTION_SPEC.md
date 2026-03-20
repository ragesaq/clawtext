# ClawText Topic-Based Extraction

**Status:** Proposed  
**Date:** 2026-03-20  
**Purpose:** Route different conversation topics to different extraction behaviors

---

## The Problem

Currently, all conversations are treated the same:
- Same extraction depth
- Same retention frequency
- Same entity types

But not all conversations are equal:
- Architecture discussions → should extract verbose, save often
- Quick questions → should extract lightly, save less
- Random banter → should probably not save at all

---

## The Solution: Topic-Based Extraction

Each conversation (topic) maps to an **extraction strategy**.

### How It Works

1. Identify the **topic** of a conversation (channel, thread, project, or explicit tag)
2. Look up the **strategy** for that topic
3. Apply extraction based on strategy rules

---

## Extraction Strategies

A strategy defines how memory is extracted and retained.

### Strategy Modes

| Mode | Recall | Retain | Use Case |
|------|--------|--------|----------|
| `full` | ✅ | ✅ | Important discussions — every detail |
| `recall` | ✅ | ❌ | Read-only — agent reads, nothing stored |
| `lightweight` | ✅ | ✅ (sparse) | Quick questions, low-priority |
| `disabled` | ❌ | ❌ | No memory at all — ephemeral |

---

## Strategy Schema

```json5
{
  "strategyId": "deep-analysis",
  "displayName": "Deep Analysis",
  "description": "Verbose extraction for important architectural discussions",
  "mode": "full",
  "extraction": {
    "depth": "verbose",       // verbose | concise | minimal
    "entityTypes": ["*"],     // what to extract: * = everything, or specific types
    "sentiment": true,        // extract sentiment?
    "decisions": true,        // extract decisions?
    "tasks": true,            // extract tasks?
    "topics": true,           // extract topic labels?
    "confidenceThreshold": 0.5
  },
  "retention": {
    "everyNTurns": 1,        // save every N turns
    "maxAge": "30d",         // auto-archive after 30 days
    "maxEntries": 1000,      // max memories to keep
    "tags": ["important", "decision", "task"]
  },
  "recall": {
    "budget": "high",        // low | medium | high
    "maxTokens": 4096,
    "includeRecent": true
  }
}
```

```json5
{
  "strategyId": "lightweight",
  "displayName": "Lightweight",
  "description": "Minimal extraction for quick questions",
  "mode": "lightweight",
  "extraction": {
    "depth": "concise",
    "entityTypes": ["decision", "task"],
    "sentiment": false,
    "decisions": true,
    "tasks": true,
    "confidenceThreshold": 0.7
  },
  "retention": {
    "everyNTurns": 5,
    "maxAge": "7d",
    "tags": ["quick-question"]
  },
  "recall": {
    "budget": "low",
    "maxTokens": 512
  }
}
```

```json5
{
  "strategyId": "disabled",
  "displayName": "No Memory",
  "description": "Ephemeral conversation — no memory retained",
  "mode": "disabled"
}
```

---

## Topic Mapping

Topics map to strategies:

```json5
{
  "mappings": [
    { "topic": "architecture", "strategy": "deep-analysis" },
    { "topic": "project-planning", "strategy": "deep-analysis" },
    { "topic": "quick-question", "strategy": "lightweight" },
    { "topic": "random", "strategy": "disabled" },
    { "topic": "water-cooler", "strategy": "disabled" },
    { "topic": "debug-help", "strategy": "lightweight" }
  ],
  "default": "lightweight"
}
```

### Topic Sources

Topics can come from:
- **Channel name/ID** — e.g., `#architecture` → `architecture`
- **Thread subject** — parse for keywords
- **Project tag** — explicit project association
- **Explicit metadata** — provided by caller

---

## Integration with Existing Architecture

This fits into our **ingest lane**:

```
Incoming conversation
       ↓
  Identify topic
       ↓
  Look up strategy
       ↓
  Extract based on rules
       ↓
  Route to memory lane
```

### Where It Lives

```
state/clawtext/prod/
  extraction/
    strategies/
      deep-analysis.json5
      lightweight.json5
      disabled.json5
    mappings.json5
```

---

## Example: Complete Flow

1. Message arrives in `#architecture-discussion`
2. Topic resolver identifies: `architecture`
3. Looks up mapping → strategy `deep-analysis`
4. Loads strategy config
5. Extraction runs with:
   - `depth: verbose`
   - `entityTypes: [*]`
   - `everyNTurns: 1`
6. Memories tagged with `strategy: deep-analysis`

---

## CLI Commands (Future)

```bash
# List strategies
clawtext extraction strategies list

# Add strategy
clawtext extraction strategy add --file deep-analysis.json5

# Show topic mapping
clawtext extraction mappings show

# Update mapping
clawtext extraction mapping set architecture deep-analysis
```

---

## Why This Matters

- **Focused extraction** — Important stuff gets detailed attention
- **Noise reduction** — Banter doesn't clutter memory
- **Token efficiency** — Lightweight topics burn fewer tokens
- **User control** — Explicit control over what gets remembered

---

## Future Extensions

- **Auto-detection** — LLM classifies topic automatically
- **Strategy learning** — System learns from usage patterns
- **Per-user strategies** — Different users in same channel have different strategies

---

*Inspired by HindClaw's named retain strategies, adapted for ClawText's multi-lane architecture.*
