# Gold Standard Post — Product Storytelling Skill

**Version:** 0.1.0-alpha | **Status:** Experimental

> Turn high-quality product artifacts into reusable storytelling templates. Generate READMEs, GitHub posts, Discord announcements, and showcase content from a proven narrative spine.

---

## Quick Start

You have a great README or product post. You wish **every** product you launched looked that good. But you don't want to manually recreate the structure every time.

**Gold Standard Post** solves this by:
1. Taking your best artifact as a **seed**
2. Preserving its narrative structure, tone, and teaching arc
3. Letting you adapt it for new products without starting from scratch

### Install
```bash
# Clone the skill into your OpenClaw workspace
git clone https://github.com/your-org/gold-standard-post.git ~/.openclaw/workspace/skills/gold-standard-post
```

### Use It (Alpha - Manual)
```bash
# 1. Pick a seed (or create your own)
cp skills/gold-standard-post/seeds/clawtext-seed.md seeds/my-product-seed.md

# 2. Fill in the placeholders
# Edit seeds/my-product-seed.md with your product details

# 3. Choose your output mode
# - README (default)
# - GitHub post (condensed)
# - Discord announcement (shorter)
# - Showcase (story-first)

# 4. Review and publish
```

---

## The Problem This Solves

Most product writing is **ad hoc**. You spend hours crafting the perfect README or announcement post. It turns out great. Then you launch the next product and... start from scratch.

You remember "it should have a problem framing section" and "examples work well" but the **structure** slips. The **teaching arc** gets lost. You end up with inconsistent quality across your products.

**Gold Standard Post** turns that one-off effort into a **repeatable process**.

---

## How It Works

### The Seed Concept

Instead of a rigid template, you start from a **real artifact** — your best README, post, or documentation. This is your "gold standard."

**Example:** Your ClawText README worked really well. It had:
- A clear problem framing section
- A "how memory works" teaching arc
- Concrete examples with code
- A strong closing on why it matters

You extract that **structure** (not the content) and use it as a seed for future products.

### The Narrative Spine

Every gold-standard post follows this pattern:

```
1. Hook / Problem Framing
   → Make the reader feel the pain
   
2. Solution Introduction
   → Clear value prop
   
3. Deep Dive
   → Organized detail with examples
   
4. Quick Start
   → Copy-paste ready
   
5. Why This Exists
   → Close on impact
```

This isn't arbitrary. It's **extracted from proven artifacts** that worked.

### Output Modes

One seed, multiple surfaces:

| Mode | Use Case | Length |
|------|----------|--------|
| **README** | GitHub repos, full docs | 0.5-2 KB (utility tools) or 3-4 KB (platforms) |
| **GitHub Post** | Feed scanning, announcements | 1-2 KB |
| **Discord** | Channel updates, community | 0.5-1 KB |
| **Discord Brief** | Single-post announcement | 100-200 words |
| **Showcase** | Story-first, personal | 1-2 KB |
| **ClawHub Metadata** | Skill registry | `clawhub.json` (~2-4 KB) |

**Calibration:** Simple products (ClawBridge, ClawSaver) work better lean (~500-600 words). System products (ClawText) warrant fuller treatment (~1,500-2,000 words).

---

## When to Use

**✅ Use this skill when:**
- You have a high-quality artifact you want to replicate
- Launching a new product/skill
- Reframing existing work for a different audience
- Turning a one-off writing effort into a repeatable process

**❌ Don't use this skill when:**
- Writing internal notes or raw logs (use daily memory files)
- Need quick-and-dirty documentation
- The product is still in flux

---

## Files in This Skill

```
skills/gold-standard-post/
├── SKILL.md              # Formal skill definition
├── README.md             # This file (product documentation)
├── seeds/
│   ├── clawtext-seed.md  # Gold-standard seed from ClawText README
│   └── [product]-seed.md # Your custom seeds
├── templates/
│   ├── readme-mode.md    # README output template
│   ├── github-mode.md    # GitHub post template
│   ├── discord-mode.md   # Discord announcement template
│   └── showcase-mode.md  # Showcase story template
└── examples/
    └── [product]-example.md  # Completed examples
```

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

## Current Status (Alpha)

**What's working:**
- ✅ Seed artifact concept (ClawText README as reference)
- ✅ Narrative spine defined
- ✅ 4 output modes specified
- ✅ Manual process documented

**What's coming:**
- 🚧 Agent-assisted placeholder filling
- 🚧 Seed validation and quality scoring
- 🚧 Automated multi-mode generation
- 🚧 Multiple seed templates

---

## Examples

See `examples/` for completed product posts generated from the seed.

---

## Contributing

Want to add a new seed template? Follow these guidelines:

1. Start from a **real, proven artifact** (not a template)
2. Extract the **structure**, not the content
3. Mark placeholders clearly: `[LIKE THIS]`
4. Preserve the **narrative spine** (problem → solution → examples → impact)
5. Test with at least one real product before adding to the skill

---

## Summary

Gold Standard Post turns great writing into a **repeatable process**. Instead of starting from scratch every time, you start from a **proven seed** and adapt it for new products.

**Result:** Consistent quality, faster iteration, and product posts that actually teach.

**Install:** `git clone` into your OpenClaw skills directory  
**Start:** Read `SKILL.md` for the full workflow  
**Seed:** `seeds/clawtext-seed.md` (your starting point)
