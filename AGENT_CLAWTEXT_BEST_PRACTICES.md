# Agent Best Practices: Getting Full Value from ClawText

These recommendations help agents (you) extract maximum value from the ClawText memory system.

---

## 🚀 Core Usage Patterns

### Pattern 1: Answer Questions with Memory Search First

**Before responding to a user query:**

```
1. Run memory_search(query="topic or question")
2. If results have high confidence (>0.70):
   - Include relevant snippets with citations
   - Build on previous context
   - Mention what you remember
3. If results are weak or empty:
   - Answer from general knowledge
   - Note: "I didn't find prior context on this"
   - Optionally: suggest ingestion if this topic should be tracked
```

**Why:** Avoids repeating yourself, maintains continuity across sessions, shows you're building on prior work.

---

### Pattern 2: Capture Operational Patterns (During Debugging)

**When you solve an error or problem:**

```
1. Run: npm run operational:review
   → Check if this issue is already known

2. If known pattern exists:
   - Use documented fix
   - Note: "Applied known pattern X"

3. If new issue:
   - Debug and solve it
   - Run: npm run operational:capture:error
   - Fill in: summary, symptom, trigger, rootCause, fix, evidence
   → Future you and other agents get the fix automatically
```

**Why:** First time you hit an error costs 30 min. Second time should cost 30 sec. This enables that.

---

### Pattern 3: Document Complex Task Success Workflows

**After completing complex work successfully:**

```
1. Capture what worked:
   npm run operational:capture:success
   
2. Fill in:
   - summary: "What was the task?"
   - whatWorked: "Exact steps in order"
   - context: "Project, scope, why this matters"

3. Result: Other agents can retrieve this workflow next time
```

**Why:** Repeatable workflows compound over time. Build them intentionally.

---

### Pattern 4: Link Related Knowledge (Use Relationships)

**When promoting a memory, consider cross-references:**

```
1. During memory curation, identify related items:
   - "Does this decision affect project X?"
   - "Does this error pattern relate to pattern Y?"
   - "Is there a code location I should reference?"

2. Update relationships.yaml with shortcut or edge:
   - Shortcuts: grouped concepts
   - Edges: dependencies, causation, documentation links

3. Result: Future queries on one project surface impacts on others
```

**Why:** Cross-project impacts often invisible without explicit relationships. This makes them discoverable.

---

## 📋 Periodic Maintenance (Agent-Led Tasks)

### Weekly: Review Suggested Relationships (15 min)

From HEARTBEAT.md:
```bash
clawtext relationships validate --review
```

- Accept cross-project impact suggestions
- Merge redundant shortcuts
- Archive stale edges (>30 days unused)

**Why:** Keeps relationship graph fresh without crons. Catches new patterns early.

---

### As-Needed: Rebuild Clusters (When Adding Knowledge)

```bash
# After bulk ingest or adding many new memories
npm run operational:aggregation:stats
# If candidates > 5, consider:
node ~/.openclaw/workspace/skills/clawtext/scripts/build-clusters.js --force
```

**Why:** Freshens cluster indices so new knowledge is discoverable immediately.

---

### As-Needed: Validate RAG Quality

```bash
node ~/.openclaw/workspace/skills/clawtext/scripts/validate-rag.js
```

- If hit rate < 80%: might need tuning
- If confidence < 0.70: admission thresholds too loose
- If reports many missing items: might need cluster rebuild

**Why:** Empirical health check. Data-driven tuning beats speculation.

---

## 🎯 High-Value Workflows

### Workflow A: Bootstrap a New Project with Knowledge

**Goal:** Start a new project with existing knowledge (codebase, docs, prior decisions).

```bash
# Step 1: Ingest source material
npm run ingest:files -- --input="src/**/*" --project=myproject

# Step 2: Ingest docs
npm run ingest:files -- --input="docs/**/*.md" --project=myproject

# Step 3: Rebuild clusters to index new knowledge
node scripts/build-clusters.js --force

# Step 4: Validate injection
node scripts/validate-rag.js

# Result: Future queries get project-specific context automatically
```

**Value:** New agents on the project get full context without manual onboarding.

---

### Workflow B: Debug Recurring Issues (Error Patterns)

**Goal:** Convert recurring errors into solvable patterns.

```bash
# Session 1: Hit error, debug, fix
# After fixing:
npm run operational:capture:error
→ Describe symptom, root cause, fix

# Session 2: Hit same error again
npm run operational:search -- "error keyword"
→ Pattern found! Apply known fix (30s instead of 30 min)

# Session 3+: Same. The more you hit it, the higher confidence becomes.
```

**Value:** Team-wide problem solving. Knowledge compounds.

---

### Workflow C: Document Decision Chains (Relationships)

**Goal:** Capture how decisions in one project cascade to others.

```bash
# When deciding: "We're changing RGCS filter algorithm"
# Promote to memory with relationship edge:
- type: "affected-by"
  from: "project:Lumbot"
  to: "project:RGCS"
  reason: "VR controller tracking latency cascades to voice command responsiveness"
  confidence: 0.75

# Result: When agent works on Lumbot latency, they see RGCS impact automatically
```

**Value:** Catches downstream effects before they become problems.

---

## ⚡ Quick Reference: When to Do What

| Situation | Action | Time | Frequency |
|-----------|--------|------|-----------|
| Answering a question | Search memory first | 1 min | Always |
| Hit an error | Check operational review queue | 1 min | Always |
| Solved an error | Capture pattern | 5 min | After each new error |
| Completed complex task | Capture success workflow | 5 min | 1–2x per week |
| Adding lots of new knowledge | Rebuild clusters | 2 min | After bulk ingest |
| Weekly maintenance | Review relationships | 15 min | Every Friday |
| Health check | Validate RAG | 3 min | As-needed |
| New project | Bootstrap with ingest | 10 min | Project startup |

---

## 🎓 Learning Path

**If you're new to ClawText:**

1. **Start here:** [README.md](./skills/clawtext/README.md) — Understand the three lanes
2. **Then:** [OPERATIONAL_AGENT_GUIDE.md](./skills/clawtext/docs/OPERATIONAL_AGENT_GUIDE.md) — Operational patterns
3. **Then:** [RELATIONSHIPS.md](./skills/clawtext/docs/RELATIONSHIPS.md) — Cross-project knowledge
4. **Then:** Use the workflows above and iterate

**If you're maintaining ClawText:**

1. [MONITORING.md](./skills/clawtext/docs/MONITORING.md) — Health metrics
2. [CURATION.md](./skills/clawtext/docs/CURATION.md) — Promotion/archival
3. [ARCHITECTURE.md](./skills/clawtext/docs/ARCHITECTURE.md) — Deep dive design
4. [TESTING.md](./skills/clawtext/docs/TESTING.md) — Validation

---

## 🔗 Key Files

- **Operational patterns:** `~/.openclaw/workspace/memory/operational/`
- **Working memory:** `~/.openclaw/workspace/memory/YYYY-MM-DD.md`
- **Relationships:** `~/.openclaw/workspace/memory/clusters/relationships.yaml`
- **Hot cache:** `~/.openclaw/workspace/state/clawtext/prod/cache/hot.json`
- **Cluster indices:** `~/.openclaw/workspace/memory/clusters/`

---

## 💡 Philosophy

**ClawText is not magic.** It's a tool that compounds effort over time:

- First time you hit a problem: full debugging cost
- Second time: retrieve pattern, instant fix
- Third time and beyond: system gets smarter

**Your job:** Feed it good patterns. (Capture errors, successes, relationships.) The system remembers and compounds.

**The payoff:** After a few weeks, you move faster because the system has learned your domain, patterns, and gotchas.

---

**Version:** 1.0  
**Status:** Production Ready  
**Last Updated:** 2026-03-12
