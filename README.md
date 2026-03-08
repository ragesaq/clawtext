# ClawText — Memory for AI Agents

**Version:** 1.3.0 | **Status:** Production

---

## What is Agent Memory?

When you talk to an AI, it doesn't remember your previous conversations. Each message is processed in isolation — like talking to someone with amnesia every time you chat.

**Without memory:**
- "Hey, remember that thing we discussed yesterday about the project?"
- "I don't know what you're talking about. This is our first conversation."

This works fine for quick Q&A. But for **AI agents** that work on complex projects, help with coding, manage workflows, or collaborate with other agents — memory is essential.

---

## Why Memory Matters for Agents

### The Problem: Agents Have No Continuity

An AI agent without memory:
- ❌ Forgets your project structure after each session
- ❌ Doesn't know your preferences (e.g., "I prefer dark mode")
- ❌ Can't learn from past mistakes
- ❌ Starts every conversation from zero
- ❌ Can't collaborate with other agents

### The Solution: Give Agents Memory

With a memory system, your agent can:

| Scenario | Without Memory | With Memory |
|----------|---------------|-------------|
| User returns tomorrow | "Who are you?" | "Welcome back! Here's where we left off..." |
| Agent makes a mistake | Same mistake again tomorrow | Remembers the error and avoids it |
| Team of agents working together | Each one is a stranger | They share context and collaborate |
| User has preferences | "How would you like me to format this?" every time | Remembers "User prefers dark mode, JSON output" |

---

## How ClawText Works

ClawText gives your OpenClaw agent a **smart memory system** that:

1. **Captures** important information from conversations
2. **Stores** it in the right place (fast access vs. long-term storage)
3. **Retrieves** relevant context when needed
4. **Curates** over time — promotes important memories, archives old ones
5. **Keeps things clean** — prevents the memory from becoming a mess

All automatically. Your agent just... remembers.

---

## Key Features

### 🔥 Hot Memory Cache
Fast access to recent, high-value memories. Sub-millisecond retrieval.

### 🤖 Multi-Agent Support
- **Shared** — Team knowledge visible to all agents
- **Private** — Sensitive notes only you can see
- **Cross-agent** — Send instructions to other agents

### 🔄 Session Continuity
Your agent remembers context from previous sessions — no more starting from zero.

### 💻 CLI for Agents
Fully programmable memory management:
```bash
npm run memory -- add "User prefers dark mode" --type preference
npm run memory -- search "user preferences"
npm run memory -- stats
```

### 🏥 Self-Tuning
The system monitors itself and tells you what to fix:
```bash
npm run health
# { "status": "healthy", "recommendations": [] }
```

---

## Quick Install

```bash
git clone https://github.com/ragesaq/clawtext.git ~/.openclaw/workspace/skills/clawtext
cd ~/.openclaw/workspace/skills/clawtext
npm install
npm run build
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — How the system works
- [Multi-Agent](docs/MULTI_AGENT.md) — Team collaboration features
- [Curation](docs/CURATION.md) — How memory is maintained
- [Testing](docs/TESTING.md) — Verify your installation

## GitHub

https://github.com/ragesaq/clawtext