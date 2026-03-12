# ClawHub Metadata Examples

`clawhub.json` files that describe skills for ClawHub discovery.

---

## Gold Standard Post — clawhub.json

```json
{
  "name": "gold-standard-post",
  "version": "0.1.0",
  "title": "Gold Standard Post",
  "description": "Reusable product storytelling skill. Turn proven artifacts into templates. Generate READMEs, GitHub posts, Discord briefs, and showcase content from a seed.",
  "author": "OpenClaw Assistant",
  "license": "MIT",
  "repository": "https://github.com/openclaw/gold-standard-post",
  "categories": ["documentation", "writing", "product"],
  "keywords": ["writing", "product-storytelling", "readme", "github", "discord"],
  "features": [
    "Seed-based template system (start from proven artifacts)",
    "Five output modes: README, GitHub post, Discord, Discord brief, Showcase",
    "Automatic length calibration (utility vs platform products)",
    "Narrative spine framework: Problem → Solution → Examples → Impact",
    "Composable with ClawText, thread-bridge, and other skills"
  ],
  "documentation": {
    "quick_start": "README.md",
    "templates": "templates/",
    "examples": "examples/",
    "skill_definition": "SKILL.md",
    "bootstrap": "AGENT_BOOTSTRAP.md"
  },
  "tags": [
    "alpha",
    "v0.1.0",
    "writing",
    "product-marketing",
    "experimental"
  ],
  "tested": false,
  "maintained": true,
  "author_contact": "https://github.com/ragesaq",
  "companion_skills": [
    "clawbridge",
    "clawtext"
  ]
}
```

---

## ClawBridge — clawhub.json

```json
{
  "name": "clawbridge",
  "version": "0.9.0",
  "title": "ClawBridge",
  "description": "Preserve working context when conversations move across threads, forums, and agents. One command transfers active work without losing decisions.",
  "author": "OpenClaw Assistant",
  "license": "MIT",
  "repository": "https://github.com/ragesaq/clawbridge",
  "categories": ["continuity", "transfer", "documentation"],
  "keywords": ["context", "threads", "transfer", "handoff", "continuity"],
  "features": [
    "Automatic context extraction from Discord threads",
    "Three artifact types: short summary, full packet, agent bootstrap",
    "One-command transfer: read source, generate artifacts, post to destination",
    "Optional integration with ClawText for long-term memory promotion",
    "Lane-aware context preservation (product, team, project)"
  ],
  "documentation": {
    "quick_start": "README.md",
    "quickstart": "QUICKSTART.md",
    "integration": "INTEGRATION.md",
    "skill_definition": "SKILL.md"
  },
  "tags": [
    "production-ready",
    "v0.9.0",
    "tested",
    "cli-tool",
    "discord-integration"
  ],
  "tested": true,
  "maintained": true,
  "author_contact": "https://github.com/ragesaq",
  "compatibility": {
    "minNode": "16.0.0",
    "platforms": ["linux", "macos", "windows"],
    "type": "skill"
  }
}
```

---

## ClawSaver — clawhub.json

```json
{
  "name": "clawsaver",
  "version": "1.0.0",
  "title": "ClawSaver",
  "description": "Session-level message batching reduces model API costs by 20–40%. Transparent, observable, production-ready. Zero configuration needed.",
  "author": "OpenClaw Contributors",
  "license": "MIT",
  "repository": "https://github.com/openclaw/clawsaver",
  "homepage": "https://github.com/openclaw/clawsaver",
  "categories": ["optimization", "cost-reduction", "performance"],
  "keywords": ["batching", "cost-reduction", "token-optimization", "model-efficiency"],
  "features": [
    "Automatic session-level message batching",
    "Three pre-tuned profiles: Balanced, Aggressive, Real-Time",
    "Built-in observability and metrics",
    "Zero external dependencies (4.2 KB)",
    "10/10 unit tests, production-ready"
  ],
  "documentation": {
    "quick_start": "README.md",
    "setup": "QUICKSTART.md",
    "integration": "INTEGRATION.md",
    "overview": "SUMMARY.md",
    "decision_record": "DECISION_RECORD.md"
  },
  "tags": [
    "production-ready",
    "v1.0.0",
    "tested",
    "zero-dependencies",
    "observable"
  ],
  "tested": true,
  "maintained": true,
  "author_contact": "https://github.com/openclaw",
  "metrics": {
    "expectedCostSavings": "20-40%",
    "expectedLatency": "+800ms (tunable)",
    "codeSize": "4.2 KB",
    "dependencies": 0
  },
  "compatibility": {
    "minNode": "16.0.0",
    "type": "agent-utility"
  }
}
```

---

## How to Generate From Your Seed

**From ClawBridge seed:**
- Extract: "Preserve working context when conversations move"
- Create description: "Preserve working context... transfers active work"
- Extract features: "Three artifact types", "one-command transfer", "lane-aware"
- Categories: ["continuity", "transfer"]

**From ClawSaver seed:**
- Extract: "Cut model API costs 20–40%"
- Create description: "Session-level batching reduces costs... transparent, observable"
- Extract features: "Automatic batching", "three profiles", "zero dependencies"
- Categories: ["optimization", "cost-reduction"]

---

## Publishing Your Skill (Optional)

You can keep `clawhub.json` in your repo for internal discovery without publishing to ClawHub:

```bash
# 1. Make sure it's in your skill root directory
ls -la clawhub.json  # should exist

# 2. Commit and push
git add clawhub.json
git commit -m "chore: Add ClawHub metadata"
git push origin main

# 3. (Optional) Register on ClawHub if you want public discovery
clawhub publish ./clawhub.json
# or via web: https://clawhub.com/publish
```

If you don't publish, the metadata still exists in your repo for tooling/discovery but won't appear in the public ClawHub registry.
