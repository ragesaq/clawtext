# Decision Record

- **Date:** 2026-03-16
- **Decision:** Retrofit ClawText into the ClawTomation lifecycle framework to finish the product inside canonical project controls
- **Context:** ClawText already had strong strategic and publication materials, but lacked explicit PRD, Flight Control, enforcement, and lifecycle-aware review structures.
- **Why this choice:**
  - finishing a real in-flight product is a stronger ClawTomation proof than bootstrapping only net-new repos
  - ClawText needs a controlled finish path for remaining hardening work
  - lifecycle control reduces the risk of release-story drift versus supported behavior
- **What changed:**
  - added PRD, Flight Control, Enforcement, Change Routing, lifecycle templates, PR template, and CI check baseline
  - updated README, Milestones, and Retrofit Report to reflect lifecycle-aware finish work
- **Follow-up required:**
  - validate the remaining finish-path priorities through milestones and evidence
  - decide whether to strengthen CI heading checks later
