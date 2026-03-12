# ClawBridge Extract — Full Continuity Packet

## Why this handoff exists
Transfer active work into a focused lane without losing high-context continuity.

## Current objective
Capture the relevant OpenClaw 2026.3.11 memory-system changes for the ClawText / memory architecture thread without dumping the entire release note.

## Established decisions
- OpenClaw 2026.3.11 adds Gemini memory-search support using gemini-embedding-2-preview, including configurable output dimensions and automatic reindexing when embedding dimensions change.
- OpenClaw 2026.3.11 also adds opt-in multimodal indexing for memorySearch.extraPaths, covering image and audio inputs with strict fallback gating.
- The memory lane changes are opt-in and do not force an automatic migration of the current text-first memory setup.
- The release also includes follow-up normalization fixes so Gemini embeddings are handled consistently across direct query, batch, and async batch paths.

## Open questions
- Whether ClawText should adopt Gemini embeddings at all, or only treat this as a future optional lane for richer media-aware memory.
- Whether multimodal indexing belongs in the main ClawText package or should stay clearly gated as an advanced optional capability.

## Lane / product context
- **Product:** ClawText
- **Lane:** ai-projects
- **Source thread:** 1474997928056590339
- **Target forum:** 1475021817168134144

## Relevant artifacts
- docs/handoffs/CLAWBRIDGE_SHORT_2026-03-12_0604.md
- docs/handoffs/CLAWBRIDGE_FULL_2026-03-12_0604.md
- docs/bootstrap/NEXT_AGENT_BOOTSTRAP_CLAWBRIDGE_2026-03-12_0604.md

## Immediate next steps
1. Record the feature delta in the architecture thread so future work can reference it without reopening the full changelog.
2. Decide later whether to prototype multimodal memory on a narrow extraPaths scope before any broader rollout.

## What not to re-litigate
- Continuity and durable memory are distinct concerns.
- ClawBridge naming is final and should be used directly.