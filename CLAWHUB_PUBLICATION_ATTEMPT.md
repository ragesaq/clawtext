# ClawText v1.4.0 — ClawHub Publication Status

## Attempt Summary

**Tried:** Publishing ClawText 1.4.0 to ClawHub using `clawhub publish` command
**Result:** ❌ Failed — "invalid multi-part form: 'stream size exceeded limit: 20971520 bytes'"

## Details

### Error
```
- Preparing clawtext@1.4.0
✖ invalid multi-part form: 'stream size exceeded limit: 20971520 bytes'
Error: invalid multi-part form: 'stream size exceeded limit: 20971520 bytes'
```

### Investigation

1. **Actual package size:** 816 KB (well under 20MB limit)
   - Excluding: node_modules, dist, memory, scripts, .git
   - Just source code, docs, config files

2. **ClawHub version:** 0.7.0

3. **What we tried:**
   - `clawhub publish . --version 1.4.0`
   - With `--no-input` flag
   - With `--slug clawtext` parameter
   - From clean copy with minimal files
   - Created `.clawhubignore` to exclude large files

4. **All attempts failed with same error**

### Likely Cause

The error "stream size exceeded limit" from a 0.8MB package against a 20MB limit suggests either:
- ClawHub 0.7.0 has a bug or lower actual limit
- ClawHub doesn't support complex multi-faceted skills (working memory + ingest + operational learning all in one)
- ClawHub is designed for simpler, single-feature skills

### Alternative Publishing Options

1. **Manual GitHub Release** (current ✅)
   - Tag: `v1.4.0` already created
   - All code on GitHub: https://github.com/ragesaq/clawtext
   - Users can install directly: `git clone` or `npm install`

2. **Contact ClawHub Support**
   - Report this issue
   - Ask about publishing complex multi-lane systems
   - Ask about size limit discrepancy

3. **Consider Publishing as Separate Components**
   - ClawText Core (working memory + ingest)
   - ClawText Operational (operational learning lane)
   - Not preferred — breaks "one system" principle

### Recommendation

**Keep as-is on GitHub.** ClawText is fully functional, all code is public, and users can install by cloning the repo or using npm with git URLs. The GitHub release + tag + comprehensive docs is actually a better distribution model than ClawHub for a system this complex.

If users want ClawHub integration, we can:
- Ask ClawHub to increase their limit
- Wait for ClawHub to support larger packages
- Publish a simplified "ClawText Lite" to ClawHub that can be extended

**Current state is production-ready and accessible.**
