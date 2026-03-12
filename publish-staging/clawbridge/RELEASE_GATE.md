# ClawBridge Release Gate (Core Principle)

This gate enforces the Core Principle:
- fully documented
- Gold Standard posting format
- easily installable
- automated where possible
- agent-driven where judgment is needed

## Required for release

- [ ] README updated and accurate
- [ ] QUICKSTART copy/paste commands work
- [ ] INTEGRATION reflects current behavior
- [ ] GIST_POSTING workflow present and tested
- [ ] GOLD_STANDARD_POST format present
- [ ] AGENT_USAGE minimum standard present
- [ ] CLI help includes current flags (`--attach-thread`, `--no-create-thread`)
- [ ] One smoke test recorded for create-thread flow
- [ ] One smoke test recorded for attach-thread flow

If any checkbox is missing, do not tag a release.
