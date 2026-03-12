# SELF_IMPROVEMENT — Phase 6 Policy Wrap-Up

Date: 2026-03-09
Project: ClawText Operational Learning / Self-Improvement Lane
Source context:
- `SELF_IMPROVEMENT_IMPLEMENTATION.md`
- `SELF_IMPROVEMENT_MINED.md`
- `skills/clawtext/docs/OPERATIONAL_LEARNING.md`
- `skills/clawtext/src/operational-*.ts`
- `hooks/clawtext-extract/handler.ts`
- `hooks/clawtext-flush/handler.ts`
- `skills/clawtext/plugin.js`

---

## 1. Purpose

This document wraps up **Phase 6 — Retrieval + Injection Rules** and turns the thread discussion into a working policy.

Main goal:
- Operational/self-improvement memory should be **useful, selective, and low-friction**.
- Users should **not need to babysit the system with manual CLI commands or DIY cron scheduling** just to get value.
- If something cannot be fully automatic yet, the **agent must own the workflow** and guide the user only where real approval/decisions are needed.

---

## 2. Phase 6 Decision Summary

### Phase 6 outcome
Operational memory should be retrieved and injected **only when it helps**.

### Query operational memory when
- debugging
- tool-heavy tasks
- command execution
- config changes
- deployment / recovery
- gateway / plugin / hook work
- repeated-failure contexts
- when the operator explicitly marks the task as important

### Do NOT query operational memory when
- normal chat
- general writing
- simple factual questions
- unrelated project planning
- creative work

### Injection policy
- Operational retrieval must stay **separate from normal project memory retrieval**.
- Only merge operational memories when task classification says they are relevant.
- Prefer reviewed/promoted patterns.
- Never inject raw noise into prompts.
- Never turn the self-improvement lane into a diagnostics dumpster.

---

## 3. What the code currently implements

### Already implemented in code

#### A. General ClawText automatic memory capture
1. `hooks/clawtext-extract/handler.ts`
   - Automatically appends message traffic to `memory/extract-buffer.jsonl`
   - Fast, no LLM call, no user action required

2. `hooks/clawtext-flush/handler.ts`
   - On session reset, auto-flushes buffered conversation into daily memory
   - Triggers async cluster rebuild
   - No user action required once hook is active

3. `skills/clawtext/plugin.js`
   - Automatic `before_prompt_build` memory injection
   - Detects project keywords and injects relevant memories
   - No user action required once plugin is active

#### B. Operational/self-improvement lane core components
1. `skills/clawtext/src/operational.ts`
   - Storage model
   - YAML entry persistence
   - Index management
   - Search / merge / promote primitives

2. `skills/clawtext/src/operational-capture.ts`
   - Structured event capture
   - Signature generation
   - Recurrence tracking
   - Auto-promote raw → candidate on repeat

3. `skills/clawtext/src/operational-aggregation.ts`
   - Candidate synthesis
   - Duplicate detection
   - Merge suggestion logic
   - Correlation analysis

4. `skills/clawtext/src/operational-review.ts`
   - Review queue
   - Approve / reject / defer / merge workflow
   - Review logging

5. `skills/clawtext/src/operational-retrieval.ts`
   - Task classification
   - Operational retrieval gating
   - Injection formatting
   - Merge with normal memory injection

6. `skills/clawtext/scripts/operational-cli.mjs`
   - Operator commands for status/search/review/promote/capture/transfer-check/etc.

---

## 4. Automation classification

This is the important part.

### Fully automatic now
These can provide value without user babysitting once enabled.

#### 4.1 Message capture buffer
- Mechanism: `clawtext-extract` hook
- Status: fully automatic
- User involvement: none
- Notes: captures inbound/outbound messages to buffer for later extraction

#### 4.2 Session-end safety flush
- Mechanism: `clawtext-flush` hook
- Status: fully automatic
- User involvement: none
- Notes: prevents losing context between extraction windows

#### 4.3 General memory RAG injection
- Mechanism: `before_prompt_build` plugin
- Status: fully automatic
- User involvement: none
- Notes: already injects relevant ClawText memories into prompts

#### 4.4 Cluster rebuilding after flush / scheduled extraction pipeline
- Mechanism: build script + hook/cron ecosystem
- Status: effectively automatic once installed
- User involvement: none in normal use
- Notes: should remain infrastructure-owned, not user-owned

---

### Semi-automatic, but agent-owned
These are acceptable **only if the agent handles them programmatically** and the user is only asked for real decisions/approval.

#### 4.5 Operational review workflow
- Current implementation: review manager + CLI
- Desired mode: agent checks queue, summarizes candidates, asks for approve/reject only when needed
- User involvement: selective review decisions
- Good fit: semi-automatic agent-led

#### 4.6 Transfer check before risky work
- Current implementation: CLI command exists
- Desired mode: agent runs this automatically before debugging / deployment / gateway surgery / config changes
- User involvement: none unless conflicts or ambiguity appear
- Good fit: semi-automatic agent-led moving toward automatic

#### 4.7 Pattern promotion
- Current implementation: promote command + target mapping
- Desired mode: agent proposes promotion target and applies after approval
- User involvement: approve durable rule placement when needed
- Good fit: semi-automatic agent-led

#### 4.8 On-demand ingest of threads / ranges / exports / repos
- Current implementation: ClawText-Ingest + gateway message read + scripts
- Desired mode: user says “ingest this thread/date range,” agent handles fetch + ingest + summary
- User involvement: request scope only
- Good fit: semi-automatic agent-led

#### 4.9 Scheduled review / digestion jobs
- Current implementation: technically scriptable, not yet fully wrapped
- Desired mode: agent creates or maintains scheduled jobs where needed and reports outcomes
- User involvement: approve schedule / cadence only when needed
- Good fit: semi-automatic infrastructure-owned

---

### Currently too manual / not acceptable as final UX
These exist, but should not be the main user path.

#### 4.10 Manual CLI capture commands
- `operational:capture:error`
- `operational:capture:success`
- Problem: interactive placeholder flow, still operator-centric
- Policy: users should not need to run these to get value

#### 4.11 Review via npm command only
- `npm run operational:review ...`
- Problem: useful for debugging/admins, bad as primary workflow
- Policy: agent should front this with natural language and summaries

#### 4.12 Manual transfer-check CLI
- `npm run operational:transfer-check -- <task>`
- Problem: should be implicit before risky tasks, not something the user remembers to do
- Policy: agent should call the retrieval/check automatically

#### 4.13 User-managed cron as required path
- Problem: “install this and remember to schedule these jobs” is not acceptable as the main value story
- Policy: cron/schedules may exist, but they must be either:
  - provisioned automatically, or
  - created/managed by the agent with clear guidance and minimal user effort

---

## 5. Policy: acceptable user experience

### Principle 1 — No value behind manual CLI
If a user has to remember exact npm/CLI commands to benefit, the feature is not finished.

### Principle 2 — Automatic first
Prefer:
1. hooks
2. event-driven automation
3. background extraction/rebuilds
4. automatic transfer checks
5. automatic retrieval gating

### Principle 3 — Agent-owned semi-automation is acceptable
If full automation is not possible yet, the next-best path is:
- the **agent invokes the underlying tools**
- the agent **summarizes what happened**
- the agent **asks for review/approval only when meaningful**
- the user should not have to be an operator

### Principle 4 — Humans review durable rules, not raw noise
User involvement should be focused on:
- approving promotions
- resolving ambiguous patterns
- confirming durable workflow guidance
- rejecting false positives

### Principle 5 — Scheduling should be hidden infrastructure, not homework
If periodic work is required, the user should not be forced to manually create cron jobs as the normal value path.
The system should either:
- already include the schedule,
- create it programmatically, or
- have the agent walk the user through it in one guided step.

---

## 6. Phase 6 wrap-up verdict

### Phase 6 is conceptually complete
The retrieval/injection policy is now clear:
- selective retrieval only
- operational lane separate from normal memory
- use operational patterns for debugging/tool/config/deployment contexts
- avoid normal-chat contamination

### Phase 6 is not yet fully productized
The code exists, but the UX still leans too much on operator CLI commands for some workflows.
That means:
- **policy/design side of Phase 6:** complete
- **agent-facing productization side:** still needs tightening

---

## 7. Recommended Phase 7 focus

Phase 7 should not just be “promotion targets exist.”
It should make promotion and operational workflows actually usable in the way we want.

### Recommended Phase 7 objective
**Turn operational learning from an operator CLI toolkit into an agent-led workflow with automatic + semi-automatic paths.**

### Priority items

#### 7.1 Auto-transfer-check before risky tasks
- Agent automatically runs operational retrieval for:
  - debugging
  - deployment
  - config changes
  - gateway/plugin/hook work
- User should not have to ask for transfer check manually

#### 7.2 Hook operational capture into real events
- Wire `OperationalCaptureManager` into:
  - tool failures
  - command failures
  - gateway issues
  - health degradations
  - user corrections
- Right now components exist; they need broader live wiring

#### 7.3 Agent-led review summaries
- Agent periodically summarizes candidate patterns
- User gets a concise review prompt, not a CLI burden
- Examples:
  - “I found 3 recurring operational patterns. Approve, reject, or defer?”

#### 7.4 Agent-led promotion workflow
- Agent proposes promotion targets:
  - `SOUL.md`
  - `AGENTS.md`
  - `TOOLS.md`
  - project docs
- User only confirms the durable rule placement when necessary

#### 7.5 Scheduled maintenance without user babysitting
- If regular synthesis/review/rebuilds are needed:
  - provision automatically where possible
  - otherwise agent creates/manages schedule and reports back
- No “go remember these cron jobs” as the main UX

#### 7.6 Natural-language wrappers over CLI utilities
All existing operational commands should be treated as **backend plumbing**, not user-facing requirements.
Examples:
- “review operational patterns” → agent runs review queue logic
- “check if we’ve seen this failure before” → agent runs transfer/retrieval logic
- “capture this as a pattern” → agent runs capture logic
- “promote this into workspace guidance” → agent runs promote logic

---

## 8. Automation matrix (final)

### Fully automatic target
- message capture hooks
- reset/session-end flush
- background extraction
- cluster rebuilds
- normal memory RAG injection
- operational capture from system events
- auto transfer-check for risky task classes

### Semi-automatic agent-led target
- review queue presentation
- pattern approval/reject/defer
- promotion to durable guidance
- on-demand ingest of thread/date/message ranges
- scheduled review/maintenance orchestration

### Should remain rare/manual/admin only
- raw npm commands
- direct CLI capture by user
- user-authored cron as required workflow
- hand-running operational utilities for normal use

---

## 9. Immediate conclusion

To stay aligned with the product goal:
- **Automatic where possible**
- **Agent-led where automation is not yet possible**
- **Manual only for exceptional/operator/debug cases**

This keeps ClawText valuable as a real memory platform instead of a collection of scripts the user has to remember to operate.

---

## 10. Proposed next move

Use this as the bridge into Phase 7:

**Phase 7 = Agent-Led Promotion & Operational Workflow Integration**

Meaning:
- promotion targets become real
- review becomes agent-mediated
- transfer-check becomes implicit
- scheduling becomes infrastructure/agent owned
- CLI utilities remain backend tools, not required user rituals
