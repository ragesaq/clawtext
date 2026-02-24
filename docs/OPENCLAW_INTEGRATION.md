# OpenClaw Integration Guide

**Understanding Clawtext's Role in the OpenClaw Ecosystem**

## Nomenclature: What Type of Project Is This?

In OpenClaw terminology, projects are categorized as:

| Type | Location | Purpose | Examples | Clawtext? |
|------|----------|---------|----------|-----------|
| **Skill** | `~/openclaw/skills/` | Instructions + tools | `weather`, `github` | ❌ No |
| **Extension** | `~/openclaw/extensions/` | Auto-registering modules | `sqlite-memory`, `qmd` | ❌ No |
| **Plugin** | OpenClaw config | Built-in functionality | `memory-core`, `embedding` | ❌ No |
| **Library** | Anywhere | Importable code to enhance | Custom enhancements | ✅ **YES** |

**Clawtext is a TypeScript library** that provides memory retrieval improvements.

## Installation Location

```
# Recommended structure
/home/your-user/
├── .openclaw/           # OpenClaw installation
│   ├── extensions/      # Extensions
│   ├── skills/          # Skills
│   └── workspace/       # Your workspace
├── clawtext/            # Clawtext library
│   ├── lib/             # TypeScript modules
│   ├── config/          # Configuration
│   └── docs/            # Documentation
└── your-projects/       # Your other projects
```

**Note:** Clawtext installs **alongside** OpenClaw, not inside it.

## Integration Methods

### Method 1: Direct Import (Recommended)

```typescript
// In your OpenClaw extensions or custom code
import { hybridSearch, memoryClusters } from '../../clawtext/lib/hybrid-search-simple';

// Replace default memory search
memory.search = async (query, options) => {
  return hybridSearch(query, {
    ...options,
    clusters: await memoryClusters.get(options.projectId)
  });
};
```

### Method 2: Configuration Replacement

Edit OpenClaw config to route memory operations through Clawtext:

```json
// openclaw.json or via openclaw config set
{
  "memory": {
    "searchImpl": "clawtext/hybrid-search-simple",
    "enableClusters": true,
    "minConfidence": 0.7
  }
}
```

### Method 3: Skill Integration

Create a lightweight skill that uses Clawtext internally:

```markdown
# SKILL.md - clawtext-integration

## Purpose
Bridge OpenClaw skills to Clawtext functionality

## Tools
- context.enhance: Inject Clawtext-enhanced context
- memory.optimize: Run cluster optimization

## Implementation
```typescript
import { sessionContext, memory360 } from '../../clawtext/lib/';
```
```

## Hook Points

Clawtext can integrate at these OpenClaw lifecycle points:

### 1. Session Start
```typescript
// Replace default context loading
hooks.onSessionStart(async (session) => {
  const context = await clawtext.getContext(session);
  session.injectContext(context);
});
```

### 2. Memory Write
```typescript
// Auto-cluster new memories
hooks.onMemoryCreate(async (memory) => {
  await clawtext.addToCluster(memory);
});
```

### 3. Periodic Maintenance
```typescript
// Run optimization daily
cron.every('1d', async () => {
  await clawtext.reconcileClusters();
  await clawtext.cleanupLowConfidence();
});
```

## Backward Compatibility

**Critical:** Clawtext maintains full compatibility with:

✅ Existing memory storage (no migration needed)  
✅ All OpenClaw tools (`memory_search`, `memory_get`)  
✅ Current memory file formats  
✅ Existing skill dependencies  

### Fallback Behavior

If Clawtext fails or is disabled:
```typescript
// Defaults back to OpenClaw native search
const results = await (useClawtext ? 
  clawtext.hybridSearch(query) : 
  openclaw.memorySearch(query)
);
```

## Configuration Example

```json
{
  "clawtext": {
    "enabled": true,
    "integration": {
      "mode": "replace",
      "fallbackToNative": true,
      "performanceMode": "balanced"
    },
    "features": {
      "useClusters": true,
      "useHybridSearch": true,
      "confidenceFiltering": true,
      "autoContextInjection": true
    },
    "performance": {
      "clusterCacheTTL": "1h",
      "maxConcurrentSearches": 5,
      "tokenBudget": 2000
    }
  }
}
```

## Testing Integration

Use the diagnostics tool to verify:

```bash
cd /path/to/clawtext
node diagnostics.js
```

Expected output:
```
✅ OpenClaw environment detected
✅ Memory-core plugin active
✅ Configuration compatible
✅ Hybrid search ready
✅ Cluster management ready
```

## Production Deployment

### Step 1: Install
```bash
git clone https://github.com/ragesaq/clawtext.git
cd clawtext
npm install
```

### Step 2: Configure OpenClaw
```bash
openclaw config set memory.searchImpl clawtext/hybrid-search-simple
openclaw config set memory.enableClusters true
```

### Step 3: Verify
```bash
openclaw gateway restart
node clawtext/diagnostics.js
```

### Step 4: Monitor
```bash
# Check performance improvements
tail -f ~/.openclaw/logs/performance.log | grep clawtext
```

## Troubleshooting

### "Module not found"
- Ensure Clawtext path is in NODE_PATH
- Use relative paths from OpenClaw directory

### "No performance improvement"
- Check if clusters are being built (`memory/YYYY-MM-DD.md`)
- Verify confidence threshold isn't too high

### "Integration conflicts"
- Disable other memory/search extensions
- Use feature flags to isolate issues

## Migration from Other Solutions

### From sqlite-memory extension
```typescript
// Clawtext keeps memory in text files
// No database migration needed
```

### From external vector DB
```typescript
// Export embeddings to memory/*.md files
// Clawtext will create clusters automatically
```

### From custom search implementation
```typescript
// Replace your search function with:
import { hybridSearch } from 'clawtext';
// Keep all other code
```

## Support & Resources

- GitHub Issues: https://github.com/ragesaq/clawtext/issues
- OpenClaw Docs: https://docs.openclaw.ai
- Discord: https://discord.com/invite/clawd

Remember: Clawtext enhances OpenClaw, it doesn't replace it. The core memory storage, tools, and skills all remain functional.
