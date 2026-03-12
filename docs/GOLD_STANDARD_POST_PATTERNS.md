# Gold Standard Post Patterns

Reusable patterns for high-quality product READMEs, product announcements, and documentation.

**Goal:** Maintain consistency across products while allowing flexibility for product-specific needs.

---

## Core Structure

Every Gold Standard Post should have:

1. **Header** — Title, version, status
2. **Problem Statement** — Why this exists (with concrete example)
3. **Solution Overview** — What it does, high-level
4. **Architecture/Features** — Deep dive into lanes, tiers, or components
5. **Installation/Getting Started** — Copy-paste ready
6. **Version History Table** — Evolution at a glance
7. **Repository/Links** — Where to find it

---

## Pattern 1: Version History Table

**When to use:** System products (ClawText, platforms, large skills)

**Structure:**

```markdown
## Version History

| Version | What Changed |
|---------|-------------|
| **1.5.0** | New feature. Enhancement description. Optional setup impact. |
| **1.4.0** | Major feature lane. Breaking changes. New capabilities. |
| 1.3.0 | Optimization, tooling, pattern refinement |
| 1.2.0 | Architecture component, data structure |
| 1.1.0 | Multi-source support, pipeline |
| 1.0.0 | Initial release — core capability |
```

**Key principles:**
- Bold the most recent 2–3 versions (highlight what's new/important)
- Include **only major features** per version (not bug fixes or internal refactors)
- Keep descriptions scannable (15–20 words max per row)
- Show the evolution: foundation → incremental improvements → major features
- Include breaking changes or setup impact notes if relevant

**Why it works:**
- Gives users immediate sense of product maturity
- Shows what changed between versions without reading full changelog
- Helps new users understand if their use case appeared in a recent release
- Acts as a mini-roadmap showing what was prioritized over time

---

## Pattern 2: Problem Statement + Example

**When to use:** All products (especially important for new/unfamiliar concepts)

**Structure:**

```markdown
## How It Works

### The Problem

[Concrete scenario showing why this exists]

```
Without feature:
[Bad outcome with specific numbers/details]

With feature:
[Good outcome]
```

### Why This Matters

[Impact statement — what becomes possible]
```

**Key principles:**
- Use a real, relatable example (Caesar's military victories, agent memory loss, etc.)
- Show before/after with concrete details
- Keep it under 5 sentences + 1 code example
- Don't assume technical background

**Why it works:**
- Immediately shows ROI (why should I care?)
- Grounds abstract concepts in reality
- Helps readers quickly assess fit for their use case

---

## Pattern 3: Tiered Architecture Diagram

**When to use:** Multi-lane or layered systems (ClawText, platforms)

**Structure:**

```markdown
## Architecture: Three Lanes

| Lane | What It Does | Why It Matters |
|------|-------------|----------------|
| **Lane 1** | Concrete responsibility | User benefit |
| **Lane 2** | Concrete responsibility | User benefit |
| **Lane 3** | Concrete responsibility | User benefit |

Diagram (ASCII or text representation):
```
[Layer/flow visual]
```
```

**Key principles:**
- Use a table to make responsibilities scannable
- Show the flow/relationship between lanes
- Include a simple visual (ASCII art, text diagram, or flow chart)
- Explain why separation matters (performance, maintainability, etc.)

**Why it works:**
- Makes complex systems immediately understandable
- Shows separation of concerns
- Helps users understand which lane applies to their use case

---

## Pattern 4: What's New Section

**When to use:** Major version releases (v1.0 → v2.0, or significant features)

**Structure:**

```markdown
## What's New in v1.5.0

### Feature Name

One-line description.

**Why it matters:**
- Benefit 1
- Benefit 2

**Quick example:**
[Copy-paste ready code or usage]

### Another Feature

...
```

**Key principles:**
- One section per major feature or enhancement
- Always include "why it matters" (not just what)
- Provide immediate usage example
- Link to full docs for deep dives (don't duplicate)
- Keep each feature section under 200 words

**Why it works:**
- Shows what changed and why you should care
- Gives immediate way to try it
- Doesn't duplicate docs (links instead)

---

## Pattern 5: Installation + Agent-Assisted Setup

**When to use:** All installable products

**Structure:**

```markdown
## Installation

### Quick Start (Manual)

```bash
# Copy-paste ready
git clone <repo>
cd <name>
npm install
npm run build
```

### Agent-Assisted Setup (Recommended)

For full configuration guidance and custom tuning:
[Link to AGENT_SETUP.md or similar]

Agent walks through:
- Installation verification
- Configuration options (presets, if applicable)
- Initial tuning
- Testing
```

**Key principles:**
- Provide manual path (simple, self-contained)
- Offer agent-assisted path for complex setup
- Default to manual unless significant complexity
- Make both paths discoverable

**Why it works:**
- Supports different user preferences
- Agents can handle nuance; docs can stay simple
- Reduces friction for quick installs
- Provides guidance for users who want it

---

## Pattern 6: Role-Based Documentation Map

**When to use:** Complex systems with multiple audiences

**Structure:**

```markdown
## Using This Docs

**I want to...**

- **Get started quickly** → README (this file) + QUICKSTART.md
- **Understand how it works** → ARCHITECTURE.md
- **Configure tuning** → HOT_CACHE.md + AGENT_SETUP.md
- **Troubleshoot** → TROUBLESHOOTING.md
- **Contribute** → CONTRIBUTING.md + source code
```

**Key principles:**
- Map user intent to specific docs
- Keep it short (5–10 entries max)
- Link to specific files, not generic "docs/"
- Be honest about doc depth

**Why it works:**
- Users find what they need without guessing
- Prevents overwhelm from massive docs
- Scales as doc set grows

---

## Calibration: Length by Product Type

| Type | Length | Example |
|------|--------|---------|
| **Utility tool** | 500–600 words | ClawSaver, small skills |
| **Medium product** | 800–1,200 words | Bridges, integrations |
| **System product** | 1,500–2,500 words | ClawText, platforms |

**Rules:**
- Never compress core sections (problem, architecture, installation)
- Integrate new features into existing sections (don't add parallel "What's New" sections)
- Move migration/advanced config to separate docs (link from README)
- Scanability > completeness

---

## Quality Checklist

Before posting a Gold Standard Post:

- [ ] Problem statement is concrete and relatable (with example)
- [ ] Solution overview is clear in 2–3 sentences
- [ ] Architecture/features section shows all major components
- [ ] Installation is copy-paste ready (manual path, agent path optional)
- [ ] Version history table shows evolution (bold recent versions)
- [ ] All links work (docs, repo, examples)
- [ ] New features have "why it matters" + quick example
- [ ] Length matches product type calibration
- [ ] No jargon without explanation
- [ ] New agent can answer: What? Why? How? Next?

---

## Examples

**ClawText v1.5.0:**
- Problem statement: Caesar memory example ✅
- Three-lane architecture ✅
- What's New (v1.4.0 + v1.5.0) ✅
- Installation (manual + agent-assisted) ✅
- Version history table ✅

**ClawSaver v1.4.2:**
- Problem statement: API cost example ✅
- Usage example ✅
- Installation ✅
- Role-based doc map ✅
- (No version history table — too small)

---

## Extending This Pattern

As you use these patterns:
- Document new patterns you discover
- Note what works well
- Update calibration if needed
- Share learnings with the team

This is a living guide, not a rulebook.
