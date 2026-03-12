# SELF_IMPROVEMENT — Phase 7 Execution Brief

Date: 2026-03-09
Status: Active
Depends on: `SELF_IMPROVEMENT_PHASE6_POLICY.md`

---

## 1. Objective

Bring the ClawText self-improvement / operational learning lane back on track by:

1. carrying forward the **unfinished productization work from Phase 6**, and
2. combining it with **Phase 7 promotion / workflow integration**

under a single architectural rule:

- **fully automatic** when safe and repeatable
- **agent-owned** when automation is possible but still needs orchestration
- **user-discretion gated** when judgment or durable policy changes are involved
- **backend/admin only** for raw tooling that should not be the normal user path

---

## 2. Architectural Standard

### 2.1 Fully automatic
Use for things that should happen without user effort and without agent ceremony.

Examples:
- hooks
- event-driven capture
- background extraction
- cluster rebuilds
- automatic retrieval checks before risky task classes
- low-risk background health/maintenance jobs

### 2.2 Agent-owned
Use when full automation is not ready or not desirable, but the user should not have to remember commands.

Examples:
- review summaries
- promotion proposals
- ingesting thread/date/message ranges
- creating scheduled maintenance jobs
- triage workflows
- running transfer checks and reporting results

### 2.3 User-discretion gated
Use when judgment matters.

Examples:
- approve/reject/defer candidate patterns
- approve promotion into `SOUL.md`, `AGENTS.md`, `TOOLS.md`, or project docs
- approve higher-impact schedules or recurring reviews when appropriate
- resolve ambiguous / sensitive patterns

### 2.4 Backend/admin only
Allowed to exist, but should not be the main user-facing path.

Examples:
- raw CLI commands
- direct maintenance scripts
- low-level review/merge utilities
- manual npm flows used mainly for debugging or internal verification

---

## 3. Workstream classification

## 3.1 Automatic workstreams

### A. Passive capture pipeline
**Target state:** fully automatic

Includes:
- hook-based message capture
- session-end flush
- background extraction
- async rebuilds
- cluster refresh / RAG availability

Current status:
- largely present for general ClawText memory
- should remain infrastructure-owned and user-invisible

### B. Operational event capture from real runtime events
**Target state:** fully automatic

Must capture from:
- tool failures
- command failures
- gateway issues
- health degradations
- user corrections (when identifiable)
- repeated retries / loop patterns where feasible

Current status:
- components exist (`operational-capture.ts`)
- not yet broadly wired into live runtime hooks/events

Priority:
- high

### C. Automatic transfer-check for risky task classes
**Target state:** fully automatic

When task class is:
- debugging
- tool-heavy
- command execution
- config change
- deployment / recovery
- gateway / plugin / hook work

The agent/runtime should automatically query operational memory before acting.

Current status:
- retrieval logic exists
- still needs runtime integration

Priority:
- high

---

## 3.2 Agent-owned workstreams

### D. Operational review workflow
**Target state:** agent-owned

Flow:
- system accumulates candidates automatically
- agent periodically summarizes candidate patterns
- user gets concise approve/reject/defer choices
- raw CLI remains backend only

Current status:
- review manager + CLI exist
- agent-led review UX not yet productized

Priority:
- high

### E. Promotion workflow
**Target state:** agent-owned + user-discretion gated

Agent should:
- inspect stable/reviewed patterns
- propose promotion target
- explain why
- request confirmation where durable guidance changes are involved

Promotion map:
- behavioral pattern → `SOUL.md`
- workflow pattern → `AGENTS.md`
- tool gotcha → `TOOLS.md`
- project-specific rule → project docs / ClawText docs
- broad memory-system lesson → operational pattern store + docs/README

Current status:
- promotion primitives exist
- agent-led promotion workflow not yet wrapped

Priority:
- high

### F. On-demand ingest workflows
**Target state:** agent-owned

Examples:
- ingest a thread
- ingest a date range
- ingest between message IDs
- ingest docs/repos/exports
- summarize + write a project file for later mining

Current status:
- already usable in agent-owned form
- should be documented as the expected path, not a manual CLI path

Priority:
- medium

### G. Scheduled maintenance / review jobs
**Target state:** agent-owned, sometimes user-approved

Examples:
- periodic review digest
- candidate backlog review
- operational health report
- rebuild/validation jobs

Important rule:
- user should not need to manually author cron to get value
- the agent may create/manage jobs when appropriate
- user approval is appropriate when the cadence or noise risk matters

Priority:
- medium-high

---

## 3.3 User-discretion gates

These should explicitly remain discretionary:

1. candidate approval / rejection / defer
2. promotion into durable workspace guidance
3. sensitive pattern handling
4. recurring review cadence if it may create visible chatter
5. any automation that meaningfully changes long-term behavior or documentation

---

## 3.4 Backend/admin-only flows

These may continue to exist but are not the product path:
- `operational:capture:error`
- `operational:capture:success`
- `operational:review`
- `operational:merge`
- `operational:synthesize`
- raw npm command workflows

Policy:
- keep them for debugging/admin
- do not rely on them as the normal user experience

---

## 4. Implementation order

### Phase 7A — Runtime wiring
Goal: finish the missing real-world automation from Phase 6.

1. wire `OperationalCaptureManager` into real runtime event sources
2. wire automatic transfer-check into risky task classes
3. ensure operational retrieval stays separate from normal memory retrieval
4. confirm injection gating is selective and safe

Success criteria:
- operational patterns are created without manual CLI for real failures/events
- risky work automatically gets operational recall
- normal chat does not get polluted with operational noise

### Phase 7B — Agent-owned review UX
Goal: make review usable without operator CLI.

1. agent reads candidate queue
2. agent summarizes candidates into natural-language review packets
3. user can approve/reject/defer without touching CLI
4. review log continues to update under the hood

Success criteria:
- user can review patterns conversationally
- CLI becomes optional backend tooling only

### Phase 7C — Agent-owned promotion UX
Goal: promote stable learnings into durable guidance correctly.

1. agent proposes promotion targets
2. agent distinguishes automatic-safe vs user-discretion cases
3. durable docs are updated only where appropriate
4. provenance remains visible in the operational lane

Success criteria:
- stable learnings reliably migrate to `SOUL.md`, `AGENTS.md`, `TOOLS.md`, or docs
- user discretion is preserved for durable behavior changes

### Phase 7D — Scheduled review orchestration
Goal: keep the system healthy without user babysitting.

1. define periodic review cadence
2. let agent create/manage maintenance jobs as needed
3. use concise review digests, not noisy chatter
4. keep scheduling agent-owned or infrastructure-owned

Success criteria:
- no “remember to run this later” dependency for core value
- recurring maintenance is quiet, useful, and reviewable

---

## 5. Packaging / activation requirement

Any new ClawText self-improvement capability is not considered complete until the docs cover:

1. **what it is**
2. **how it is enabled**
3. **whether it requires plugin registration / activation**
4. **whether it requires `plugins.allow` / allowlist changes**
5. **whether it needs restart / reload**
6. **how to verify it is live**
7. **whether it is automatic, agent-owned, user-discretion gated, or backend/admin only**

### Required activation checklist for new functionality
- Code exists
- Runtime wiring exists
- Plugin/skill entry is documented
- Allowlist requirements are documented
- Config toggles/defaults are documented
- Restart/reload requirement is documented
- Verification step is documented
- User-facing install/usage story is documented

### Policy
A feature is **not done** if it only exists in code but a future agent/user would not know:
- how to turn it on,
- how to keep it allowed,
- how to verify it loaded,
- or whether it is meant to be automatic vs agent-owned.

## 5B. Restart / reload protocol

For any change that may affect runtime activation, plugin discovery, allowlists, hook loading, or tool availability, agents must follow this protocol.

### Before restart
The agent must explicitly state:
1. **why** a restart is needed
2. **which changes** triggered the need
3. **whether the change is restart-required or hot-reloadable**
4. **what impact/interruption is expected**
5. **what will be verified afterward**
6. **that the restart is waiting on user approval**

### After restart
The agent must explicitly report:
1. gateway running state / PID
2. plugin load state
3. hook/feature verification result
4. any warnings still present
5. whether the intended feature is now actually live

### Policy
- Do **not** restart silently.
- Do **not** force a restart just because config changed if the user has active work in flight.
- If a restart is pending but not urgent, the agent should say so clearly and continue with non-restart work where possible.

## 6. Concrete file targets

### Primary implementation targets
- `skills/clawtext/src/operational-capture.ts`
- `skills/clawtext/src/operational-retrieval.ts`
- `skills/clawtext/src/operational-review.ts`
- `skills/clawtext/src/operational.ts`
- `skills/clawtext/plugin.js`
- hook/runtime wiring points under `hooks/` and relevant ClawText integration points

### Documentation targets
- `SELF_IMPROVEMENT_PHASE6_POLICY.md`
- `SELF_IMPROVEMENT_PHASE7_EXECUTION_BRIEF.md`
- `skills/clawtext/docs/OPERATIONAL_LEARNING.md`
- README / ClawHub-facing docs later when the UX matches the standard

### Workspace guidance targets (promotion destinations)
- `SOUL.md`
- `AGENTS.md`
- `TOOLS.md`
- project-specific docs

---

## 6. Acceptance criteria

This work is on track when:

### Automatic
- real operational events are captured automatically
- transfer-checks happen automatically for risky task types
- background maintenance does not require user babysitting

### Agent-owned
- user can ask naturally for review/promotion/ingest workflows
- agent handles the mechanics
- CLI is optional, not required

### User-discretion
- approvals are requested only when judgment matters
- durable behavioral/policy changes remain user-controlled

### Product quality
- no major self-improvement value path depends on the user remembering commands
- cron/schedule needs are agent-owned or infrastructure-owned, not homework
- operational memory remains high-signal and selectively injected

---

## 7. Immediate next action

Start with **Phase 7A**:
- runtime wiring of operational capture + automatic transfer-check integration

Reason:
- this unlocks the architecture standard first
- then review/promotion UX can sit on top of a genuinely live system

---

## 8. Working interpretation

We are not “skipping” unfinished Phase 6 work.
We are **absorbing the unfinished Phase 6 productization into Phase 7 execution** so the system gets back on track under one coherent standard.
