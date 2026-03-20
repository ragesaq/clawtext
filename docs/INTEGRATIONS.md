# ClawText Integrations

**Purpose:** show how host products should consume ClawText without bending core architecture around host-specific needs.

See also: [`BOUNDARIES.md`](./BOUNDARIES.md)

---

## Integration model

ClawText exposes reusable memory primitives:
- slot resolver/query API
- template expansion
- session/advisor matrix primitives
- operational learning and retrieval warnings
- continuity/handoff primitives

Host products should consume those primitives through thin adapter modules.

Current adapters:
- `src/integrations/clawcouncil.ts`
- `src/integrations/clawdash.ts`

---

## Rule of thumb

Use **core** when you need a reusable memory primitive.
Use an **integration adapter** when you need a host-specific bundle or view.
Use **local config/state** when the behavior only makes sense in one deployment.

---

## ClawCouncil integration

File:
- `src/integrations/clawcouncil.ts`

Primary helper:
- `renderClawCouncilContext(ctx, options)`

### Default selector bundle
- `advisor.active`
- `session.owner:current`
- `session.related:current`
- `council.perspectives`

### What it returns
- structured slot results for orchestration logic
- optional rendered prompt text if a template is provided
- replacement audit trail for debugging/explainability

### Example

```ts
import { renderClawCouncilContext } from '@psiclawops/clawtext';

const result = renderClawCouncilContext(
  {
    workspacePath,
    sessionKey,
    channelId,
    threadRef,
    channelRef,
  },
  {
    template: `
Active advisor:
{{advisor.active}}

Current owner:
{{session.owner:current}}

Related sessions:
{{session.related:current}}

Council perspectives:
{{council.perspectives}}
`,
  },
);
```

### Use this when
- routing to advisors
- building council deliberation prompts
- showing structured advisor/session context
- keeping ClawCouncil orchestration code separate from ClawText internals

---

## ClawDash integration

File:
- `src/integrations/clawdash.ts`

Primary helper:
- `renderClawDashPanel(ctx, options)`

### Default selector bundle
- `advisor.active`
- `session.owner:current`
- `session.related:current`
- `session.matrix:current-project`
- `council.perspectives`

### What it returns
- structured data for dashboard panels/cards/views
- optional rendered text for DocsPage or operator-facing summaries
- replacement audit trail if a template is used

### Example

```ts
import { renderClawDashPanel } from '@psiclawops/clawtext';

const panel = renderClawDashPanel(
  {
    workspacePath,
    sessionKey,
    channelId,
    threadRef,
    channelRef,
  },
  {
    template: `
Advisor:
{{advisor.active}}

Project matrix:
{{session.matrix:current-project}}
`,
  },
);
```

### Use this when
- rendering dashboard panels
- building memory/admin/status views
- composing dashboard summaries from generic slot primitives
- exposing ClawText state in UI without making UI assumptions part of core

---

## Choosing the right layer

### Put it in core if:
- another host product could use it
- it defines a reusable memory primitive
- it is about retrieval, continuity, or schema shape

### Put it in an integration adapter if:
- it bundles selectors for one host product
- it transforms core data for one host’s workflow
- it renders text/views tailored to one host surface

### Keep it out of product code if:
- it is one-operator or one-deployment specific
- it depends on private local assumptions
- it is temporary or experimental

---

## Anti-patterns

Avoid these:
- core code that imports dashboard/UI concerns
- `if (host === "clawdash")` logic inside core retrieval paths
- product-specific names in reusable schema design
- local deployment assumptions committed as core behavior

---

## Recommended next steps for new integrations

When adding a new host consumer:
1. identify the minimal generic primitive needed in core
2. add or reuse slot selectors / APIs in core if genuinely reusable
3. create a new adapter under `src/integrations/`
4. keep rendering, workflow, and host-specific bundling inside that adapter
5. document it here

---

## Bottom line

ClawText should remain independently useful and publishable.
Integrations should make host products more productive without redefining ClawText core.
