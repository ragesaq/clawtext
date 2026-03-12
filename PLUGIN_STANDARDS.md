# OpenClaw Plugin Development Standards

**Version:** 1.0  
**Status:** Active  
**Based on:** ClawText v1.4.1 implementation  

This document codifies the standard practices for developing OpenClaw plugins. Use this when building new skills/plugins to ensure consistency, installability, and agent-friendly workflows.

---

## Plugin Package Structure

### naming

- **Package name:** `@openclaw/{plugin-name}` (scoped to @openclaw on npm)
- **Repository:** `https://github.com/ragesaq/{plugin-name}`
- **Installation:** `openclaw plugins install @openclaw/{plugin-name}`

### package.json Requirements

```json
{
  "name": "@openclaw/{plugin-name}",
  "version": "X.Y.Z",
  "description": "Clear one-line problem statement + value proposition",
  "repository": {
    "type": "git",
    "url": "https://github.com/ragesaq/{plugin-name}.git"
  },
  "homepage": "https://github.com/ragesaq/{plugin-name}",
  "type": "module",
  "main": "dist/index.js",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "keywords": ["openclaw", "your-keywords"],
  "author": "ragesaq",
  "license": "MIT",
  "dependencies": {
    "openclaw": "^2026.3.1"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  },
  "openclaw": {
    "extensions": ["./dist/index.js"],
    "skills": ["./docs"]
  }
}
```

**Key fields:**
- `name`: Scoped to @openclaw, kebab-case
- `version`: Synchronized to release version (not separate package vs release versioning)
- `openclaw`: Plugin manifest (extensions + optional skills docs)
- `main` + `exports`: Point to compiled index.js

---

## Documentation Structure

### README.md — Gold Standard Post Level

**Calibration:**
- **System products** (complex, multi-feature): 1,500–2,000 words (3–4 KB)
- **Utility tools** (focused, single purpose): 500–600 words (0.5–1 KB)

**Structure (narrative spine, non-negotiable):**

1. **Problem statement** (50 words) — Why does this plugin exist? What pain does it solve?
2. **What it is** (50 words) — Elevator pitch + how it fits into OpenClaw
3. **What's new** (if applicable) (75 words) — Major features in this release
4. **Deep dive** (50% of word budget) — How each component works, with examples
5. **Safety/quality** (75 words) — Controls, threat models, design decisions
6. **Installation** (15% of word budget) — Quick start, what it does, verify, updates, agent paths
7. **Architecture** (optional, 10% of word budget) — Directory structure, key files
8. **Contributing** (optional, 5% of word budget) — How to extend or modify

**Integration pattern (for new features):**
- Don't create parallel "What's New" sections
- Weave features into existing sections (deep dive, architecture, etc.)
- Expand document if needed, don't compress existing sections

**Pointers not inline:**
- Link to AGENT_SETUP.md for setup workflows (don't put full workflow in README)
- Link to SKILL.md for formal definitions (don't duplicate)
- Link to detailed docs for edge cases
- Keep README focused on problem → solution → quick start

### SKILL.md — Formal Plugin Definition

```markdown
---
name: plugin-name
version: 1.4.1
category: [memory|automation|tools|etc]
keywords: [keyword1, keyword2]
description: One-line description
---

## What It Does

Detailed description of the plugin's purpose and scope.

## Installation

```bash
openclaw plugins install @openclaw/plugin-name
```

## Configuration

[Configuration schema and examples]

## Usage

[How to use it]

## Limits & Scope

[What it does NOT do]
```

### AGENT_SETUP.md — Agent-Assisted Workflow

**Sections:**
1. **Migration Path** (if replacing older version) — Detection + automated upgrade + manual steps
2. **Phase 1: Install** — Automated, what happens
3. **Phase 2: Configure** — Agent-led Q&A, tuning options
4. **Phase 3: Validate** — Health checks, troubleshooting
5. **Phase 4: Onboarding** — Next steps, optional workflows
6. **Phase 5: Documentation** — Agent creates local setup summary
7. **Troubleshooting** — Common issues + fixes

**Tone:** Agent talks to user, explains what's happening, asks questions when decisions matter

---

## Installation Workflow

### User-Facing Installation (Simple Path)

**One command:**
```bash
openclaw plugins install @openclaw/plugin-name
```

**What OpenClaw does:**
- Downloads from npm
- Extracts to `~/.openclaw/extensions/plugin-name/`
- Runs `npm install --ignore-scripts`
- Registers in `plugins.installs` config
- Enables in `plugins.entries`

### Agent-Led Installation (Full Path)

1. **Detect existing version** (if applicable)
2. **Offer migration** (preserve config/state during upgrade)
3. **Ask configuration questions** (tuning, options)
4. **Validate** (health checks, test queries)
5. **Document setup** (create local summary in memory/)
6. **Explain next steps** (what happens automatically, what user can do)

### Migration Pattern (for Plugin Updates)

**If upgrading from older manual installation:**

1. Install new version via plugin system
2. Preserve user config (copy old settings)
3. Verify both versions aren't loaded
4. Clean up old directory (optional)
5. Test end-to-end

**All in agent-led workflow** — user just says "upgrade me"

---

## Configuration & Tuning

### Configuration Structure

```json
{
  "plugins": {
    "entries": {
      "plugin-name": {
        "enabled": true,
        "setting1": "value",
        "setting2": {
          "nested": "config"
        }
      }
    }
  }
}
```

### Configuration Documentation Pattern

**In README.md:**
- Show default config (what works for 80% of users)
- One-liner tuning callout (conservative/balanced/aggressive presets)
- Link to AGENT_SETUP for full tuning guide

**In AGENT_SETUP.md:**
- Full tuning guide with presets + explanations
- How to measure and adjust
- Real-world effects of each parameter

### Defaults Matter

- Pick defaults that work for most users (don't make them tune first)
- Document why these are the defaults
- Make it easy to adjust (one config block)

---

## Version Management

### Versioning Scheme

- **package.json version** = **Release version** (synchronized, no separate numbering)
- Use semver: `MAJOR.MINOR.PATCH`
- Tag on GitHub: `v1.4.1`

### When to Increment

- **MAJOR (1.0.0 → 2.0.0):** Breaking changes to config, API, or installation
- **MINOR (1.4.0 → 1.5.0):** New features, backwards compatible
- **PATCH (1.4.0 → 1.4.1):** Bug fixes, docs, refactors (no new features)

### Publishing Workflow

```bash
# 1. Make changes, commit
git add . && git commit -m "..."

# 2. Increment version in package.json + README.md
# 3. Commit version bump
git commit -m "Bump version to X.Y.Z"

# 4. Tag release
git tag vX.Y.Z

# 5. Push
git push origin main --tags

# 6. Publish to npm
npm publish

# 7. Update ClawHub entry (if applicable)
# (manual step, handled separately)
```

---

## Agent Integration Points

### Agent Detection

- Plugin should expose health/status commands
- Agent can run validation: `openclaw plugins run {plugin-name} validate`
- Agent can check version: `npm view @openclaw/{plugin-name} version`

### Agent Workflow Hooks

**Installation:**
- Detect existing versions
- Offer migration
- Ask configuration questions
- Validate end-to-end

**Daily Operations:**
- Monitor for issues (via health checks)
- Offer tuning suggestions (if usage patterns detected)
- Suggest archival/cleanup (if applicable)

**Updates:**
- Notify when updates available
- Guide through upgrade
- Validate post-upgrade

### Documentation for Agents

**In AGENT_SETUP.md:**
- Assume agent is reading this
- Use conversational tone ("Agent tells user...", "Agent asks...")
- Provide exact commands agent should run
- Include error handling + troubleshooting

---

## Repository Hygiene

### Directory Structure

```
~/.openclaw/workspace/repos/{plugin-name}/   ← Git repository
│
├── package.json                             ← Scoped, versioned
├── tsconfig.json
├── README.md                                ← Gold Standard Post
├── SKILL.md                                 ← Formal definition
├── AGENT_SETUP.md                           ← Agent workflow
│
├── src/
│   ├── index.ts          ← Plugin entry
│   └── [your code]
│
├── dist/
│   └── index.js          ← Compiled output (gitignored)
│
└── docs/
    ├── ARCHITECTURE.md
    └── [detail docs]

~/.openclaw/workspace/state/{plugin-name}/prod/   ← Runtime state (NOT git-tracked)
│
├── cache/
├── logs/
└── metrics/
```

### Git Discipline

- **Tracked:** Source code, documentation, config schemas
- **NOT tracked:** `dist/`, `node_modules/`, runtime state, evaluation outputs
- Use `.gitignore` to exclude runtime artifacts

---

## Quality Checklist

Before publishing a plugin:

- [ ] Package name is `@openclaw/{name}` (scoped)
- [ ] Version in package.json matches README.md badge
- [ ] README.md follows Gold Standard Post structure (problem → solution → quick start)
- [ ] README stays within calibrated word count (500–2000 depending on type)
- [ ] SKILL.md exists with formal definition
- [ ] AGENT_SETUP.md exists with full workflow (install → configure → validate → onboarding)
- [ ] Installation via `openclaw plugins install @openclaw/{name}` works
- [ ] Config has sensible defaults (works without tuning)
- [ ] All docs link to each other (no orphaned sections)
- [ ] TypeScript builds cleanly (`tsc` ✅)
- [ ] Git repo is clean (no dist/, node_modules/ committed)
- [ ] GitHub tag created: `git tag vX.Y.Z && git push origin main --tags`
- [ ] npm publish tested (or ready to publish)

---

## Example Flow: New Plugin Launch

### Day 1: Setup & Documentation

```bash
# 1. Create repo structure
git clone https://github.com/ragesaq/my-plugin.git
cd my-plugin

# 2. Set up package.json with @openclaw scoping
# 3. Write README.md (problem → deep dive → quick start)
# 4. Write SKILL.md (formal definition)
# 5. Write AGENT_SETUP.md (agent workflow)
# 6. Build & test locally

npm install
npm run build
openclaw plugins install -l .  # test local install
```

### Day 2: Polish & Review

```bash
# 1. Review README spine (is it Gold Standard?)
# 2. Review AGENT_SETUP (can an agent follow it end-to-end?)
# 3. Verify installation workflow
# 4. Test agent-led setup (ask agent to install + configure)
```

### Day 3: Release

```bash
# 1. Increment version
# 2. Commit + tag
git tag v1.0.0
git push origin main --tags

# 3. Publish to npm
npm publish

# 4. Create GitHub release (optional)
# 5. Update ClawHub (if applicable)
```

---

## References

- **Canonical example:** ClawText v1.4.1 (commit: 5bf3ea3)
  - GitHub: https://github.com/ragesaq/clawtext
  - Installation: `openclaw plugins install @openclaw/clawtext`
  - Pattern: Memory system with ingest + operational learning

- **OpenClaw Docs:** https://docs.openclaw.ai/tools/plugin
- **Gold Standard Post:** `~/.openclaw/workspace/skills/gold-standard-post/`

---

## Updating This Standard

When implementing a new plugin:

1. If you discover a gap in this standard, document it
2. If you improve a pattern, add it back here
3. Review this document quarterly (or per major plugin release)
4. Keep standards evolving with real-world experience

---

**Last Updated:** 2026-03-12  
**Maintainer:** ragesaq + agent team
