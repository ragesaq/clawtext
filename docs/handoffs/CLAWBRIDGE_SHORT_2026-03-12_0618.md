# ClawBridge Extract — Short Handoff

**Context:** Track how the provider-usage / billing-surface PR should be viewed after the OpenClaw upgrade to 2026.3.11, including whether the core rationale still holds and whether the branch now needs refresh work.

**Established:**
- PR #43063 is still open, CI-green, and mergeable against upstream main. GitHub currently reports mergeable CLEAN.
- The release to 2026.3.11 does not supersede the PR's core idea. Upstream did not land equivalent metered-provider JSON support for OpenRouter, and the provider-usage parity goal still stands.
- The PR remains additive and focused: it modifies list.status-command.ts and tests, and adds a dedicated provider-usage.openrouter implementation plus tests.
- However, upstream main has moved significantly since the PR was opened, and at least one of the touched files, src/commands/models/list.status-command.ts, has changed on main after the PR work landed.
- That means the PR is no longer best treated as done-done. It is best treated as a rebase-and-refresh candidate: validate on current main, reconcile any drift in models status command structure, rerun tests, and then continue review.

**Open now:**
- Whether the current PR should stay narrowly scoped to metered-provider support plus better provider-usage structure, or be expanded into a broader cleanup of windowed provider usability.
- Whether the main remaining work is just a rebase plus rerun, or whether 2026.3.11 file drift reveals a better integration point for the same schema idea.

**Next:**
- Rebase or refresh the branch on current upstream main before trying to push the PR over the finish line.
- Re-run focused tests around models status output and provider usage on top of 2026.3.11 mainline code.
- Check whether any new status-command changes from upstream should be preserved during conflict resolution instead of blindly replaying the older patch.
- Continue using the PR as the tracking object for provider-usage JSON parity unless upstream lands overlapping work first.

**Full context:**
- docs/handoffs/CLAWBRIDGE_FULL_2026-03-12_0618.md
- docs/bootstrap/NEXT_AGENT_BOOTSTRAP_CLAWBRIDGE_2026-03-12_0618.md