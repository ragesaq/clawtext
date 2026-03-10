# 🧠 ClawText Browser

**Self-hosted memory browser + anti-pattern manager for ClawText**

Visualize your memory clusters, search across all memories, and manage semantic walls that prevent false associations.

---

## Quick Start

```bash
# Install dependencies
cd ~/.openclaw/workspace/skills/clawtext-browser
npm install

# Start the server (runs on http://localhost:3737)
npm start

# Or in dev mode with auto-reload
npm run dev
```

The browser reads directly from your `~/.openclaw/workspace/memory/` directory. No database needed.

---

## Features

### 🔍 Search Panel
- Full-text search across all memories
- Entity/type filtering
- Real-time suggestions
- Detail panel with full context

### 🕸 Graph Visualization
- Physics-based cluster layout
- Color-coded by project
- Edge thickness = semantic overlap
- **Red dashed edges** = anti-pattern walls (blocked associations)
- **Yellow dashed edges** = partial walls (some shared, some not)
- Click nodes to see cluster details

### 🧱 Anti-Pattern Manager
- Create walls between entities ("RGCS smoothing" ≠ "RageFX UI")
- Agent-proposed walls pending review
- Partial walls: "QML patterns transfer; smoothing does NOT"
- Full CRUD with lifecycle management
- RAG layer respects walls (prevents co-injection)

---

## Anti-Pattern Schema

Anti-patterns are stored in `memory/anti-patterns.json`:

```json
{
  "id": "ap_01abc123",
  "from": "RGCS.smoothing",
  "to": "RageFX.ui",
  "status": "partial",
  "reason": "RGCS smoothing is motion stabilization; RageFX UI is color grading overlay",
  "partialNote": "Both use QML — that learning transfers. Smoothing concepts do NOT.",
  "agentProposed": true,
  "createdAt": "2026-03-10T09:48:00Z",
  "updatedAt": "2026-03-10T09:48:00Z",
  "confirmedBy": "user",
  "tags": ["cross-project-contamination"]
}
```

**Status lifecycle:**
- `proposed` → Agent detected potential false association, pending review
- `confirmed` → User explicitly said "no, these are different"
- `partial` → "Similar in X, different in Y" (nuanced wall)
- `dismissed` → "Actually they ARE related" — wall removed

---

## API Endpoints

### Search
- `GET /api/search?q=RGCS&limit=20` — Full-text search
- `GET /api/search/suggest?q=RG` — Typeahead suggestions

### Anti-Patterns
- `GET /api/anti-patterns` — List all walls
- `POST /api/anti-patterns` — Create wall
- `POST /api/anti-patterns/propose` — Agent proposes wall
- `PATCH /api/anti-patterns/:id/confirm` — Confirm proposed wall
- `PATCH /api/anti-patterns/:id/partial` — Mark as partial
- `PATCH /api/anti-patterns/:id/dismiss` — Remove wall
- `GET /api/anti-patterns/check?from=RGCS&to=RageFX` — Quick wall check
- `GET /api/anti-patterns/blocked-for/:entity` — Get all blocked entities

### Graph
- `GET /api/graph` — Full graph (nodes + edges)
- `GET /api/graph/node/:clusterId` — Cluster detail

### Health
- `GET /api/health` — Server status + stats

---

## Self-Hosting with Memory-Core + Embeddings

For **best performance**, run alongside OpenClaw with memory-core enabled and a local embeddings provider.

### Recommended Setup

1. **Enable memory-core plugin** (if not already):
   ```json
   // ~/.openclaw/openclaw.json
   {
     "plugins": {
       "allow": ["discord", "memory-core", "clawtext-browser"]
     }
   }
   ```

2. **Add local embeddings** (choose one):

   **Option A: Ollama (Recommended)**
   ```bash
   # Install: https://ollama.ai
   ollama pull nomic-embed-text
   # Runs on localhost:11434 automatically
   ```

   **Option B: Jina v2 (Fast, Small)**
   ```bash
   npm install @jinaai/jina-js
   # Free tier API key required
   ```

   **Option C: Sentence-Transformers (Local, Heavy)**
   ```bash
   pip install sentence-transformers
   # Model: all-MiniLM-L6-v2
   ```

3. **Configure ClawText** (optional, for semantic search enhancement):
   ```yaml
   # ~/.openclaw/workspace/skills/clawtext/config.yaml
   embeddings:
     provider: ollama
     model: nomic-embed-text
     baseUrl: http://localhost:11434
   ```

### Performance Targets
- **Search latency**: <100ms (local clusters)
- **Embeddings latency**: <10ms (Ollama) / <50ms (Jina)
- **Anti-pattern filtering**: <5ms
- **Total round-trip**: <200ms

---

## Integration with Agent Workflow

### Agent-Proposed Walls

During operational learning, agents can detect potential false associations:

```typescript
// In operational-learning phase
const potentialLink = {
  from: 'RGCS.smoothing',
  to: 'RageFX.ui',
  reason: 'Both involve QML-based UI components',
  confidence: 0.65
};

// Propose to user via browser API
await fetch('http://localhost:3737/api/anti-patterns/propose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(potentialLink)
});
```

User reviews in browser UI:
- ✅ **Confirm** → Hard wall created
- ⚠️ **Partial** → "QML patterns transfer; smoothing does NOT"
- ✗ **Dismiss** → "Actually they are related" → no wall

### RAG Layer Integration

The RAG layer checks anti-patterns before co-injecting memories:

```typescript
// In src/rag-filtered.ts
async function retrieveMemories(query: string, activeEntity: string) {
  const candidates = performBM25(query, clusters);
  
  // Filter out blocked entities
  const blocked = antiPatternStore.getBlockedEntitiesFor(activeEntity);
  const filtered = candidates.filter(m =>
    !blocked.some(b => m.clusterTopic === b.blockedEntity)
  );
  
  return filtered.slice(0, options.maxMemories);
}
```

---

## Why This Matters

**Problem:** Agents make false associations across projects.

**Example:** 
- You tell agent: "RageFX uses QML like RGCS, apply QML learnings"
- Agent infers: "RageFX should also do motion smoothing"
- **Wrong!** Smoothing is RGCS-specific; RageFX is color grading overlay

**Solution:** Anti-pattern walls prevent this contamination.

1. User creates wall: `RGCS.smoothing` ↔ `RageFX.ui`
2. Reason: "Different domains; smoothing is VR motion, UI is color grading"
3. Partial note: "QML patterns transfer; smoothing does NOT"
4. RAG layer respects wall: never co-injects these clusters
5. Agent reasoning stays clean

---

## File Structure

```
clawtext-browser/
├── package.json
├── src/
│   ├── server.js                 # Express backend
│   ├── anti-pattern-store.js     # Anti-pattern CRUD + lifecycle
│   ├── memory-store.js           # Cluster loader + search
│   └── routes/
│       ├── search.js             # Search API
│       ├── anti-patterns.js      # Anti-pattern API
│       └── graph.js              # Graph visualization API
├── ui/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx               # Main layout (3 tabs)
│       └── components/
│           ├── SearchPanel.jsx   # Search + results
│           ├── GraphPanel.jsx    # Force-directed graph
│           ├── AntiPatternPanel.jsx  # Wall manager
│           └── StatusBar.jsx     # Connection + stats
└── README.md
```

---

## Development

```bash
# Backend dev (auto-reload)
npm run dev

# Frontend dev (separate process, port 5173)
cd ui && npm run dev

# Build production UI
cd ui && npm run build

# Production server
npm start
```

---

## License

MIT — Built for the OpenClaw ecosystem.

---

**Questions?** Join the #clawtext-holistic-memory-system-kickoff-shipping-plan thread on Discord.
