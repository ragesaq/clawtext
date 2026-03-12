# Repo Root Standard

Canonical git repositories should live under:
- `/home/lumadmin/.openclaw/workspace/repo/<project>/`

## Rationale
The workspace contains mixed-use operational files, memory, personal docs, temporary artifacts, and multiple unrelated projects. Creating git repos directly inside mixed-use folders makes accidental tracking almost inevitable.

## Standard
- create new project repos under `repo/`
- keep project files self-contained there
- expose into `skills/` only when needed for OpenClaw runtime/package integration
- prefer symlink or managed sync over using a mixed skill folder as the canonical git root

## Migration rule
For older repos created in the wrong place:
1. stage a clean copy under `repo/<project>/`
2. audit included vs excluded files
3. only then decide on path swap / remote rewrite
