# ClawBridge — Never Lose Context Again

**Version:** 0.9.0 | **Status:** Production | **Type:** OpenClaw Skill

> Preserve working context when conversations move across threads, forums, and agents. One command to transfer active work without losing months of decisions.

---

## The Problem

You're deep in an architecture discussion. After weeks and 200+ messages, someone says: "This thread is getting long. Let's start a new one."

**What happens:** The new thread starts fresh. Critical decisions vanish. The next agent asks questions you already answered. You spend hours re-explaining what should have transferred.

```
Thread #1 (200 messages):
[Months of architectural decisions]

Thread #2 (fresh):
[CONTEXT: EMPTY]
Agent: "What are we building?"
You: "Ugh, let me re-explain the last 200 messages..."
```

**ClawBridge solves this.** It captures working context and transfers it intact.

---

## What It Does

ClawBridge generates three complementary handoff documents when work moves across threads, channels, or sessions:

| Artifact | For Whom | Purpose |
|----------|----------|---------|
| **Short Summary** | Humans | Quick re-entry: decisions + open questions |
| **Full Packet** | Next Agent | Complete context: what to read, what to focus on |
| **Agent Bootstrap** | Startup | Exact first action: read X, do Y next |

**One command does it all.**

---

## Quick Start

### Install
```bash
cd ~/.openclaw/workspace/skills/clawbridge
npm install && npm link
```

### Transfer a Thread
```bash
clawbridge extract-discord-thread \
  --source-thread 1480315446694641664 \
  --target-forum 1475021817168134144 \
  --title "Architecture Discussion — Continued" \
  --mode dual
```

**What this does:**
- Reads source thread messages
- Generates 3 handoff artifacts
- Posts them to new thread
- Optional: ingest into ClawText for long-term memory

### Manual Overrides
```bash
clawbridge extract-discord-thread \
  --source-thread 123456 \
  --objective "Build the validation pipeline" \
  --established "Using BM25, not vector search" \
  --open "Clustering algorithm TBD" \
  --next "Implement validation script first"
```

---

## Why This Works

Most context-preservation tools just **summarize**. ClawBridge **structures** context into three artifacts because:

1. **Humans need quick summaries** — Understand what was decided in 30 seconds
2. **Agents need full detail** — Know what to read and what to focus on
3. **Startup needs clarity** — No guessing where to start

**Result:** No context loss. No re-explaining. Just continuity.

---

## In the Ecosystem

ClawBridge is the **continuity layer** between:
- **ClawText** (durable knowledge, long-term memory)
- **ClawDash** (big picture, lane orchestration)
- **ClawTask** (product coordination)

**Key distinction:** ClawBridge handles active work in motion. ClawText handles durable knowledge at rest. Use both, but don't conflate them.

---

## Quality Bar

A good handoff lets the next agent answer immediately:
- ✅ What are we doing?
- ✅ What's already decided?
- ✅ What's still open?
- ✅ What should I do first?

If it can't answer these, the handoff is incomplete.

---

## Documentation

- **START_HERE.md** — Navigate by role/use case
- **QUICKSTART.md** — Copy/paste commands
- **INTEGRATION.md** — Architecture and extension patterns
- **SKILL.md** — Formal definition and quality bar

---

## Status

**v0.9.0:** Production ready. Tested end-to-end against real Discord transfers. CLI + templates + full docs.

**What's next:** Richer memory-promotion policies, advanced lane-aware routing.

---

## Summary

ClawBridge solves context drift in long-running discussions. Instead of losing months of work to thread staleness, you carry it forward intact.

**Install:** `npm install && npm link` | **First command:** One-command transfer  
**Result:** No context loss. Ever.
