# ClawText Incident Note — False-Empty Memory Retrieval

**Date:** 2026-03-19  
**Status:** Observed, not fully root-caused  
**Priority:** High if recurrent

---

## Summary

A major memory gap was observed where recent context appeared unavailable even though the underlying memory files and semantic index already existed.

Current best explanation:

> The failure was likely in the **runtime retrieval/sync path** rather than the memory content layer itself.

A gateway/runtime restart appears to have resolved the issue.

---

## Observed facts

### Data existed
- `memory/2026-03-18.md` existed
- `memory/2026-03-19.md` existed

### Index existed
- SQLite memory index present
- ~5745 files indexed
- vector index ready
- FTS ready

### Search later worked
- direct memory search for prior Xcode/iOS/OpenClaw conversation succeeded after restart/runtime correction

### Runtime/version mismatch existed
- prior state indicated config written by `2026.3.13`
- running runtime had been `2026.3.7`
- later live check showed runtime on `2026.3.13`

### Error evidence
Direct search output included:
- `memory sync failed (session-start): TypeError: fetch failed`
- `memory sync failed (search): TypeError: fetch failed`

---

## Best current diagnosis

This does **not** look like a missing-memory or missing-index failure.

Most likely failure mode:
1. memory files existed
2. index existed and was queryable
3. session/gateway memory sync or retrieval transport failed
4. agent experienced this as an empty or missing-memory result
5. restart/runtime correction restored the search path

Most plausible root cause cluster:
- stale gateway/runtime process
- version mismatch between config/runtime
- broken memory sync/search transport (`fetch failed`)

---

## Why this matters

This is a dangerous failure mode because it impersonates a semantic result.

Bad current UX:
- search path fails
- agent behaves as if no memory exists

Desired behavior:
- search path fails
- system explicitly reports retrieval-path failure
- system does **not** silently collapse into “no results” semantics

---

## If this happens again

### First checks
1. `openclaw status`
2. verify runtime version vs expected config version
3. run a direct memory search smoke test
4. look for `memory sync failed` / `fetch failed`
5. consider gateway restart if stale runtime suspected

### Suggested smoke test
```bash
openclaw memory search "openclaw ios xcode build"
```

### What to distinguish
- no results
- index missing
- search transport failure
- memory sync failure
- stale runtime/version mismatch

---

## Follow-up recommendations

If recurrence happens, investigate deeper in this order:
1. gateway/runtime version drift
2. memory sync transport path
3. session-start memory bootstrap timing
4. false-empty handling in agent-facing memory retrieval

---

## Product recommendation

ClawText/OpenClaw should eventually surface explicit failure classes such as:
- `RESULT_EMPTY`
- `INDEX_MISSING`
- `SYNC_FAILED`
- `SEARCH_TRANSPORT_FAILED`
- `VERSION_MISMATCH_RUNTIME`

That would prevent future false-empty memory incidents from looking like missing context.
