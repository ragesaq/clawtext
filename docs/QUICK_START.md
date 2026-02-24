# Clawtext Quick Start: Just Works Edition

**Get Clawtext running in 5 minutes with auto-integration.**

## Option 1: Automatic Setup (Recommended)

### 1. Install Clawtext
```bash
cd ~
git clone https://github.com/ragesaq/clawtext.git
cd clawtext
npm link  # Makes it available globally
```

### 2. Enable Auto-Integration
```bash
# Copy the extension into OpenClaw
cp ~/clawtext/lib/clawtext-extension.ts ~/.openclaw/extensions/
```

### 3. Restart OpenClaw
```bash
openclaw gateway restart
```

**That's it!** Clawtext will:
- ✅ Auto-enhance memory searches with hybrid ranking
- ✅ Auto-inject context at session start
- ✅ Auto-optimize clusters daily
- ✅ Keep working even if it fails (graceful fallback)

## Option 2: Manual Integration (For Control)

### 1. Install Clawtext
```bash
cd ~
git clone https://github.com/ragesaq/clawtext.git
cd clawtext
npm install
```

### 2. Configure OpenClaw
Edit `~/.openclaw/openclaw.json`:

```json
{
  "memory": {
    "enhancements": {
      "clawtext": {
        "enabled": true,
        "clusterOptimization": "daily",
        "minConfidence": 0.7,
        "maxMemories": 10,
        "tokenBudget": 2000
      }
    }
  }
}
```

### 3. Add to Your Extension
```typescript
// In your OpenClaw extension:
import { registerClawtext } from 'clawtext/lib/clawtext-extension';

export async function register() {
  await registerClawtext();
}
```

## What Changes Automatically?

| Feature | Before | After Clawtext |
|---------|--------|----------------|
| **Memory Search** | Basic semantic | Hybrid (BM25 + semantic) |
| **Session Start** | No context | Auto-loaded cluster context |
| **Performance** | O(n) search | O(1) cluster lookup |
| **Context Quality** | All memories | Confidence-filtered memories |
| **Maintenance** | Manual | Daily auto-optimization |

## Verification

Check that Clawtext is active:
```bash
# After restarting OpenClaw gateway
openclaw gateway status

# Look for:
# [Clawtext] Integration complete! Enhanced memory system active.
```

## Troubleshooting

### "Clawtext not loading"
- Check `~/.openclaw/extensions/clawtext-extension.ts` exists
- Check OpenClaw logs: `tail -f ~/.openclaw/logs/gateway.log`
- Restart: `openclaw gateway restart`

### "Search not improved"
- Ensure memory files have headers with `confidence:` scores
- Check clusters are being built: `ls ~/.openclaw/workspace/memory/clusters/`
- Run manual optimization: `openclaw command clawtext-optimize`

### "Too much/too little context"
- Adjust `minConfidence` in config (higher = stricter, lower = more)
- Adjust `maxMemories` and `tokenBudget` in config

## Migration Back

If you don't like Clawtext:
```bash
# Remove the extension
rm ~/.openclaw/extensions/clawtext-extension.ts

# Restart OpenClaw
openclaw gateway restart
```

No data migration needed - Clawtext doesn't change your memory files.

## Advanced Configuration

See `docs/CONFIGURATION.md` for:
- Custom cluster rules
- Hybrid search weights
- Project-specific settings
- Performance tuning

---

**Next:** Try a session with your OpenClaw agent. You should notice faster session starts and more relevant context automatically.