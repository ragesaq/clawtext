# State Root Standard

Runtime state, caches, eval outputs, and other generated artifacts should live outside product repos.

## Standard
Use:
- `~/workspace/state/<project>/dev/`
- `~/workspace/state/<project>/prod/`

## Purpose

### `dev/`
For experiments, local evaluations, scratch outputs, and development-only runtime state.

### `prod/`
For production/runtime-managed state that should persist cleanly but does not belong in source control.

## Example for ClawText
- `~/workspace/state/clawtext/dev/`
- `~/workspace/state/clawtext/prod/`

## What belongs in state/
- eval outputs
- caches
- temporary generated artifacts
- operational breadcrumbs (if not intentionally stored in shared workspace memory)
- local-only runtime outputs

## What does NOT belong in state/
- product source code
- packaging files
- public documentation that should ship with the product
- shared workspace memory domain files unless intentionally global

## Important nuance for ClawText
ClawText operates on shared workspace memory, so some user-facing memory files remain intentionally outside private product state:
- `memory/`
- `MEMORY.md`

These are part of the workspace memory domain, not merely internal product junk.
