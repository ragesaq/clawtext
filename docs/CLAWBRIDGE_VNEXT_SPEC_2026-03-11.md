# ClawBridge vNext — Continuity + Transfer Spec

## Status
Draft design spec  
Date: 2026-03-11  
Scope: thread/session continuity, handoff packets, transfer mechanics

---

## Executive summary

**ClawBridge v0** was mostly about mechanics:
- split a thread
- refresh a thread
- create a new post
- move discussion somewhere else

**ClawBridge vNext** should preserve those mechanics, but add the missing high-value layer:

> Move the conversation with its working state intact.

That means ClawBridge should become the system for:
- thread/session transfer
- structured handoff generation
- next-agent bootstrap packets
- continuity artifacts for active work
- optional promotion into long-term memory when warranted

ClawBridge is **not** the same thing as ClawText memory.

### Core distinction
- **ClawText** = durable knowledge / memory / learning
- **ClawBridge** = continuity / transfer / carrying active work forward

A handoff packet is often the product of conversation + memory, designed to keep momentum going. It should not automatically become durable memory by default.

---

## Problem statement

Long conversations accumulate critical context that is hard to preserve cleanly when:
- the thread gets too long
- the topic drifts into a different lane/product
- a new agent/session needs to pick up where the last one left off
- the work needs to move to a new forum post, channel, or session

Without a proper continuity system, the next session/agent often loses:
- current objective
- already-settled decisions
- active questions
- file/artifact references
- lane ownership
- next actions
- rationale for why the work moved

This leads to:
- repeated re-explanation
- re-litigated decisions
- fragmented context
- shallow or lossy handoffs
- confusion between active continuity and durable memory

---

## Product goal

Create a reusable continuity/transfer skill that can:

1. summarize large conversations into structured handoff packets
2. carry active work across threads/posts/sessions
3. preserve high-context continuity for the next agent/session
4. distinguish between continuity artifacts and durable memory
5. optionally promote a continuity artifact into ClawText when it is important enough to keep long-term

---

## Non-goals

ClawBridge vNext is **not**:
- a replacement for ClawText memory
- a full task manager
- a telemetry system
- a forum/thread transport layer only
- an automatic long-term archiver of every conversation

It can connect to those systems, but should stay focused on continuity and transfer.

---

## Architectural model

ClawBridge should have **two layers**:

## 1. Transfer mechanics layer
This is the existing bridge behavior.

### Responsibilities
- refresh a thread
- split into a new thread/post
- create a fresh thread/post
- move discussion to a new lane
- post backlink/handoff note when appropriate

This is transport/orchestration.

## 2. Continuity intelligence layer
This is the new high-value layer.

### Responsibilities
- generate structured handoff packets
- generate next-session bootstrap docs
- produce short and long handoff variants
- separate settled decisions from open questions
- capture relevant artifacts and file paths
- identify target lane/product
- decide whether the output is continuity-only or worth promoting into ClawText memory

This is semantic continuity.

---

## Core outputs

ClawBridge should support four main output types.

## A. Short handoff summary
Use when:
- posting into a new thread/channel
- giving humans a quick re-entry point
- posting a concise transfer note

### Target size
Short enough for a single Discord message or brief post header.

### Content
- what this is about
- what was established
- what happens next
- link/reference to full handoff

---

## B. Full continuity packet
Use when:
- the next agent/session needs maximum context
- the discussion was large or architecturally meaningful
- continuity matters more than brevity

### Content sections
1. Current objective
2. Established decisions
3. Open questions
4. Active lanes/workstreams
5. Artifacts created
6. Important user preferences
7. Immediate next steps
8. Provenance / references

This should be the default for important work.

---

## C. Next-agent bootstrap
Use when:
- a new session/agent should start from an exact reading order
- we want deterministic continuation

### Content sections
- read these files first
- current lane boundary
- what not to re-litigate
- what is still open
- recommended first action

This is continuity optimized for agent startup, not human reading.

---

## D. Promotable memory artifact
Use when:
- the handoff also contains durable architectural or operational knowledge
- we want the result to live in ClawText memory

### Key rule
This is **optional**, not automatic.

Continuity artifacts and memory artifacts overlap, but they are not identical.

---

## Handoff packet schema

Suggested canonical structure:

```md
# <Title>

## Why this handoff exists

## Current objective

## Established decisions

## Open questions

## Lane / product / owner context

## Relevant artifacts
- docs
- files
- posts
- links

## Important preferences / constraints

## Immediate next steps

## What not to re-litigate

## If promoting to memory
- durable learnings
- durable preferences
- durable architecture decisions
```

---

## Recommended modes

## Mode 1: Continuity mode
Purpose: keep active work moving

### Properties
- maximum context
- lower compression
- rich references
- not automatically durable
- optimized for the next session/agent

### Default use cases
- long architectural thread
- moving to a new lane
- new session on same project
- forum post refresh/split

---

## Mode 2: Memory-promotion mode
Purpose: preserve important durable knowledge

### Properties
- more distilled
- structured for retrieval
- smaller and higher-signal
- suited for ClawText ingestion

### Default use cases
- final architecture decisions
- durable user preferences
- stable operational guidance
- lessons learned worth keeping

---

## Mode 3: Dual-output mode
Purpose: produce both continuity and memory artifacts

### Properties
- full handoff packet for immediate continuity
- smaller promoted artifact for ClawText

This is likely the best mode for major planning threads.

---

## Decision rules: bridge vs memory vs both

## Use ClawBridge only when:
- the goal is to keep a thread/session going
- the context is still active and evolving
- the output is mainly for continuation

## Use ClawText memory only when:
- the output is durable knowledge
- future retrieval matters more than session continuity
- the information should outlive the current thread

## Use both when:
- the thread produced durable architecture decisions
- future sessions need continuity now
- future retrieval should also benefit later

---

## Integration points

## A. Thread/post bridge
ClawBridge continuity packets should pair naturally with existing thread-bridge behavior.

### Example flow
1. detect thread is too long / moving lanes
2. generate full continuity packet
3. create new post/thread
4. post short handoff summary in destination/source
5. optionally write full packet to docs/
6. optionally ingest durable version into ClawText

---

## B. ClawText
ClawBridge should support optional export into ClawText.

### Examples
- ingest full handoff doc as planning artifact
- ingest distilled architecture summary
- ingest selected durable decisions only

ClawText should not be the default sink for every handoff.

---

## C. ClawDash / ClawTask
ClawBridge should eventually help create or update:
- board items
- lane references
- related artifacts
- milestone context
- next-action tasks

This is especially useful when a large discussion needs to become actionable work.

---

## D. Agent startup / session continuity
ClawBridge should support writing a dedicated bootstrap file for next-session use.

Example:
- `docs/NEXT_AGENT_BOOTSTRAP_<project>.md`

This is especially helpful when maximum context transfer matters more than a short chat summary.

---

## Suggested commands / functions

Potential exported functions:

- `refreshThreadWithContinuity(sourceThreadId, options)`
- `splitThreadWithContinuity(sourceThreadId, targetTitle, forumId, options)`
- `freshThreadWithContinuity(forumId, title, options)`
- `generateHandoff(sourceContext, options)`
- `generateBootstrap(sourceContext, options)`
- `promoteHandoffToMemory(handoffPath, options)`

Potential options:
- `effort: low|medium|high|max`
- `mode: continuity|memory|dual`
- `outputStyle: short|full|bootstrap`
- `writeDocs: true|false`
- `ingestToClawText: true|false`
- `includeArtifacts: true|false`
- `includeDecisions: true|false`
- `includeOpenQuestions: true|false`

---

## Suggested artifact locations

### Continuity artifacts
- `docs/handoffs/`
- `docs/continuity/`
- `docs/bootstrap/`

### Examples
- `docs/handoffs/CLAWDASH_HANDOFF_2026-03-10.md`
- `docs/bootstrap/NEXT_AGENT_BOOTSTRAP_CLAWDASH.md`

### Durable memory promotion
- ClawText ingest into `memory/` via curated document

---

## Quality bar for vNext

A good ClawBridge handoff should let a new agent/session answer, immediately:
- what are we doing?
- what is already decided?
- what is still open?
- what files/docs should I read first?
- what lane does this belong to?
- what should I do next?
- what should I not waste time re-deriving?

If it cannot do that, it is not a good continuity artifact.

---

## Why this matters

This is not just a convenience feature.

It addresses one of the main failure modes of multi-session, multi-thread work:
- loss of momentum
- repeated context rebuilding
- fragmented architecture decisions
- accidental thread drift
- confusion between active context and durable memory

ClawBridge vNext fixes that by making continuity a first-class tool.

---

## Recommended next implementation step

### Phase 1
Draft the skill package and templates:
- `SKILL.md`
- output templates
- mode definitions
- decision rules for continuity vs memory promotion

### Phase 2
Integrate with existing thread-bridge mechanics:
- split/refresh/fresh + handoff generation

### Phase 3
Add optional ClawText promotion:
- ingest curated handoff docs when appropriate

### Phase 4
Add bootstrap outputs for next-session continuity:
- explicit startup packets for agents

---

## Naming recommendation

If the old name already resonates, keep it.

### Recommended framing
**ClawBridge** = the continuity + transfer system

With internal components such as:
- thread-bridge
- continuity-bridge
- handoff-kit

This preserves the familiar name while upgrading the concept to match its real value.
