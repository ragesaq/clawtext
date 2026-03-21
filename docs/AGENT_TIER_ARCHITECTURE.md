# Agent Tier Architecture — Independence vs Coordination

**Status:** Draft  
**Date:** 2026-03-21  
**Author:** Qatux (analysis), ragesaq (design)  
**For Review:** Gore (Critical Review Agent)  
**Related:** docs/PERMISSION_MODEL.md, docs/ADVISOR_SLOTS.md, docs/SESSION_MATRIX.md

---

## Executive Summary

This document analyzes architectural approaches for multi-agent systems where different agent types have different memory, coherence, and independence requirements. Specifically, we address the tension between:

- **Council agents** who need strategic independence and resistance to groupthink
- **Director agents** who benefit from operational coherence and domain continuity

The core insight from research: **independence requires separate contexts** — not just instructions to "think independently," but structural isolation at the memory/infrastructure level.

---

## Research Findings

### 1. The Cohort Model (s2.dev / Parallax)

**Source:** https://s2.dev/blog/distributed-ai-agents

> "Independence requires separate contexts. Telling a model to 'consider the opposing view' doesn't create independence. By the time that instruction runs, it's already committed to a framing."

Key concepts:
- **Cohorts**: Bounded execution contexts with their own memory streams
- **Stream isolation**: What's written to one cohort is invisible to another
- **Reconciliation after independence**: Only converge after independent conclusions

This maps to:
- Directors = operational cohorts (shared context for execution)
- Council = strategic cohorts (isolated until reconciliation)

### 2. Memory Engineering Patterns

**Source:** https://www.oreilly.com/radar/why-multi-agent-systems-need-memory-engineering/

- Shared memory enables knowledge reuse but requires coherence support
- Distributed memory improves isolation but requires explicit synchronization
- Without memory engineering, every agent must be large enough to maintain full context independently

### 3. Avoiding Groupthink

**Sources:** 
- Parallax adversarial cohorts
- Free-MAD: Consensus-Free Multi-Agent Debate

Key techniques:
- **Blind review**: Generate critique before seeing peer opinions
- **Adversarial cohorts**: Assign distinct personas that influence reasoning paths
- **Delphi method**: Multiple rounds of independent forecasting before convergence
- **Independent reasoning prompts**: Improve quality of independent reasoning before cross-contamination

> "These systems are all predicated on the idea that it is beneficial for participants to generate perspectives independently, and thus prevent cross-contamination, and only afterwards work toward consensus."

### 4. Hierarchical Orchestration Patterns

**Sources:** Supervisor-worker patterns in LangGraph, AgentOrchestra

- **Supervisor pattern**: Central orchestrator coordinates all interactions
- **Hub-and-spoke**: Supervisor manages team of specialized workers
- **Workers** execute narrow tasks, **supervisors** coordinate and verify, **meta-agents** control strategy

This maps to:
- Directors = workers (specialized domain execution)
- Council = meta-agent layer (strategic oversight)

---

## The Problem Statement

### Current State
- Agents are assigned based on "who has handled the most context"
- Memory pool is shared / interwoven
- No structural isolation between different agent functions
- Risk: cognitive homogenization over time

### Desired State
- **Council agents**: Strategic view, company behavior, process evaluation. Maintain independent perspectives. Protected from cross-contamination.
- **Director agents**: Deep domain expertise, operational continuity, ownership of specific product areas. Benefit from coherence within their lane.
- **Clear information flow**: Directors → Council (work for review), not Council ← Directors (pre-formed conclusions)

### The Core Tension
| Need | Council | Director |
|------|---------|----------|
| Context breadth | Wide (company, product, process) | Deep (domain-specific) |
| Memory coherence | Low (maintain independence) | High (topic continuity) |
| Cross-contamination | Should be restricted | Natural within lane |
| Session ownership | Multi-session, strategic | Topic-bound, persistent |

---

## Design Options

### Option A: Strict Cohort Isolation
- Each Council member gets their own memory stream (cohort)
- Directors share operational streams
- Reconciliation only at defined checkpoints
- **Pros:** Maximum independence, clear boundaries
- **Cons:** Harder to share context when needed

### Option B: Hierarchical Memory Gates
- Directors have deep operational memory
- Council has strategic memory fed by Director outputs
- Controlled flow: Directors → Council, not reverse
- **Pros:** Clear information flow, natural oversight
- **Cons:** Risk of Council being influenced by Director framing

### Option C: Role-Specialized Retrieval
- Same underlying memory system
- Different retrieval pipelines per role type
- Directors get: full context + operational summaries
- Council gets: raw artifacts + filtered peer inputs
- **Pros:** Flexible, tunable per role
- **Cons:** More complex to configure

### Option D: Two-Pass Review (Process-Level)
- Pass 1: Independent analysis (blind to peers)
- Pass 2: Cross-pollination after independent conclusion
- Can implement regardless of memory architecture
- **Pros:** Simple to implement, proven effective
- **Cons:** Adds latency to review cycles

---

## Recommended Architecture: Hybrid Approach

### Director Agents (Tier 2) — "The Workers"

**Memory Model:** High Coherence
- Shared operational memory with other Directors working on integration
- Deep context on their lane (Designer → UI, Engineer → backend, etc.)
- Session ownership binds to Director → continuity on topics
- Cross-Director communication for integration points

**Session Binding:**
- Sessions on same topic/domain → same Director
- Example: All ClawDash UI discussions → Designer Director
- Prevents "different agents for different channels" problem

**Access:**
- Read: Commons (facts, decisions, status)
- Read: Domain-specific operational memory
- Write: Domain operational memory
- Read: Limited cross-domain (for integration)

### Council Agents (Tier 1) — "The Strategists"

**Memory Model:** High Independence
- Private strategic memory (not visible to Directors)
- Access to raw artifacts, decisions, status
- **Restricted from:**
  - Director interpretive summaries
  - Peer Council conclusions (until after independent analysis)
  - Blended Reflect outputs that aggregate multiple perspectives

**Retrieval Profile:**
- Commons: Yes (facts, decisions, status)
- Raw artifacts: Yes
- Director operational summaries: No / Limited
- Peer Council perspectives: Blocked until reconciliation phase
- Institutional memory: Yes (promoted patterns)

**Two-Pass Review Process:**
1. **Blind pass**: See raw artifact + commons facts → generate independent analysis
2. **Reconciliation**: Optionally expose peer perspectives → refine if needed

### The Bridge: Information Flow Rules

```
┌─────────────────────────────────────────────────────────────┐
│                    COUNCIL (Tier 1)                        │
│  - Independent strategic memory                             │
│  - Private critique lane                                   │
│  - Blind-first review process                              │
│  ← Reads: commons, raw artifacts                           │
│  ← Restricted: peer conclusions, director summaries        │
└─────────────────────────────────────────────────────────────┘
                              ↑
                    (selective reads)
                              │
┌─────────────────────────────────────────────────────────────┐
│                   DIRECTORS (Tier 2)                        │
│  - Deep domain memory                                       │
│  - Session topic binding                                   │
│  - Cross-director integration                              │
│  ← Read/Write: operational memory                          │
│  ← Write: outputs for Council review                       │
└─────────────────────────────────────────────────────────────┘
```

### Memory Bank Classes

Extend the permission model with:

| Bank Type | Visibility | Use Case |
|-----------|------------|----------|
| `commons` | All agents | Facts, decisions, status |
| `domain:<name>` | Domain directors | Operational knowledge |
| `advisor:<id>:private` | Single advisor only | Private reasoning, critique |
| `institutional` | Promoted access | Proven patterns, governance |
| `scratch` | Ephemeral | Temporary working memory |

### Council-Specific Rules

For Council agents:
- `can_read_peer_interpretations`: false (by default)
- `can_read_peer_critiques`: false (until reconciliation)
- `can_read_reflect_outputs`: false (aggregates perspectives)
- `must_first_pass`: true (enforce blind review)

---

## Implementation Plan

### Phase 1: Foundation (This Sprint)

1. **Define agent tier taxonomy**
   - Create `state/clawtext/prod/agents/tiers.json`
   - Map existing advisors to tiers (Council vs Director)
   - Document tier classification rules

2. **Extend permission model**
   - Add memory type fields: `fact`, `decision`, `interpretation`, `critique`, `proposal`
   - Add retrieval profile fields: `can_read_peer_*, must_first_pass`
   - Update `docs/PERMISSION_MODEL.md`

3. **Seed tier configurations**
   - Create sample Council agent config
   - Create sample Director agent configs
   - Define default retrieval profiles per tier

### Phase 2: Retrieval Profiles (Next Sprint)

1. **Implement retrieval profile filtering**
   - Modify RAG retrieval to respect memory type + agent tier
   - Add profile-based query rewriting
   - Add "exclude" patterns for sensitive memory types

2. **Add memory type tagging**
   - Tag extraction outputs with types
   - Auto-classify: fact vs interpretation vs critique
   - Store type in memory metadata

3. **Two-pass review support**
   - Add "blind mode" flag to retrieval
   - First pass: retrieve without peer perspectives
   - Second pass: retrieve with cross-pollination

### Phase 3: Isolation Enforcement (Following Sprint)

1. **Implement cohort isolation**
   - Separate memory streams per Council member
   - Stream-level visibility rules
   - Reconciliation checkpoint triggers

2. **Add promotion gates**
   - What moves from operational → strategic
   - Review queue for Council perspectives
   - Anti-pattern promotion workflow

3. **Monitoring**
   - Track cross-contamination events
   - Audit trail for Council independence
   - Alerts for drift detection

### Phase 4: Operationalization (Backlog)

1. **Session binding for Directors**
   - Map sessions to Directors by topic/domain
   - Continuity across sessions
   - Integration point detection

2. **CLI tools**
   - `clawtext agents tiers list`
   - `clawtext agents profile <advisor>`
   - `clawtext agents audit <advisor>`

3. **Governance integration**
   - Align with ClawCouncil perspectives
   - Add to OPERATIONAL_AGENT_GUIDE.md
   - Document review workflows

---

## Open Questions for Gore

1. **Tier assignment**: Should any agent ever move between tiers, or is this a fixed classification?

2. **Reconciliation triggers**: When should Council members see each other's perspectives? On demand? On timer? On milestone completion?

3. **Director cross-talk**: Should Directors be able to read each other's operational memory, or only write to integration points?

4. **Fallback behavior**: If an agent requests memory they don't have access to, do we silently filter or explicitly warn?

5. **Graceful degradation**: If isolation enforcement fails, what's the detection and recovery path?

---

## References

- s2.dev: Coordinating adversarial AI agents (cohorts, stream isolation)
- O'Reilly: Why Multi-Agent Systems Need Memory Engineering
- Parallax: https://github.com/s2-streamstore/parallax
- Free-MAD: Consensus-Free Multi-Agent Debate
- MemGPT, A-MEM, MemMA: Memory architecture patterns
- AgentOrchestra: Hierarchical supervisor-worker patterns

---

*This document is a working draft. Feedback from Gore and iteration will refine the approach.*
