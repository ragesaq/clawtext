# ClawText Browser — Work Stream & Backlog

**Created:** 2026-03-10 · **Owner:** ragesaq · **Status:** Active Development

---

## 🎯 Scope (From Thread Starter)

This work stream focuses on the ClawText browser UI and operator workflows, spun out from the main ClawText shipping thread for dedicated focus.

### Key Areas:
1. **Graph Density / Full-Canvas Rendering** — Visualizing large memory clusters on a single canvas without performance degradation
2. **Browser Hygiene Triage** — Detecting and handling browser state issues, cache corruption, session drift
3. **Explicit Secret Removal Flow** — Operator workflow for identifying and purging secrets from memory
4. **Anti-Pattern Mining** — Automated detection of problematic patterns in existing memories
5. **Provider Health Metrics** — Uptime, latency, throughput monitoring for model providers
6. **Error Handling** — Better user-facing messages for provider/transient errors

---

## 📊 Current Status (2026-03-10)

**Immediate Blocker:** OpenAI provider issues affecting both browser UI and backend operations.

**Priority Actions:**
1. [ ] Backfill this document with detailed specs from ongoing discussions
2. [ ] Implement provider health monitoring (fallback routing)
3. [ ] Create graceful degradation for browser UI during provider outages
4. [ ] Design secret removal workflow (operator-facing)
5. [ ] Prototype graph density rendering (canvas performance testing)

---

## 1️⃣ Graph Density / Full-Canvas Rendering

**Problem:** As memory clusters grow (100+ nodes), the browser UI becomes sluggish or unrenderable.

**Goals:**
- Support 500+ nodes on a single canvas with <16ms frame time
- Implement level-of-detail (LOD) rendering: zoomed out = abstracted nodes, zoomed in = full detail
- Add clustering/aggregation at high zoom levels
- Enable virtual scrolling/pagination for large graphs

**Open Questions:**
- Current rendering engine? (D3, Cytoscape, React Flow, custom Canvas/WebGL?)
- What's the breaking point observed so far?
- Should we support multiple views (timeline, cluster map, list view)?

**Tasks:**
- [ ] Benchmark current rendering performance at various node counts
- [ ] Research LOD strategies for graph visualization
- [ ] Prototype WebGL-based renderer if DOM-based is too slow
- [ ] Design zoom-dependent detail levels

---

## 2️⃣ Browser Hygiene Triage

**Problem:** Browser state (IndexedDB, localStorage, service workers) can corrupt or drift over time, causing memory sync issues.

**Goals:**
- Auto-detect hygiene issues (stale caches, quota exceeded, corrupted indexes)
- Provide one-click "reset browser state" with safe migration path
- Log hygiene events to memory for operator review
- Add health dashboard showing browser state metrics

**Detection Patterns:**
- IndexedDB quota exceeded errors
- localStorage size > 5MB (warning threshold)
- Service worker cache mismatches
- Memory cluster checksums not matching server state

**Tasks:**
- [ ] Implement browser health checker (run on startup)
- [ ] Create "Hygiene Dashboard" UI component
- [ ] Design safe state reset flow (preserve memories, clear cache)
- [ ] Add automatic recovery for common issues

---

## 3️⃣ Explicit Secret Removal Flow

**Problem:** Secrets (API keys, tokens, passwords) may accidentally get captured in memory during conversations.

**Goals:**
- Detect potential secrets via pattern matching + ML classifier
- Provide operator UI to review flagged items
- One-click redaction with audit trail
- Prevent re-ingestion of known secret patterns

**Workflow:**
1. Auto-scan memories on ingest (async, non-blocking)
2. Flag suspicious items in "Review Queue" UI
3. Operator confirms/rejects secret status
4. Redact in place (replace with `[REDACTED]` + hash for audit)
5. Log to `memory/secret-removal-log.jsonl`

**Detection Patterns:**
- Regex: `AKIA[0-9A-Z]{16}`, `sk-[a-zA-Z0-9]{48}`, `-----BEGIN.*KEY-----`
- ML classifier for context-aware detection (API key in conversation vs. code snippet)
- User-defined patterns (custom secrets list)

**Tasks:**
- [ ] Build secret detection engine (regex + classifier)
- [ ] Design Review Queue UI (pending, confirmed, false positives)
- [ ] Implement redaction with audit trail
- [ ] Add "blocklist" for known secret patterns

---

## 4️⃣ Anti-Pattern Mining

**Problem:** Certain memory patterns degrade system performance or indicate capture errors.

**Anti-Patterns to Detect:**
- **Duplicate clusters** — Same memory captured multiple times with slight variations
- **Orphaned nodes** — Memories with no connections to other clusters
- **Overly verbose entries** — Single memories >10KB (likely capture errors)
- **Timestamp anomalies** — Memories with future dates or out-of-order sequences
- **Low-confidence extractions** — Memories flagged during extraction with <0.5 confidence

**Goals:**
- Automated weekly scan of all memories
- Generate "Health Report" with actionable items
- One-click fixes for common issues (merge duplicates, prune orphans)

**Tasks:**
- [ ] Define anti-pattern detection rules
- [ ] Build weekly scan cron job
- [ ] Create "Memory Health Report" UI
- [ ] Implement bulk fix actions (merge, prune, archive)

---

## 5️⃣ Provider Health / Metrics

**Problem:** Model providers (OpenAI, Anthropic, etc.) have outages, rate limits, and latency spikes that affect ClawText operations.

**Metrics to Track:**
- **Uptime** — % of requests successful in last 24h
- **Latency** — P50, P95, P99 response times
- **Throughput** — Requests/minute, tokens/second
- **Error rates** — 429s, 5xx, timeouts
- **Cost** — Tokens used, $ spent (if tracking)

**Goals:**
- Real-time provider health dashboard
- Automatic fallback routing when primary provider degrades
- User-facing "degraded mode" messages during outages
- Historical metrics for capacity planning

**Tasks:**
- [ ] Build metrics collector (per-provider, per-endpoint)
- [ ] Create health dashboard UI (real-time + historical)
- [ ] Implement fallback routing logic (primary → secondary)
- [ ] Add user-facing error messages with retry suggestions

---

## 6️⃣ Better Error Handling (User-Facing)

**Problem:** Current error messages are technical and don't guide users on what to do.

**Goals:**
- Translate technical errors into plain language
- Provide actionable next steps
- Show estimated recovery time for transient issues
- Add "Report Issue" flow with context capture

**Error Categories:**
- **Transient** — "Provider is temporarily overloaded. Retrying in 30s..."
- **Rate Limited** — "You've hit the rate limit. Next available slot: 2 minutes."
- **Auth Failure** — "API key expired. [Update Key] →"
- **Network** — "Connection lost. Reconnecting..."
- **Data Corruption** — "Memory cluster corrupted. [Repair] [Report] →"

**Tasks:**
- [ ] Catalog all error types and map to user-friendly messages
- [ ] Design error UI components (toast, modal, inline)
- [ ] Implement retry logic with exponential backoff
- [ ] Add "Report Issue" with context snapshot

---

## 📝 Context Note (2026-03-10)

**Message Errors:** Recent message errors (including provider issues) have been generating failures that could impact agent progress. This is noted for awareness but is **not** part of this workstream's scope. Provider health monitoring will help surface these issues, but active mitigation is handled separately.

---

## 📅 Next Steps

**This Week:**
1. Backfill this document with detailed specs from ongoing discussions
2. Implement provider health monitoring + fallback routing
3. Design secret removal workflow
4. Start graph density performance testing

**Next Week:**
1. Prototype browser hygiene triage
2. Build anti-pattern detection engine
3. Create error handling UI components
4. Deploy provider health dashboard

---

## 📁 Related Files

- `skills/clawtext/` — Main ClawText package
- `memory/YYYY-MM-DD.md` — Daily operational notes
- `memory/extract-buffer.jsonl` — Message buffer for extraction
- `memory/secret-removal-log.jsonl` — Secret redaction audit trail (to create)
- `memory/provider-health-metrics.json` — Provider metrics (to create)

---

## 📝 Notes from Thread

*This document is a living backfill. Add details from ongoing discussions as they happen.*

**Key Decisions to Capture:**
- Graph rendering engine choice
- Secret detection threshold (false positive vs. false negative tradeoff)
- Provider fallback priorities
- Browser hygiene reset policy

**Open Questions:**
- Should graph rendering be optional (toggle for performance)?
- Should secret redaction be automatic or always require operator approval?
- Which providers to support as fallbacks (Anthropic, Google, local models)?

---

*Last updated: 2026-03-10 20:01 UTC*
*Created from Discord thread #clawtext-browser-graph-density-hygiene-triage-and-provider-health*
