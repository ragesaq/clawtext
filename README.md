# ClawText

**Durable memory and continuity for OpenClaw agents — so your work continues where it left off instead of starting over.**

---

🧠 **Working memory** &nbsp;·&nbsp; 📦 **Durable artifacts** &nbsp;·&nbsp; 🔁 **Continuity across sessions** &nbsp;·&nbsp; 📖 **Operational learning**

---

## The problem

Long-running agent work breaks down at context boundaries.

Decisions scatter across old sessions, docs, repos, failures, and handoffs. The result is predictable:
- the same questions get asked again
- the same mistakes get repeated
- every session switch feels like starting from scratch
- useful work has to be reconstructed instead of resumed

## What ClawText is

ClawText is a layered memory and continuity system for OpenClaw agents.

It gives agents three practical capabilities:

| Capability | What it does |
|---|---|
| 🧠 **Working memory** | Surfaces relevant prior decisions, docs, and patterns at prompt time |
| 📦 **Durable memory** | Preserves decisions, docs, handoffs, and operational history across sessions |
| 🔁 **Continuity artifacts** | Packages work for clean handoff across sessions, threads, and recovery flows |

## What you get

- **Context already in place** — agents start sessions with relevant prior work surfaced, not cold state
- **Less repeated explanation** — prior decisions and rationales survive session switches
- **Operational learning** — repeated failures and successful workflows become reusable guidance automatically
- **Structured handoffs** — work moves cleanly to another session, surface, or agent without reconstruction

This is not just memory search. It is a system for making previously earned context usable again.

## A quick example

An agent spends an hour debugging a workflow, finds the real fix, and captures the result.

Later, the work resumes in a different session.

Without ClawText, the next session repeats the same dead ends.  
**With ClawText, the prior decision path, useful patterns, and handoff context are already in place.**

## Install

```bash
openclaw plugins install @openclaw/clawtext
```

## Verify

```bash
openclaw plugins list
openclaw hooks list
openclaw cron list
```

ClawText activates automatically. Your first agent run starts capturing context, building daily memory, and preparing future retrieval — no heavy setup required.

## Typical use cases

- Reduce repetitive questions across long-running workflows
- Preserve continuity when work moves between sessions or threads
- Make team docs and repos queryable during agent execution
- Turn repeated failure patterns into persistent operational guidance

## Who it is for

ClawText is for operators and teams running long-lived OpenClaw workflows who want:
- stronger continuity across session boundaries
- better memory reuse without manual prompting
- durable operational learning from real agent execution

## Boundaries

ClawText owns **memory capture, retrieval, and continuity packaging**.

It is not a hidden long-context replacement, a general-purpose vector database, or a full identity platform. Discord and forum execution semantics are outside its scope.

## Learn more

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — system design
- [`docs/NORTHSTAR.md`](docs/NORTHSTAR.md) — product definition and principles
- [`docs/MILESTONES.md`](docs/MILESTONES.md) — delivery and value history
- [`docs/OPERATIONAL_LEARNING.md`](docs/OPERATIONAL_LEARNING.md) — operational lane details
