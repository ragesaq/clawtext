# Gold Standard Post Skill — Agent Bootstrap

**Read this first if you're an agent picking up this skill.**

---

## What This Skill Is

**Gold Standard Post** turns your best product writing into a reusable template. Instead of starting from scratch every time you launch a product, you start from a **proven seed artifact** and adapt it.

**Think of it like:** Having a "gold standard" README that you've perfected. Now you can replicate that structure for every new product without manually recreating it.

---

## Key Files

| File | Purpose |
|------|---------|
| `SKILL.md` | Formal skill definition (read this for full workflow) |
| `README.md` | Product-facing documentation (what users see) |
| `seeds/clawtext-seed.md` | The gold-standard seed (extracted from ClawText README) |
| `templates/*.md` | Output mode templates (README, GitHub, Discord, Showcase) |
| `examples/clawsaver-example.md` | Example of seed → final product post |

---

## How to Use This Skill (Alpha)

### Step 1: Pick or Create a Seed
```bash
# Use existing seed
cp seeds/clawtext-seed.md seeds/my-product-seed.md

# Or create from your best artifact
# (copy your best README/post, replace content with [PLACEHOLDER] markers)
```

### Step 2: Fill in the Placeholders
Edit `seeds/my-product-seed.md`:
- `[Product Name]` → Your product name
- `[One-line descriptor]` → What it does
- `[X.Y.Z]` → Version
- `[Alpha/Beta/Production]` → Status
- `[Problem framing]` → Describe the pain
- `[Features]` → What your product does
- `[Examples]` → Copy-paste ready commands

### Step 3: Choose Output Mode
- **README** (default) — Full GitHub README, 2-4 KB
- **GitHub Post** — Condensed announcement, 1-2 KB
- **Discord** — Channel update, 0.5-1 KB
- **Showcase** — Story-first, personal tone, 1-2 KB

### Step 4: Review Against the Narrative Spine
Every gold-standard post should have:
1. ✅ Problem framing (make reader feel the pain)
2. ✅ Solution introduction (clear value prop)
3. ✅ Deep dive (organized detail with examples)
4. ✅ Quick start (copy-paste ready)
5. ✅ Why this exists (close on impact)

---

## What Makes a Good Seed

**Good seeds:**
- Are **real artifacts** (not templates)
- Have a clear **narrative arc** (problem → solution → impact)
- Include **concrete examples** (code, commands, scenarios)
- Teach the **why** not just the **what**

**Bad seeds:**
- Are just feature lists
- Start with "This is a tool that..." (no problem framing)
- Have no examples or use cases
- Are internal notes or raw logs

---

## Composing with Other Skills

This skill works alongside:

| Skill | How to Combine |
|-------|----------------|
| **ClawText** | Store generated artifacts in knowledge ingest; use operational learning to track which framing works best |
| **thread-bridge** | Post new product announcements to Discord with full context handoff |
| **clawsaver** | Batch multiple product-writing tasks together |

---

## Current Limitations (Alpha)

- **Manual process** — no automated seed-to-output pipeline yet
- **Single seed** — only one reference artifact (ClawText README)
- **No validation** — no automated quality checks

---

## Your First Task (If Assigned)

1. Read `SKILL.md` (full workflow)
2. Read `examples/clawsaver-example.md` (see seed → final transformation)
3. Pick a product you're working on
4. Either:
   - Use `seeds/clawtext-seed.md` as your starting point, OR
   - Find a better seed artifact from your workspace
5. Fill in the placeholders
6. Choose an output mode
7. Review against the narrative spine checklist

---

## Questions to Ask Yourself

- Does this teach the problem before the solution?
- Are the examples copy-paste ready?
- Does it end on impact (not features)?
- Would someone understand what this is in 30 seconds?
- Is the value prop clear in the first paragraph?

---

**Next:** Read `SKILL.md` for the complete workflow and `README.md` for the product documentation.
