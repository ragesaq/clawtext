# 🧭 ClawText Browser — Big Picture Status

**Date:** 2026-03-10 · **Workstream:** Full Parallel Prototype Phase

---

## 📊 Current State Assessment

### ✅ What Already Exists (Production-Ready)

**Backend (Express + Node.js):**
- ✅ Anti-pattern store (`src/anti-pattern-store.js`) — Full CRUD, lifecycle management
- ✅ Hygiene store (`src/hygiene-store.js`) — Secret detection, sanitization, audit API
- ✅ Memory store (`src/memory-store.js`) — Cluster loading, BM25 search
- ✅ Graph API (`src/routes/graph.js`) — Returns nodes/edges
- ✅ Search API (`src/routes/search.js`) — Full-text + entity filtering
- ✅ Hygiene API (`src/routes/hygiene.js`) — Pattern management, audit-memory endpoint
- ✅ Server (`src/server.js`) — Express routes wired up

**Frontend (React + D3):**
- ✅ Graph visualization (`ui/src/components/GraphPanel.jsx`) — Force-directed graph with:
  - Physics-based layout (d3-force)
  - Pan/zoom (mouse wheel + drag)
  - Node dragging
  - Cluster detail overlay
  - Anti-pattern wall visualization (red dashed = hard wall, yellow = partial)
  - Project color coding
  - Auto-fit to viewport
- ✅ Search panel (assumed exists based on routes)
- ✅ Anti-pattern manager (assumed exists based on routes)

**Data Layer:**
- ✅ Cluster files in `memory/clusters/` (JSON format)
- ✅ Anti-patterns in `memory/anti-patterns.json`
- ✅ Hygiene patterns in `memory/hygiene-patterns.json` (assumed)

---

## 🎯 What Needs Work (The 6 Scope Areas)

### 1️⃣ Graph Density / Full-Canvas Rendering

**User Preference:** Maximum information density, minimal margins, zero whitespace. Grow panels to contain more info or fit additional panels. Wider canvas preferred over performance optimization.

**New Context:** This browser will be **one tab in a larger main dashboard**. It must dynamically expand to fill available space, not assume full viewport.

**Current State:** ⚠️ **Layout Needs Redesign**
- ❌ **Assumes full viewport** — Uses `100vh` / `100vw`, won't work in dashboard tab
- ❌ **Fixed-width sidebars** (300px) — Should be responsive to container
- ❌ **Fixed control positions** — Should reflow based on available space
- ❌ **No container awareness** — Doesn't adapt when parent size changes

**Redesign Plan:**
```
Phase 1A — Container-Aware Layout (1.5 hours)
  - Remove all `100vh` / `100vw` assumptions
  - Use `height: 100%` relative to parent container
  - ResizeObserver to detect parent size changes
  - Graph canvas expands/shrinks with available space

Phase 1B — Dynamic Panel System (2 hours)
  - Panels are not fixed-width — they fill remaining space
  - Resizable dividers between panels (drag to adjust)
  - Panels can be collapsed (icon-only) or expanded (full content)
  - "Auto-dense" mode: panels shrink to fit more on screen
  - Layout persists (remembers panel sizes between sessions)

Phase 1C — Dashboard Tab Integration (1 hour)
  - Wrap browser in dashboard-ready component
  - Accept `containerHeight` prop (from parent dashboard)
  - Expose events for tab switching (notify parent when active)
  - Share global state (anti-patterns, hygiene patterns) with other tabs
```

**Quick Wins:**
- Replace `100vh` with `height: 100%` everywhere
- Add ResizeObserver to main container
- Make sidebars collapsible (button to toggle width)
- Remove all fixed margins (use `gap: 0` in flex layouts)

---

### 2️⃣ Browser Hygiene Triage

**Current State:** ✅ **Backend Complete, UI Missing**
- ✅ `src/hygiene-store.js` — Pattern matching, sanitization, audit logic
- ✅ API endpoints: `/api/hygiene/stats`, `/api/hygiene/patterns`, `/api/hygiene/audit-memory`
- ❌ **No UI component** for hygiene dashboard
- ❌ **No automatic detection** on memory ingest

**Lightweight Prototype Plan:**
```
Phase 2A — Hygiene Dashboard UI (2 hours)
  - New tab in main App.jsx: "Hygiene"
  - Stats panel: patterns enabled, secrets found, last audit
  - Pattern list: toggle on/off, edit regex, test text
  - "Audit Memory" button: scan all clusters, show findings
  - Findings list: memory ID, cluster, severity, redact button

Phase 2B — Auto-Detect on Ingest (1 hour)
  - Hook into clawtext-extract or ingest pipeline
  - Run `scan(text)` on every new memory
  - If matches found: flag in memory metadata `{ hygieneFlag: true, matches: [...] }`
  - Add to "Review Queue" in UI

Phase 2C — One-Click Redaction (1 hour)
  - For each finding: "Redact" button
  - Call `/api/hygiene/scan` → get sanitized text
  - Update memory in cluster file (or create redacted version)
  - Log to `memory/secret-removal-log.jsonl`
```

**Quick Wins:**
- Add "Hygiene Score" to status bar (clean / warning / critical)
- Highlight flagged memories in search results (red badge)
- Auto-skip flagged memories during RAG injection

---

### 3️⃣ Explicit Secret Removal Flow

**Current State:** ✅ **Backend Complete, Workflow Missing**
- ✅ Built-in patterns: API keys, tokens, passwords, private keys
- ✅ Custom pattern support (regex + flags + replacement)
- ✅ `sanitize()` and `scan()` functions
- ❌ **No review workflow** (confirm/reject false positives)
- ❌ **No audit trail** (who redacted what, when)

**Lightweight Prototype Plan:**
```
Phase 3A — Review Queue UI (1.5 hours)
  - Sub-tab in Hygiene panel: "Pending Review"
  - List of memories flagged during ingest
  - Show: original text (highlighted matches), suggested redaction
  - Actions: "Confirm Redact", "Mark False Positive", "Ignore"
  - Batch actions: "Confirm All", "Reject All"

Phase 3B — Audit Trail (0.5 hours)
  - Create `memory/secret-removal-log.jsonl`
  - Log format:
    {
      "timestamp": "2026-03-10T20:15:00Z",
      "action": "redact" | "false-positive" | "ignore",
      "memoryId": "mem_abc123",
      "clusterId": "cluster_rgcs_smoothing",
      "patternId": "builtin-aws-key",
      "operator": "user-session-id",
      "originalSnippet": "...AKIA...",
      "redactedSnippet": "...[REDACTED]..."
    }

Phase 3C — Blocklist Prevention (1 hour)
  - After redaction, extract secret pattern (hash of original)
  - Store in `memory/secret-blocklist.json`
  - On ingest: check if new memory contains known blocklisted patterns
  - If match: auto-flag + notify operator
```

**Quick Wins:**
- Add "Secrets Found" counter to Hygiene stats
- One-click "Redact All Confirmed" button
- Email/Discord notification for high-severity secrets

---

### 4️⃣ Anti-Pattern Mining from Existing Memories

**Current State:** ⚠️ **Backend Exists, Mining Missing**
- ✅ Anti-pattern store (manual creation + agent proposal)
- ✅ RAG layer checks walls before injection
- ❌ **No automated mining** of existing memories for potential walls
- ❌ **No pattern detection** (e.g., "RGCS smoothing" vs "RageFX smoothing" — are they actually different?)

**Lightweight Prototype Plan:**
```
Phase 4A — Mining Algorithm (2 hours)
  - Scan all memories for:
    - High-confidence false associations (BM25 score > 0.8 but semantic similarity < 0.3)
    - Duplicate clusters (same topic, different projects)
    - Orphaned nodes (memories with no connections)
    - Overly verbose entries (>10KB single memory)
  - Generate "Anti-Pattern Candidates" list

Phase 4B — Agent Review Workflow (1.5 hours)
  - New UI: "Proposed Walls" (pending agent review)
  - Show candidate: "From X to Y — reason: Z"
  - Agent explanation: "These seem similar but actually differ in..."
  - Actions: "Confirm Wall", "Mark Partial", "Dismiss"
  - Batch review mode (approve multiple at once)

Phase 4C — Auto-Generate Reports (0.5 hours)
  - Weekly "Memory Health Report":
    - Total anti-patterns: N
    - Proposed (pending): M
    - False associations prevented: K
    - Top contamination risks: list
```

**Quick Wins:**
- Add "Potential Wall" badge to graph edges (yellow question mark)
- Click badge to see agent reasoning + confirm/dismiss
- Export anti-patterns as JSON for backup/sharing

---

### 5️⃣ Provider Health / Metrics

**Current State:** ❌ **Not Implemented**
- ❌ No metrics collection (uptime, latency, error rates)
- ❌ No health dashboard
- ❌ No fallback routing logic
- ❌ No user-facing error messages

**Lightweight Prototype Plan:**
```
Phase 5A — Metrics Collector (1.5 hours)
  - Middleware around all provider calls (OpenAI, Anthropic, etc.)
  - Track:
    - Request timestamp
    - Response time (ms)
    - Status code / error type
    - Tokens used (input/output)
    - Cost (if tracked)
  - Store in `memory/provider-metrics.jsonl` (rolling 24h)

Phase 5B — Health Dashboard UI (2 hours)
  - New tab: "Provider Health"
  - Real-time status: ✅ OpenAI (12ms), ⚠️ Anthropic (340ms), ❌ Google (timeout)
  - Charts: latency over time (last 24h), error rate, throughput
  - Stats: uptime %, total requests, avg cost/request
  - "Test Provider" button: ping each, show response time

Phase 5C — Fallback Routing (1.5 hours)
  - Config: primary provider, fallback list
  - Logic:
    - If primary error rate > 10% in last 10 min → switch to fallback
    - If primary latency > 5s avg → switch to fallback
    - Auto-retry primary every 5 min
  - User notification: "Switched to Anthropic due to OpenAI issues"

Phase 5D — User-Facing Errors (1 hour)
  - Replace technical errors with plain language:
    - "Provider overloaded" → "Model is busy. Retrying in 30s..."
    - "Rate limit" → "You've hit the limit. Next slot: 2 min"
    - "Auth failed" → "API key expired. [Update Key] →"
  - Add retry button with exponential backoff
```

**Quick Wins:**
- Add "Provider Status" indicator to status bar (green/yellow/red)
- Show "Last successful response time" in header
- Auto-retry failed requests (3 attempts, 2s/5s/10s backoff)

---

### 6️⃣ Better User-Facing Error Handling

**Current State:** ❌ **Not Implemented**
- ❌ No error categorization (transient vs. permanent)
- ❌ No user-friendly messages
- ❌ No "Report Issue" flow
- ❌ No retry logic with backoff

**Lightweight Prototype Plan:**
```
Phase 6A — Error Categorization (1 hour)
  - Wrapper around all API calls
  - Classify errors:
    - Transient: 5xx, timeout, network error → retry
    - Rate limit: 429 → wait + retry
    - Auth: 401 → prompt for key update
    - Data: 422, corruption → show details + report
    - User: 400 → show validation errors
  - Log all errors to `memory/error-log.jsonl`

Phase 6B — Error UI Components (1.5 hours)
  - Toast notifications (non-blocking):
    - Transient: "Retrying... (attempt 2/3)"
    - Rate limit: "Rate limited. Next available: 1:45"
  - Modal for critical errors:
    - Plain language explanation
    - "Retry" button
    - "Report Issue" button (captures context snapshot)
  - Inline errors for form validation

Phase 6C — Report Issue Flow (1 hour)
  - "Report Issue" button in error modal
  - Captures:
    - Error type + message
    - Current page / action
    - Recent API calls (last 5)
    - Browser state (memory count, active filters)
  - Generates: "Error Report" memory in `memory/error-reports/`
  - Optional: post to Discord channel
```

**Quick Wins:**
- Add "Retry" button to all transient errors
- Show "Last error: 10 min ago" in status bar (if recent)
- One-click "Copy Error Details" for support

---

## 🚀 Implementation Priority

**Note:** Provider health metrics infrastructure is handled in <#1481011906901704704>. This workstream focuses on ClawText browser UI/operator workflow only.

**✅ Phase 1 Complete (Foundation) — 2026-03-10:**
- ✅ **Container-aware layout** — No more `100vh` assumptions, fills parent container
- ✅ **Resizable panel system** — Drag dividers, layout persists in localStorage
- ✅ **Horizontal tab bar** — Dashboard-ready (32px height)
- ✅ **Dense status bar** — 1-line stats (24px height)
- ✅ **Compact graph panel** — Overlay controls, slide-in detail panel
- ✅ **Build verified** — Production build successful

**Week 1 (Remaining):**
2. **Hygiene Dashboard** (Phase 2A) — Dense panel UI for secret triage
3. **Error Handling** (Phase 6A + 6B) — Inline toasts, retry buttons

**Week 2 (Operational Improvements):**
4. **Secret Removal Flow** (Phase 3A + 3B) — Review queue, audit trail
5. **Anti-Pattern Mining** (Phase 4A) — Mining algorithm
6. **Multi-Panel Layout for Other Tabs** — Resizable panels for search/walls/hygiene

**Week 3 (Polish & Scale):**
7. **Report Issue Flow** (Phase 6C) — Support workflow
8. **Layout Presets** — Save/restore custom layouts
9. **Cross-Tab State** — Shared filters, global context

---

## 📁 File Changes Needed

### Backend Additions
```
src/routes/provider-health.js       (new) — Metrics API
src/routes/errors.js                (new) — Error logging API
src/middleware/provider-monitor.js  (new) — Wrap provider calls
src/middleware/error-handler.js     (new) — Categorize + format errors
src/provider-health-store.js        (new) — Metrics aggregation
src/error-store.js                  (new) — Error log management
```

### Frontend Additions
```
ui/src/components/ProviderHealthPanel.jsx   (new)
ui/src/components/ErrorModal.jsx            (new)
ui/src/components/ErrorToast.jsx            (new)
ui/src/components/HygieneDashboard.jsx      (new)
ui/src/components/ReviewQueue.jsx           (new)
ui/src/components/ProposedWalls.jsx         (new)
ui/src/App.jsx                              (modify) — Add new tabs
```

### Data Files (Auto-Created)
```
memory/provider-metrics.jsonl       (rolling 24h)
memory/error-log.jsonl              (rolling 7 days)
memory/error-reports/               (directory)
memory/secret-removal-log.jsonl     (audit trail)
memory/secret-blocklist.json        (hashes of redacted secrets)
memory/anti-pattern-candidates.json (mined patterns)
```

---

## 🎯 Success Metrics

**Performance:**
- Graph renders 500+ nodes at 30+ FPS
- Search latency <100ms (local), <300ms (with embeddings)
- Provider fallback switches in <2s

**Usability:**
- Secrets detected 100% of the time (built-in patterns)
- False positive rate <5% (user-adjustable thresholds)
- Error messages understandable by non-technical users

**Reliability:**
- Provider uptime >99% (with fallback)
- Zero uncaught errors in production
- Audit trail for all redactions

---

## 📝 Next Steps

**Immediate (Today):**
1. ✅ This document created (big picture status)
2. ⏳ Start Phase 5A (Metrics Collector) — 1.5 hours
3. ⏳ Start Phase 6A (Error Categorization) — 1 hour

**This Week:**
- Complete Phases 5A, 5B, 6A, 6B, 2A (provider health + errors + hygiene dashboard)
- Deploy to staging
- Test with real memory data (100+ clusters)

**Next Week:**
- Complete Phases 3A, 3B, 4A, 1A (secrets + mining + benchmarking)
- User testing with ragesaq
- Iterate based on feedback

---

*Last updated: 2026-03-10 20:05 UTC*
*Created from Discord thread #clawtext-browser-graph-density-hygiene-triage-and-provider-health*
