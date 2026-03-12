---
name: clawbridge
description: Preserve and transfer active work context across threads, sessions, and agents without losing continuity or valuable accumulated knowledge.
metadata:
  clawdbot:
    emoji: "🌉"
    requires:
      env: []
      bins: []
    files:
      - templates/full-continuity-packet.md
      - templates/short-handoff-summary.md
      - templates/next-agent-bootstrap.md
---

# ClawBridge

**Carry active work forward with its full context intact.**

## The problem

Conversations with AI assistants accumulate value over time — decisions, context, exploration. But that value is fragile. When conversations move across threads, restart in new sessions, or split across agents, the context gets lost. You end up re-explaining things, re-deriving decisions, losing momentum.

## The solution

ClawBridge captures working context in a structured, portable form. It preserves what matters for continuity without being a full memory system. The result is a handoff packet that lets the next agent or session pick up where you left off — with full knowledge of what's been decided, what's still open, and what not to waste time on.

## When to use

Use ClawBridge when:
- a thread is getting long and needs a clean continuation
- work is moving to a new forum post, channel, or lane
- a new agent/session needs maximum context delivery
- you want a structured handoff instead of a vague recap
- you want the next agent/session to start with full continuity

## Do not use it by default for

- tiny conversations that don't need transfer
- durable memory capture only (use long-term memory systems for that)
- one-line status updates
- generic note taking

## Core modes

### 1. Continuity mode
Use when the primary goal is to keep active work moving forward.

Output: short handoff + full continuity packet + next-agent bootstrap

### 2. Memory-promotion mode
Use when the output is primarily a durable artifact worth long-term preservation.

Output: full continuity packet (formatted for long-term storage)

### 3. Dual-output mode
Use when the conversation produced both immediate continuity value and durable knowledge.

Output: all three (short + full + bootstrap) with options for dual ingestion paths

Dual is the recommended mode for substantial conversations.

## Required outputs

ClawBridge generates three core artifacts via CLI automation, with agent-led manual overrides when needed for quality.

### A. Short handoff summary
Purpose: Quick re-entry in a destination thread. Answers: what's happening, what's settled, what's open, what's next.

### B. Full continuity packet
Purpose: Maximum context delivery. Complete objective, decisions, open questions, next steps, and what not to re-litigate.

### C. Next-agent bootstrap
Purpose: Deterministic startup instructions. Tells the next agent/session exactly what to read and what to do first.

## The workflow

1. Run the extract command (CLI or agent-driven)
2. Review/adjust the generated packet if needed (optional manual overrides)
3. Post or share the artifacts in the destination thread
4. Optionally promote to long-term memory
5. Continue work with full continuity intact

## CLI command (Phase 1)

```bash
clawbridge extract-discord-thread \
  --source-thread <thread-id> \
  --target-forum <forum-id> \
  --title "<new thread title>" \
  --mode dual \
  --ingest
```

### Agent-led overrides (manual where needed)

- `--objective "..."`
- `--established "..."` (repeatable)
- `--open "..."` (repeatable)
- `--next "..."` (repeatable)
- `--product "..."`
- `--lane "..."`

This follows the design philosophy:
- automatic where sensible
- agent-guided where quality/judgment matter

## Natural language mappings

| User says | What to produce |
|---|---|
| "give me a handoff" | Full continuity packet |
| "make a clean handoff for the next session" | Full packet + bootstrap |
| "sum this up for the next agent" | Bootstrap + short summary |
| "move this to a new thread and keep the context" | Short summary + full packet |
| "capture this so we can continue later" | Full packet |
| "make this durable too" | Dual-output mode |

## Quality bar

A good ClawBridge handoff should let the next agent/session answer immediately:
- what are we doing?
- what is already decided?
- what is still open?
- what should I read first?
- what lane does this belong to?
- what should I do next?
- what should I not waste time re-deriving?

If it cannot do that, the handoff is incomplete.

## Phase 1 boundaries

Phase 1 is a **structured manual workflow skill**, not a full automation package yet.

Phase 1 includes:
- naming and boundary definition
- templates
- standard output structure
- file location conventions
- explicit distinction between continuity and memory

Phase 2 can later add:
- tighter integration with thread-bridge mechanics
- optional automatic ClawText promotion
- helper scripts / exported functions
- richer lane-aware transfer behavior
