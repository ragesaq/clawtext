# HEARTBEAT.md — Periodic Checks & Tasks

Add lightweight periodic tasks here. Agent executes during heartbeat polling (~30 min intervals).

---

## Weekly Tasks (Optional — Pick Your Rhythm)

### ClawText Relationship Maintenance
- **When:** Every Friday or as-needed
- **Time:** 10–15 minutes
- **What:** Review cross-project impact suggestions from memory flush; merge redundant shortcuts; validate stale edges
- **Command:** `clawtext relationships validate --review`
- **Priority:** Low (bonus feature; skip if busy)
- **Agent:** Just do this when you see it; no approval needed

**Context:**
- During memory flush, ClawText suggests new relationship edges (e.g., "RGCS change affects Lumbot latency")
- This task lets you review suggestions, accept the good ones, reject noise
- Keeps relationships fresh without blind crons

---

## Daily Checks (Pick Any 2–3 per Day)

### Check Recent Errors (If Something Feels Off)
- **What:** Scan `.learnings/ERRORS.md` for new patterns
- **Command:** `head -30 ~/.openclaw/workspace/.learnings/ERRORS.md`
- **When:** If previous session had crashes or timeouts
- **Action:** Update MEMORY.md if pattern is new

### Check Memory Injection (RAG Health)
- **What:** Verify ClawText is injecting memories on demand
- **Command:** `node ~/.openclaw/workspace/skills/clawtext/scripts/validate-rag.js`
- **When:** If responses feel like they're missing context
- **Expected:** Hit rate > 80%, confidence > 0.70

### Check Cluster Freshness (Optional)
- **What:** See if clusters were rebuilt recently
- **Command:** `ls -lt ~/.openclaw/workspace/memory/clusters/ | head -5`
- **When:** If you added new memories and want them to be discoverable
- **Action:** If oldest cluster > 7 days, consider rebuild (user approval)

---

## When to Skip HEARTBEAT

If:
- It's past 2am Arizona time (sleep boundary)
- You just ran a heartbeat <30 min ago
- User is clearly busy (in a focused work session)
- Nothing on the list applies

Reply: `HEARTBEAT_OK`

---

## Notes

- **Weekly tasks** are optional; they're there if you have time
- **Daily checks** are lightweight; rotate through them
- **All require user judgment** — no blind actions
- **Low cognitive load** — these should take <30 min total per day if you do all three
