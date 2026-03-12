# Repo Root Standard

This folder represents **products we are making**.

Canonical project git repositories should live under:
- `~/workspace/repo/<project>/`

## Intent
Use `repo/` for original products we actively build, ship, distribute, and market.

Examples:
- `repo/clawtext/`
- future product repos we own and maintain

## Not for
Do not treat this folder as a dumping ground for:
- temporary experiments
- unrelated workspace artifacts
- generated media
- imported tools or third-party skill clones unless they are becoming first-class products we own

## Relationship to skills/
- `skills/` is the runtime/package-facing area
- a product in `repo/<project>/` may also appear in `skills/<project>/`
- preferred pattern: `skills/<project>/` should point to the canonical repo when practical

## Practical rule
When starting a new product:
1. create the git repo under `repo/`
2. keep source, docs, packaging, and release assets there
3. keep runtime state out of the repo
4. expose into `skills/` only when needed for OpenClaw runtime integration

## Migration rule
For older repos created in the wrong place:
1. stage a clean copy under `repo/<project>/`
2. audit included vs excluded files
3. switch runtime path only after validation
4. handle public remote/history cleanup separately and deliberately
