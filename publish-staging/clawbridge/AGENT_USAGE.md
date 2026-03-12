# ClawBridge Agent Usage (Minimum Standard)

This is the minimum bar for agents using ClawBridge.

## Default behavior

1. Use `extract-discord-thread` in `dual` mode unless told otherwise.
2. Prefer automatic extraction and posting.
3. Use manual overrides only for quality improvements:
   - `--objective`
   - `--established`
   - `--open`
   - `--next`
4. If transfer target already exists, use `--attach-thread`.
5. If user requests durable memory, add `--ingest`.

## Canonical commands

### Create new transfer thread

```bash
clawbridge extract-discord-thread \
  --source-thread <sourceThreadId> \
  --target-forum <forumId> \
  --title "<new thread title>" \
  --mode dual
```

### Attach packet to existing thread

```bash
clawbridge extract-discord-thread \
  --source-thread <sourceThreadId> \
  --target-forum <forumId> \
  --attach-thread <threadId> \
  --no-create-thread \
  --mode dual
```

### Optional gist posting of generated packet

Use `GIST_POSTING.md`.

## Definition of done

- short/full/bootstrap artifacts generated
- destination thread contains continuity packet
- packet is readable and actionable by a fresh agent
