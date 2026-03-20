# ClawText Reflect — LLM-Mediated Recall

**Status:** Proposed  
**Date:** 2026-03-20  
**Purpose:** Instead of raw memory dump, have LLM synthesize what it knows before responding

---

## The Problem

Current recall:
1. Query vector DB
2. Return top-K memories
3. Dump them into prompt
4. Hope the model figures it out

This is:
- Token-heavy
- Potentially incoherent
- No synthesis — just raw facts
- The model has to do all the work to understand what's relevant

---

## The Reflect Solution

**Reflect = LLM reasons over memories before they're used.**

Instead of:
```
User: "what did we decide about auth?"
→ retrieve memories
→ dump 5 memories into prompt
→ model figures it out
```

Do this:
```
User: "what did we decide about auth?"
→ retrieve memories
→ ask LLM: "given these memories, what do you know about auth decisions?"
→ LLM returns synthesized insight
→ inject synthesized insight (not raw memories) into prompt
```

---

## How It Works

### Step 1: Retrieve
Standard vector search, get top-K memories.

### Step 2: Reflect
Call LLM with:
```
You have access to the following memories from our conversation:

{memories}

Given these memories, provide a concise synthesis of what you know about: {query}

Focus on:
- Key decisions
- Important context
- What unresolved questions remain

Respond in 2-4 sentences.
```

### Step 3: Inject
Instead of raw memories, inject the reflection into the prompt.

---

## Why This Is Better

| Aspect | Raw Recall | Reflect |
|--------|-----------|---------|
| Token usage | High (all memories) | Low (synthesis) |
| Coherence | Low | High |
| Reasoning | Model does it | Done for model |
| Context quality | Variable | Curated |

---

## Configuration

```json5
{
  "reflect": {
    "enabled": true,
    "trigger": "auto",     // auto | on-demand
    "minMemories": 2,      // minimum memories to trigger reflect
    "maxMemories": 10,     // max memories to send to reflect
    "model": "claude-sonnet-4.6",  // dedicated model for reflection
    "prompt": "custom prompt here", // optional custom prompt
    "budget": "medium"     // token budget for reflection output
  }
}
```

---

## Trigger Modes

### Auto
Reflect triggers automatically when there are enough memories.

### On-Demand
Only reflect when explicitly requested (via slot selector or flag).

---

## Example Flow

### Input
User asks: "what's the status of the auth work?"

### Retrieve
Finds 6 memories:
- "decided to use auth0"
- "budget approved for auth0"
- "meeting moved to thursday"
- "jira ticket created"
- "security review scheduled"
- "api keys rotated"

### Reflect Prompt
```
You have access to the following memories:

1. "decided to use auth0"
2. "budget approved for auth0"  
3. "security review scheduled"
4. "api keys rotated"
5. "jira ticket created"
6. "meeting moved to thursday"

Given these memories, provide a concise synthesis of what you know about: auth work status

Focus on:
- Key decisions
- Important context
- What unresolved questions remain

Respond in 2-4 sentences.
```

### Reflect Output
> "Auth0 has been selected as the solution, with budget approved and a security review scheduled. A JIRA ticket has been created and API keys were rotated. Next step appears to be the security review, with a meeting moved to Thursday to discuss further."

### Final Prompt
User question + reflection (not raw memories)

---

## When NOT to Use Reflect

- Very few memories found (1-2)
- User explicitly wants raw recall
- Debugging / auditing (need raw data)
- High-latency scenarios

---

## Implementation Path

1. Add reflect configuration to extraction config
2. Create reflect module
3. Add slot selector: `{{memory.reflect:query}}`
4. Wire into retrieval path
5. Add toggle in CLI

---

## CLI (Future)

```bash
# Enable reflect
clawtext config set reflect.enabled true

# Set reflect model
clawtext config set reflect.model claude-sonnet-4.6

# Test reflect
clawtext reflect "what did we decide about auth"
```

---

## Why This Matters

- **Different from HindClaw** — This is our differentiator
- **Token efficient** — Much smaller prompt
- **More intelligent** — Model synthesizes, not just retrieves
- **Better responses** — Coherent context, not raw dump

---

*Inspired by HindClaw's reflect feature, adapted for ClawText's architecture.*
