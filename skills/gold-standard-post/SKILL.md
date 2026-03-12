# Gold Standard Post — Product Storytelling Skill

**Version:** 0.1.0-alpha | **Status:** Experimental | **Type:** Writing/Documentation Skill

> Turn high-quality product artifacts into reusable storytelling templates. Generate READMEs, GitHub posts, Discord announcements, and showcase content from a proven narrative spine.

---

## What This Skill Does

Most product writing is ad hoc — you start from scratch every time, hoping to recapture the structure that worked before. This skill **preserves the narrative DNA** of your best artifacts and makes it reusable.

**Input:** A "gold standard" seed artifact (e.g., your best README, post, or documentation) + product details  
**Output:** New product-facing content that inherits the proven structure, tone, and teaching arc

**Key properties:**
- **Seed-based** — starts from a real, proven artifact, not a blank template
- **Adaptable** — preserves narrative strengths while swapping in new content
- **Multi-surface** — README, GitHub post, Discord announcement, showcase
- **Filter-aware** — separates real product features from cleanup/platform spillover
- **Composable** — works alongside other skills (ClawText, thread-bridge, etc.)

---

## When to Use

**Use this skill when:**
- You have a high-quality artifact you want to replicate (e.g., "I wish every README looked like this one")
- You're launching a new product/skill and want strong first impressions
- You need to reframe existing work for a different audience (GitHub vs Discord vs docs)
- You want to turn a one-off writing effort into a repeatable process

**Don't use this skill when:**
- You're writing internal notes or raw logs (use daily memory files instead)
- You need quick-and-dirty documentation (just write it directly)
- The product is still in flux and structure will change anyway

---

## Narrative Spine (The "Gold" Pattern)

Every gold-standard post follows this structure, extracted from proven artifacts:

### 1. **Hook / Problem Framing** (teach the pain first)
```
> One-sentence value prop
> 
> ### The Problem
> Explain the pain in the reader's language. Use examples.
> Show the "before" state that makes them nod along.
```

**Why it works:** Readers don't care about your product until they feel the problem. This section makes them feel it.

### 2. **Solution Introduction** (clear value prop)
```
## What Is [Product]?
One-paragraph definition. What does it do? Why does it exist?
```

**Why it works:** After feeling the problem, they're ready for the solution. Keep it crisp.

### 3. **Deep Dive** (organized detail)
```
## How It Works / Features in Depth
Break into logical sections. Use tables, diagrams, code snippets.
Explain the "why" not just the "what."
```

**Why it works:** Readers who made it this far want to understand. Give them depth without overwhelming.

### 4. **Practical Examples** (show, don't tell)
```
## Quick Start / Examples
Copy-paste commands. Real scenarios. "Here's how you actually use this."
```

**Why it works:** Abstract descriptions don't stick. Concrete examples do.

### 5. **Why It Matters** (close with impact)
```
## Summary / Why This Exists
The bigger picture. What changes when you use this?
```

**Why it works:** End on the transformation, not the features.

---

## Output Modes

### README Mode (default)
- Full structure above
- Markdown with code blocks, tables, diagrams
- **Target length:** 500-1,000 words (0.5-2 KB) for utility tools; 1,500-2,500 words (3-4 KB) for system/platform products
- GitHub-friendly (no Discord-specific formatting)

**Calibration note:** Start with 50% of the narrative spine. Most products don't need full ecosystem context or 3-4 deep-dive sections. Simple tools (ClawBridge, ClawSaver) merit lean READMEs (500-600 words). System products (ClawText, OpenClaw) merit fuller treatment (1,500-2,000 words).

### GitHub Post Mode
- Condensed version of README
- Focus on hook + solution + quick start
- ~1-2 KB target
- Optimized for feed scanning

### Discord Announcement Mode
- Shorter, more conversational
- Bullet lists instead of tables (Discord formatting)
- ~0.5-1 KB target
- Emoji for visual breaks (use sparingly)

### Discord Brief Mode (Ultra-Short)
- Single paragraph or two, highly scannable
- Hook + problem + solution + link
- ~100-200 words (threadable, copy-paste to Discord post)
- Emoji + bold for emphasis only
- Use when you need to announce something in a single Discord message/thread post

### Showcase Mode
- Story-first, feature-second
- "Here's what I built and why it matters"
- ~1-2 KB target
- Personal tone, less formal

### ClawHub Metadata Mode
- Generates `clawhub.json` for ClawHub skill registry
- Extracts name, version, description, features, categories from seed
- ~2-4 KB JSON file
- Makes your skill discoverable on ClawHub

---

## Seed Artifact Format

The seed is a **real artifact** (not a template) with placeholders marked:

```markdown
# [Product Name] — [One-line descriptor]

**Version:** X.Y.Z | **Status:** [Alpha/Beta/Production] | **Type:** [Skill/Plugin/Tool]

> [One-sentence value prop — what makes this special]

---

## [Problem Framing Section Title]

### The Problem
[Describe the pain with concrete examples]

[Before/after comparison or code example]

---

## What Is [Product Name]?

[One-paragraph definition]

[Key properties table or bullet list]

---

## [Feature/Deep Dive Section]

[Detailed explanation with examples]

```bash
# Example command or code
```

---

## Quick Start

[Minimal setup steps]

```bash
# Copy-paste example
```

---

## Summary

[Closing impact statement]
```

**How to create a seed:**
1. Find your best existing artifact (e.g., ClawText's gold-standard README)
2. Replace product-specific content with `[PLACEHOLDER]` markers
3. Keep the structure, tone, and teaching arc intact
4. Save as `seeds/[product-name]-seed.md`

---

## How to Use This Skill

### Manual Process (Alpha)

1. **Select or create a seed artifact**
   ```bash
   # Use existing seed or copy a proven artifact
   cp skills/gold-standard-post/seeds/clawtext-seed.md seeds/my-product-seed.md
   ```

2. **Fill in the placeholders**
   - Product name, version, status
   - Problem framing (adapt to your audience)
   - Features and examples
   - Quick start commands

3. **Choose output mode**
   - README (default)
   - GitHub post (condensed)
   - Discord announcement (shorter)
   - Showcase (story-first)

4. **Review and refine**
   - Does it teach the problem first?
   - Is the value prop clear?
   - Are examples copy-paste ready?
   - Does it end on impact, not features?

### Agent-Assisted (Future)

When fully implemented, agents will:
- Detect when you're writing product-facing content
- Suggest using a gold-standard seed
- Auto-fill placeholders from your workspace context
- Generate multiple output modes from one seed

---

## Composing with Other Skills

This skill works alongside:

| Skill | How They Work Together |
|-------|----------------------|
| **ClawText** | Store generated artifacts in knowledge ingest; operational learning captures what framing works best |
| **thread-bridge** | Post new product announcements to Discord with full context handoff |
| **clawsaver** | Batch multiple product-writing tasks together |
| **self-improving-agent** | Learn from feedback on which product stories resonate |

---

## Current Limitations (Alpha)

- **Manual process** — no automated seed-to-output pipeline yet
- **Single seed** — only one reference artifact (ClawText README)
- **No validation** — no automated quality checks
- **Basic modes** — only 4 output modes defined
- **Length calibration** — Adjust based on product type (see README Mode target lengths above)

---

## Roadmap

**v0.2.0** — Add seed validation, multiple seed templates  
**v0.3.0** — Agent-assisted placeholder filling  
**v0.4.0** — Automated quality scoring (does this follow the narrative spine?)  
**v1.0.0** — Production release with full multi-surface support

---

## Files in This Skill

```
skills/gold-standard-post/
├── SKILL.md              # This file
├── README.md             # Product-facing documentation (generated from seed)
├── seeds/
│   ├── clawtext-seed.md  # Gold-standard seed artifact
│   └── [product]-seed.md # Additional seeds
├── templates/
│   ├── readme-mode.md    # README output template
│   ├── github-mode.md    # GitHub post template
│   ├── discord-mode.md   # Discord announcement template
│   └── showcase-mode.md  # Showcase story template
└── examples/
    └── [product]-example.md  # Completed examples
```

---

## Quick Reference

**When to use:** "I have a great artifact I want to replicate for a new product"  
**Seed location:** `skills/gold-standard-post/seeds/`  
**Output modes:** README, GitHub, Discord, Showcase  
**Narrative spine:** Problem → Solution → Deep Dive → Examples → Impact  
**Status:** Alpha (manual process, one seed)

---

*This skill turns great writing into a repeatable process. Start with a proven artifact, preserve its DNA, adapt for new products.*
