# ClawText — Holistic Memory System for OpenClaw

**Version:** 1.3.0 | **Status:** Production

ClawText is the holistic memory platform for OpenClaw. It captures, retrieves, curates, and maintains memory for AI agents — without letting `MEMORY.md` become a dumping ground.

## Quick Install

```bash
git clone https://github.com/ragesaq/clawtext.git ~/.openclaw/workspace/skills/clawtext
cd ~/.openclaw/workspace/skills/clawtext
npm install
npm run build
```

Or use the automated installer:
```bash
npm run install-deps
```

## Features

- **Hot Memory Cache** — Tiny fast lane (300 items, self-warming)
- **Multi-Agent Memory** — Shared/private/cross-agent visibility
- **Session Continuity** — Persist context across sessions
- **CLI** — `npm run memory -- add/search/list/stats`
- **Health Reports** — Self-tuning with recommendations
- **Auto-Dedupe** — Prevents template duplicates

## CLI Commands

```bash
npm run memory -- add "Memory content" --type decision --project myproject
npm run memory -- search "query" --shared
npm run memory -- stats
npm run health
npm run cache:stats
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Multi-Agent](docs/MULTI_AGENT.md)
- [Curation](docs/CURATION.md)
- [Testing](docs/TESTING.md)

## GitHub

https://github.com/ragesaq/clawtext