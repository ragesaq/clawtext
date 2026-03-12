# ClawText Installation vs. OpenClaw Plugin Best Practices

## The Feedback Issue

You mentioned the installation approach doesn't align with OpenClaw best practices. Looking at `https://docs.openclaw.ai/tools/plugin#plugins`, here's what we're doing wrong and how to fix it.

---

## Current ClawText Approach

**What we do:**
```bash
git clone https://github.com/ragesaq/clawtext.git ~/.openclaw/workspace/skills/clawtext
cd ~/.openclaw/workspace/skills/clawtext
npm install
npm run build
```

Then manually add to `openclaw.json`:
```json
{
  "plugins": {
    "load": {
      "paths": ["~/.openclaw/workspace/skills/clawtext"]
    },
    "allow": ["clawtext"]
  }
}
```

**Problem:** This is a **local file path approach** — we're using `plugins.load.paths` to point at a directory we manually cloned.

---

## What OpenClaw Best Practices Say

From the docs:

### Installation Method 1: NPM (Recommended)

```bash
openclaw plugins install @openclaw/voice-call
```

**Why this is better:**
- Uses the `openclaw plugins` CLI (official pathway)
- Automatically handles dependency installation (`npm install --ignore-scripts`)
- Tracks installation in config (`plugins.installs`)
- Enables update/version management (`openclaw plugins update`)
- No manual path editing required

### Installation Method 2: Local Copy

```bash
openclaw plugins install ./extensions/voice-call
```

**Why:** Still uses the CLI, still gets automatic setup, just from a local directory.

### Installation Method 3: Link (Dev Mode)

```bash
openclaw plugins install -l ./extensions/voice-call
```

**Why:** For development. Plugin stays in source tree, linked into `~/.openclaw/extensions`.

### What We Should NOT Do

❌ Directly clone into `~/.openclaw/workspace/skills/`  
❌ Manually edit `plugins.load.paths` in `openclaw.json`  
❌ Manual `npm install` inside the plugin directory  

These bypass the plugin system entirely.

---

## The Three Issues

### Issue 1: We're Using `plugins.load.paths`

**Current:**
```json
"plugins": {
  "load": { "paths": ["~/.openclaw/workspace/skills/clawtext"] }
}
```

**Problem:** This tells OpenClaw "load plugins from this filesystem path" — it's a fallback mechanism for custom/local plugins. The docs describe this as:

> "extra plugin files/dirs" (for paths you manually manage)

**Better:** Use `plugins.install` tracking so OpenClaw manages it:

```json
"plugins": {
  "installs": {
    "clawtext": {
      "source": "npm",
      "spec": "@openclaw/clawtext@1.4.0"
    }
  }
}
```

### Issue 2: No `plugin.installs` Tracking

The docs say:

> `plugins update` only works for npm installs tracked under `plugins.installs`.  
> If stored integrity metadata changes between updates, OpenClaw warns and asks for confirmation.

**Current:** We have no version/integrity tracking. Users can't run `openclaw plugins update clawtext`.

**Better:** When installed via `openclaw plugins install @openclaw/clawtext`, this is automatic.

### Issue 3: Plugin Should Be on NPM

**Current:** Users must `git clone https://github.com/ragesaq/clawtext.git`

**Better:** Package as `@openclaw/clawtext` on npm, then users run:
```bash
openclaw plugins install @openclaw/clawtext
```

---

## The Fix

### Step 1: Package ClawText for NPM

Update `package.json`:

```json
{
  "name": "@openclaw/clawtext",
  "version": "1.4.0",
  "description": "Comprehensive memory platform for OpenClaw",
  "main": "dist/index.js",
  "exports": {
    ".": "./dist/index.js"
  },
  "openclaw": {
    "extensions": ["./dist/index.js"],
    "skills": ["./docs"]
  }
}
```

Publish to npm:
```bash
npm publish
```

### Step 2: Update Installation Instructions

**Old README:**
```bash
git clone https://github.com/ragesaq/clawtext.git ~/.openclaw/workspace/skills/clawtext
cd ~/.openclaw/workspace/skills/clawtext
npm install
npm run build
```

**New README:**
```bash
openclaw plugins install @openclaw/clawtext
```

That's it. OpenClaw handles:
- ✅ Downloading from npm
- ✅ Extracting to `~/.openclaw/extensions/clawtext/`
- ✅ Running `npm install --ignore-scripts`
- ✅ Registering in `plugins.installs`
- ✅ Enabling in `plugins.entries`

### Step 3: Update Configuration Instructions

**Old (manual paths):**
```json
{
  "plugins": {
    "load": { "paths": ["~/.openclaw/workspace/skills/clawtext"] },
    "allow": ["clawtext"],
    "entries": { "clawtext": { "enabled": true, ... } }
  }
}
```

**New (after `openclaw plugins install`):**
```json
{
  "plugins": {
    "entries": {
      "clawtext": {
        "enabled": true,
        "memorySearch": {
          "sync": { "onSessionStart": true },
          "maxMemories": 5,
          "minConfidence": 0.70
        },
        "clusters": {
          "rebuildInterval": "0 2 * * *",
          "validationThreshold": 0.70
        }
      }
    }
  }
}
```

No `load.paths`, no `allow` needed (OpenClaw handles it).

### Step 4: Enable Updates

Users can now run:
```bash
openclaw plugins update clawtext
openclaw plugins update --all
```

---

## What to Change in ClawText README

### Current Installation Section

```markdown
## Installation

### Manual Installation
[git clone instructions...]
```

### Should Be

```markdown
## Installation

### Quick Start
```bash
openclaw plugins install @openclaw/clawtext
```

That's it! OpenClaw handles the rest.

### Agent-Assisted Setup
[Reference AGENT_SETUP.md for guided installation...]

### Manual / Dev Installation
For development or local testing:
```bash
openclaw plugins install -l ./path/to/clawtext
```

Or clone for modifications:
```bash
git clone https://github.com/ragesaq/clawtext.git
cd clawtext
npm install
npm run build
openclaw plugins install -l .
```
```

---

## Checklist: What Needs to Happen

- [ ] Update `package.json` with `@openclaw/clawtext` name + `openclaw` field
- [ ] Publish to npm: `npm publish`
- [ ] Update README.md Installation section (new instructions above)
- [ ] Update AGENT_SETUP.md to use `openclaw plugins install` instead of `git clone`
- [ ] Remove manual `plugins.load.paths` configuration from examples
- [ ] Add note about `openclaw plugins update clawtext` capability
- [ ] Test: `openclaw plugins install @openclaw/clawtext` should work end-to-end
- [ ] Verify: `openclaw plugins list` shows ClawText as installed
- [ ] Verify: `openclaw plugins update clawtext` can check for updates

---

## Why This Matters

**Current approach:**
- Manual file management
- No version tracking
- Users must understand git + npm
- Updates require manual re-cloning
- Doesn't align with OpenClaw plugin ecosystem

**Recommended approach:**
- Single command installation
- Automatic version tracking
- OpenClaw manages the lifecycle
- Easy updates (`openclaw plugins update`)
- First-class plugin ecosystem member

The OpenClaw docs are very explicit: use the plugin CLI, not manual paths. We should follow that guidance.

---

## Timeline

This is a one-time fix (now that v1.4.0 is stable):

1. Update package.json (~5 min)
2. Publish to npm (~5 min)
3. Update docs (~15 min)
4. Test (~10 min)

**Total:** ~35 minutes, then users have the seamless experience the plugin system intended.

