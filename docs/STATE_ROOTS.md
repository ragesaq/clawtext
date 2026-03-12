# ClawText State Roots

ClawText source lives in the product repo, but generated/runtime state should live outside the repo.

## Standard
- `~/workspace/state/clawtext/dev/`
- `~/workspace/state/clawtext/prod/`

## Current usage

### `state/clawtext/dev/`
Recommended for:
- eval harness outputs
- scratch runtime outputs
- development-only generated artifacts

### `state/clawtext/prod/`
Recommended for:
- production/runtime-managed caches and generated state that should persist cleanly outside source control

## Important nuance
ClawText operates on shared workspace memory, so not all memory-related files should move under private product state.

These remain intentionally workspace-level when they are part of the shared memory domain:
- `memory/`
- `MEMORY.md`

## Principle
Keep product repos clean, keep runtime state separate, and only keep workspace-level files global when they are intentionally shared domain data.
