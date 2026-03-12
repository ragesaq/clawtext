# ClawHub Metadata Mode Template

Use this to generate a `clawhub.json` file for registering your skill on ClawHub.

## Instructions
1. Start with your seed artifact (the product details)
2. Extract key information: name, description, version, features, categories
3. Fill in the metadata fields below
4. Save as `clawhub.json` in your skill root directory

## Target Format
JSON metadata file (~2-4 KB) that describes the skill for ClawHub discovery.

## Key Fields to Extract from Your Seed

| Field | Source | Example |
|-------|--------|---------|
| `name` | Product name (lowercase, no spaces) | `clawbridge` |
| `title` | Product display name | `ClawBridge` |
| `version` | From package.json or SKILL.md | `0.9.0` |
| `description` | One-liner from seed | `Preserves active work across threads without losing context` |
| `author` | You or your org | `OpenClaw Assistant` |
| `license` | MIT / Apache / etc | `MIT` |
| `categories` | Type of skill (memory, utility, etc) | `["continuity", "transfer"]` |
| `keywords` | Searchable tags | `["context", "transfer", "threads"]` |
| `features` | Bullet list from README/SKILL.md | Array of 3-5 key features |
| `tags` | Status/maturity tags | `["production-ready", "v0.9.0", "tested"]` |

## Template

```json
{
  "name": "[product-name-lowercase]",
  "version": "[X.Y.Z]",
  "title": "[Product Title]",
  "description": "[One-liner value prop. Keep under 150 characters.]",
  "author": "[Your Name or Org]",
  "license": "MIT",
  "repository": "https://github.com/[org]/[repo]",
  "homepage": "https://github.com/[org]/[repo]",
  "categories": ["[category1]", "[category2]"],
  "keywords": ["[keyword1]", "[keyword2]", "[keyword3]"],
  "features": [
    "[Feature 1 - short description]",
    "[Feature 2 - short description]",
    "[Feature 3 - short description]"
  ],
  "documentation": {
    "quick_start": "README.md",
    "setup": "QUICKSTART.md",
    "integration": "INTEGRATION.md",
    "overview": "SKILL.md"
  },
  "tags": [
    "production-ready",
    "v[X.Y.Z]",
    "tested",
    "[status-tag]"
  ],
  "tested": true,
  "maintained": true,
  "author_contact": "https://github.com/[org]",
  "compatibility": {
    "minNode": "16.0.0",
    "type": "skill"
  }
}
```

## Real Examples

### ClawBridge (Minimal)
```json
{
  "name": "clawbridge",
  "title": "ClawBridge",
  "version": "0.9.0",
  "description": "Continuity + transfer skill for preserving active work across threads/posts/sessions with structured handoff packets.",
  "author": "OpenClaw Assistant",
  "license": "MIT",
  "repository": "https://github.com/ragesaq/clawbridge",
  "categories": ["continuity", "transfer"],
  "keywords": ["context", "threads", "transfer", "handoff"],
  "features": [
    "Automatic context preservation across threads",
    "Three artifact types: short summary, full packet, agent bootstrap",
    "CLI-based workflow with optional ClawText integration"
  ],
  "tags": ["production-ready", "v0.9.0", "tested"],
  "tested": true,
  "maintained": true
}
```

### ClawSaver (Full)
```json
{
  "name": "clawsaver",
  "version": "1.0.0",
  "title": "ClawSaver — Session Debouncer",
  "description": "Session-level message batching to reduce model API costs by 20–40%. Transparent, observable, and production-ready.",
  "author": "OpenClaw Contributors",
  "license": "MIT",
  "repository": "https://github.com/openclaw/clawsaver",
  "homepage": "https://github.com/openclaw/clawsaver",
  "categories": ["optimization", "performance"],
  "keywords": ["batching", "cost-reduction", "token-optimization"],
  "features": [
    "Automatic session-level message batching",
    "Configurable debounce profiles",
    "Built-in observability and metrics",
    "Zero external dependencies"
  ],
  "documentation": {
    "quick_start": "README.md",
    "setup": "QUICKSTART.md",
    "integration": "INTEGRATION.md"
  },
  "tags": ["production-ready", "v1.0.0", "tested"],
  "tested": true,
  "maintained": true,
  "metrics": {
    "expectedCostSavings": "20-40%",
    "expectedLatency": "+800ms"
  }
}
```

## Review Checklist

- [ ] Is the `description` under 150 characters?
- [ ] Are the `features` 3-5 items and each under 1 line?
- [ ] Do the `keywords` match your seed's searchable concepts?
- [ ] Does `version` match your package.json?
- [ ] Is `repository` the correct GitHub URL?
- [ ] Are `tags` realistic (is it really production-ready?)?
- [ ] Can someone discover this skill via the categories/keywords?

## Publishing to ClawHub

**Optional.** This metadata can live in your repo without being published to ClawHub.

If you do want to publish:

```bash
# 1. Commit to your repo
git add clawhub.json
git commit -m "chore: Add ClawHub metadata"
git push

# 2. Submit to ClawHub (optional)
clawhub publish ./clawhub.json

# Or via the web interface:
# https://clawhub.com/publish
```

Most teams just keep `clawhub.json` in the repo for self-discovery and skip the registry publish step.

## Optional: Metrics & Compatibility

Add these for more detailed discovery:

```json
{
  "performance": {
    "latency_ms": 7,
    "memory_mb": 8
  },
  "compatibility": {
    "minNode": "16.0.0",
    "type": "skill"
  },
  "companion_skills": ["clawtext-ingest"]
}
```

---

**Key principle:** ClawHub metadata should help users **discover** your skill. Make it searchable, honest about status, and clear about what it does.
