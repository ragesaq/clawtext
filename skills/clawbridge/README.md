# ClawBridge — Never Lose Context Again

**Version:** 0.9.0 | **Status:** Production | **Type:** OpenClaw Skill

> Preserve working context when conversations move across threads, forums, channels, and agents. Stop losing months of architectural decisions to thread drift.

---

## The Hidden Cost of Long Conversations

### The Problem

You're deep in an architecture discussion. The thread has 200+ messages spanning weeks. You've made critical decisions, discovered edge cases, and built up months of institutional knowledge.

Then someone says: *"This thread is getting long. Let's start a new one."*

**What happens next:**
- The new thread starts fresh
- Critical context gets lost in translation
- The next agent asks questions you already answered
- You spend hours re-explaining what was already decided
- The architectural drift compounds over time

```
Thread #1 (200 messages, 3 weeks):
[System] + [200 messages of architectural decisions]
→ "Let's move to a new thread"

Thread #2 (fresh start):
[System] + [CONTEXT: EMPTY]
→ Agent: "What are we building?"
→ You: "Ugh, let me summarize the last 200 messages..."
→ Agent: "Wait, you already decided this? Why didn't I know?"
```

**The pain:** Every thread refresh, channel move, or agent handoff loses context. You're constantly re-explaining what should be preserved.

---

## What Is ClawBridge?

ClawBridge is the **continuity and transfer layer** for your OpenClaw ecosystem. It preserves working context when conversations move across threads, forums, channels, sessions, and agents.

| Property | What It Means |
|----------|---------------|
| **Automatic** | CLI reads source thread, generates artifacts, posts to destination |
| **Structured** | Three artifact types: short handoff, full packet, agent bootstrap |
| **Lane-aware** | Understands product context (ClawText, ClawDash, etc.) |
| **Optional memory** | Continuity packets can be promoted to long-term memory |
| **CLI-first** | One command to extract, generate, and post |

**Result:** No more context loss. No more re-explaining. No more architectural drift.

---

## How It Works

### The Three Artifacts

ClawBridge generates three complementary documents for every transfer:

#### 1. Short Handoff Summary
**Purpose:** Quick re-entry for humans in the destination thread.

```markdown
# ClawBridge Extract — [Thread Title]

**Context:** This discussion spun out of [source thread] to capture active work.

**Established:**
- Decision 1
- Decision 2
- Decision 3

**Open:**
- Question 1
- Question 2

**Next:**
- Action 1
- Action 2

**Lane:** [product/lane context]
```

**Who reads this:** Humans joining the new thread. They get the gist in 30 seconds.

#### 2. Full Continuity Packet
**Purpose:** Maximum context delivery for the next agent/session.

```markdown
# Full Continuity Packet — [Thread Title]

## Why this handoff exists
[Context about the transfer]

## Current objective
[What we're working on now]

## Established decisions
[What's already settled — don't re-litigate]

## Open questions
[What's still being decided]

## Relevant artifacts
[Links to files, docs, prior posts]

## What not to re-litigate
[Time-savers for the next agent]
```

**Who reads this:** The next agent. They get full context and know what to focus on.

#### 3. Next-Agent Bootstrap
**Purpose:** Deterministic startup instructions.

```markdown
# Next-Agent Bootstrap — [Thread Title]

## Read these first
1. File A (priority 1)
2. File B (priority 2)

## Current objective
[What to work on]

## Already decided
[Don't waste time re-deriving]

## Still open
[What needs your input]

## First action
[Immediate next step]
```

**Who reads this:** The agent's onboarding. They know exactly where to start.

### The Workflow

```
Long thread getting stale
       ↓
clawbridge extract-discord-thread
       ↓
Reads all source messages (auto)
       ↓
Generates 3 artifacts (auto)
       ↓
Posts to new thread (auto)
       ↓
Next agent reads bootstrap → starts working
```

**Key insight:** ClawBridge doesn't just "summarize." It **structures** the context into three complementary views: human-readable, agent-complete, and action-oriented.

---

## Quick Start

### Install
```bash
cd ~/.openclaw/workspace/skills/clawbridge
npm install
npm link
```

Now `clawbridge` is available in your shell.

### One-Command Transfer
```bash
clawbridge extract-discord-thread \
  --source-thread 1480315446694641664 \
  --target-forum 1475021817168134144 \
  --title "ClawBridge Extract — Architecture Discussion" \
  --mode dual \
  --ingest
```

**What this does:**
1. Reads all messages from source thread
2. Generates 3 artifacts (short, full, bootstrap)
3. Creates new forum thread
4. Posts all artifacts to destination
5. Optionally ingests full packet into ClawText for long-term memory

### Alternative: Run Without Linking
```bash
node ~/.openclaw/workspace/skills/clawbridge/bin/clawbridge.js help
```

### Agent-Led Overrides
Need manual control? Add explicit fields:
```bash
clawbridge extract-discord-thread \
  --source-thread 123456 \
  --objective "Build the RAG validation pipeline" \
  --established "Decided on BM25 over vector search" \
  --established "Token budget is 7K max" \
  --open "Still deciding on clustering algorithm" \
  --next "Implement the validation script first" \
  --product "ClawText" \
  --lane "ai-projects"
```

---

## Why This Exists

Most "context preservation" tools just **summarize**. They throw away the structure, the decisions, the "what not to re-litigate" insights.

**ClawBridge is different.** It recognizes that:

1. **Context isn't one thing** — Humans need a quick summary. Agents need full detail. The next person needs clear action items. Three artifacts, three audiences.

2. **Decisions matter more than conversation** — The 200 messages don't all matter. The 5 decisions made in those 200 messages matter a lot. ClawBridge separates them.

3. **Lane context is critical** — A ClawText discussion has different context than a ClawDash discussion. The next agent needs to know which product/lane they're entering.

4. **Continuity ≠ Memory** — Some things are "active work" (ClawBridge). Some things are "durable knowledge" (ClawText). Don't conflate them.

**The result:** When you move a conversation, you're not losing months of work. You're carrying it forward intact. The next agent picks up where the last one left off. No drift. No re-explaining. No wasted time.

---

## Modes: Choose Your Workflow

### Continuity Mode
**Use when:** The primary goal is keeping active work moving.

**Output:** Full packet + short summary + bootstrap  
**Best for:** Thread refreshes, agent handoffs, channel moves

### Memory-Promotion Mode
**Use when:** The output is primarily a durable architecture/decision artifact.

**Output:** Distilled artifact for ClawText ingest  
**Best for:** Capturing decisions for long-term memory

### Dual-Output Mode (Recommended)
**Use when:** The conversation produced both active continuity needs AND durable knowledge.

**Output:** All three artifacts + ClawText ingest  
**Best for:** Large architecture threads, cross-lane discussions

---

## Ecosystem Role

ClawBridge is one layer in a four-product ecosystem:

| Product | Role | When to Use |
|---------|------|-------------|
| **ClawText** | Memory + learning | Durable knowledge, RAG, operational learning |
| **ClawBridge** | Continuity + transfer | Active work moving across threads/sessions |
| **ClawDash** | Dashboard / control surface | Big picture, lane orchestration |
| **ClawTask** | Board / coordination | Product dependencies, task tracking |

**Key distinction:** ClawBridge handles **active work in motion**. ClawText handles **durable knowledge at rest**. Use both, but don't conflate them.

---

## Documentation Map

**Start here based on your need:**

| Document | Read When You Want To... |
|----------|-------------------------|
| **START_HERE.md** | Get oriented by role/use case |
| **QUICKSTART.md** | Copy/paste commands (5 min setup) |
| **INTEGRATION.md** | Understand architecture, modes, extension patterns |
| **SKILL.md** | See the formal skill definition and quality bar |
| **examples/README.md** | See real-world scenarios |

**Templates (for manual overrides):**
- `templates/short-handoff-summary.md`
- `templates/full-continuity-packet.md`
- `templates/next-agent-bootstrap.md`

---

## Quality Bar

A good ClawBridge handoff should let the next agent/session answer immediately:

- ✅ What are we doing?
- ✅ What is already decided?
- ✅ What is still open?
- ✅ What should I read first?
- ✅ What lane does this belong to?
- ✅ What should I do next?
- ✅ What should I not waste time re-deriving?

**If it can't do that, the handoff is incomplete.**

---

## Current Status (v0.9.0)

**What's working:**
- ✅ Standardized structured continuity workflow
- ✅ Packaging + CLI + templates + docs
- ✅ End-to-end tested against real Discord forum transfers
- ✅ Thread attachment mode (`--attach-thread`) for thread-bridge integration
- ✅ Dual-output mode with optional ClawText ingest

**Coming next:**
- 🚧 Richer policy for automatic memory promotion
- 🚧 Advanced lane-aware routing/orchestration
- 🚧 Helper scripts for common patterns

---

## Summary

ClawBridge solves the **context drift problem** that plagues long-running architecture discussions. Instead of losing months of work when threads get stale, you carry the context forward intact.

**Install:** `npm install` + `npm link` in the skill directory  
**First command:** `clawbridge extract-discord-thread --source-thread <id> --target-forum <id>`  
**Result:** No more context loss. No more re-explaining. Just continuity.

If you've ever lost critical decisions to thread drift, this is for you.
