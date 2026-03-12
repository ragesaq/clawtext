# ClawHub Publishing Scripts

Automate the journey from seed artifact → clawhub.json → Git commit → ClawHub publication.

---

## Quick Start

### Dry Run (Test First)
```bash
cd ~/.openclaw/workspace/skills/gold-standard-post

# Test the entire workflow without making changes
node scripts/full-publish.js ../../repo/clawbridge
```

You'll see:
```
[START] Gold Standard Post → ClawHub Full Workflow
[MODE] 🔍 DRY RUN (no actual changes)

[STEP 1] Validating skill at /path/to/clawbridge
[STEP 1] ✓ All required files present

[STEP 2] Reading seed metadata from package.json and README.md
[STEP 2] ✓ Extracted metadata:
         name: clawbridge
         version: 0.9.0
         description: Preserve working context when conversations move...

[STEP 3] Generating clawhub.json
[STEP 3] ✓ Generated clawhub.json

[STEP 4] Committing clawhub.json to git
[STEP 4] [DRY RUN] Would commit: "chore: Add ClawHub metadata for v0.9.0"

[STEP 5] Publishing to ClawHub
[STEP 5] [DRY RUN] Would execute: clawhub publish /path/to/clawbridge

[DONE] ✅ Publishing workflow complete
[NEXT] Run with --no-dry-run to actually publish to ClawHub
```

### Actual Publish
```bash
# When you're ready to go live:
node scripts/full-publish.js ../../repo/clawbridge --no-dry-run
```

---

## Scripts

### `full-publish.js` — Complete Workflow
The main script. Does everything in one go:

1. ✅ Validates skill structure (required files)
2. ✅ Extracts metadata from seed (package.json, README.md)
3. ✅ Generates `clawhub.json`
4. ✅ Commits to Git (optional)
5. ✅ Publishes to ClawHub

**Usage:**
```bash
node scripts/full-publish.js <skill-path> [--no-dry-run] [--no-git]
```

**Options:**
- `--no-dry-run` — Actually publish (default is dry run)
- `--no-git` — Skip git commit/push (publish only)

**Example:**
```bash
# Dry run (safest)
node scripts/full-publish.js ../../repo/clawbridge

# Live publish with git
node scripts/full-publish.js ../../repo/clawbridge --no-dry-run

# Live publish without git
node scripts/full-publish.js ../../repo/clawbridge --no-dry-run --no-git
```

---

### `publish-to-clawhub.js` — Direct ClawHub Publisher
If you already have `clawhub.json` and just want to publish:

**Usage:**
```bash
node scripts/publish-to-clawhub.js <skill-path> [--no-dry-run] [--no-auth]
```

**Example:**
```bash
# Just publish the skill (assume clawhub.json exists)
node scripts/publish-to-clawhub.js ../../repo/clawbridge --no-dry-run
```

---

## Workflow Breakdown

### Step 1: Validate
Checks that the skill has all required files:
- `SKILL.md`
- `README.md`
- `package.json`

If any are missing, the script stops and tells you what's missing.

### Step 2: Extract Metadata
Reads:
- **name** from `package.json`
- **version** from `package.json`
- **description** from `package.json` or first paragraph of README.md
- **repository** from git remote (auto-detected)

Generates minimal but complete `clawhub.json`.

### Step 3: Generate clawhub.json
Writes a new `clawhub.json` with extracted metadata:
```json
{
  "name": "clawbridge",
  "version": "0.9.0",
  "title": "ClawBridge",
  "description": "Preserve working context when conversations move...",
  "author": "OpenClaw Assistant",
  "license": "MIT",
  "repository": "https://github.com/ragesaq/clawbridge",
  "categories": ["utility", "skill"],
  "keywords": ["clawbridge"],
  "tags": ["production-ready", "v0.9.0", "tested"],
  "tested": true,
  "maintained": true
}
```

You can manually edit this if you want richer metadata.

### Step 4: Commit to Git
```bash
git add clawhub.json
git commit -m "chore: Add ClawHub metadata for v0.9.0"
git push origin main
```

(Skipped if `--no-git` is passed)

### Step 5: Publish to ClawHub
```bash
clawhub publish /path/to/clawbridge --no-input
```

---

## Authentication

You must be logged in to ClawHub to publish:

```bash
clawhub login
# Opens browser for OAuth, or stores token

clawhub whoami
# Verify you're authenticated
```

---

## Common Workflows

### Publishing a New Skill
```bash
# 1. Make sure package.json is correct
cat clawbridge/package.json | grep -E '"(name|version|description)"'

# 2. Dry run
node scripts/full-publish.js ../../repo/clawbridge

# 3. If dry run looks good, publish
node scripts/full-publish.js ../../repo/clawbridge --no-dry-run
```

### Updating an Existing ClawHub Skill
```bash
# Just bump version in package.json and README, then:
node scripts/full-publish.js ../../repo/clawbridge --no-dry-run

# The script auto-detects the new version and updates ClawHub
```

### Publishing Without Git
```bash
# If you're in a headless environment or don't want to commit:
node scripts/full-publish.js ../../repo/clawbridge --no-dry-run --no-git
```

### Manual clawhub.json Only
```bash
# Just generate the JSON without publishing:
node scripts/full-publish.js ../../repo/clawbridge --no-git

# Now edit clawhub.json manually
vim ../../repo/clawbridge/clawhub.json

# Then publish when ready
clawhub publish ../../repo/clawbridge --no-input
```

---

## Troubleshooting

### "Missing required file: SKILL.md"
Make sure you're pointing to the skill root directory, not a subdirectory.

### "Not authenticated"
Run `clawhub login` first.

### "clawhub: command not found"
Install it: `npm install -g clawhub`

### "Git operation skipped"
The script tried to commit but something failed. Check git status:
```bash
cd ../../repo/clawbridge
git status
```

---

## How It Integrates with Gold Standard Post

The publishing scripts are part of the Gold Standard Post skill workflow:

1. **Seed artifact** → (you write)
2. **Output modes** → (Gold Standard Post generates README, GitHub post, Discord brief, etc.)
3. **clawhub.json** → (Gold Standard Post extracts metadata + these scripts generate)
4. **Publish** → (these scripts automate the entire flow)

Result: From seed to ClawHub publication in one command.

---

## Advanced: Custom Metadata

After running `full-publish.js`, you can manually edit `clawhub.json` to add richer metadata:

```json
{
  "categories": ["continuity", "transfer", "documentation"],
  "keywords": ["context", "threads", "transfer", "handoff"],
  "features": [
    "Automatic context extraction",
    "Three artifact types",
    "One-command transfer"
  ],
  "documentation": {
    "quick_start": "README.md",
    "integration": "INTEGRATION.md",
    "examples": "examples/"
  },
  "metrics": {
    "latency_ms": 100
  }
}
```

Then publish:
```bash
clawhub publish ../../repo/clawbridge --no-input
```

---

**Summary:** Use `full-publish.js` for the automated end-to-end workflow. Use `publish-to-clawhub.js` if you already have a `clawhub.json`.
