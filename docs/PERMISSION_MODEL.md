# ClawText Permission Model — Context Access Control

**Status:** Proposed  
**Date:** 2026-03-20  
**Inspired by:** HindClaw RBAC model

---

## Overview

ClawText implements **Context Access Control (CAC)** — a 4-layer hierarchical permission system that determines who can access what memory, how they can access it, and what happens to it.

This is RBAC (Role-Based Access Control) adapted for memory systems.

---

## The 4-Layer Hierarchy

```
Global Defaults → Role → Vault Override → User Override
```

Each layer can override the previous. More specific wins.

---

## Layer 1: Global Defaults

Applied to everyone if no other override exists.

**Location:** `state/clawtext/prod/permissions/defaults.json5`

```json5
{
  "recall": true,
  "retain": true,
  "recallBudget": "low",        // token budget for recall: low, medium, high
  "retainEveryNTurns": 5,      // save memory every N turns
  "recallMaxTokens": 512,
  "llmModel": "claude-haiku-4.5",
  "excludeProviders": [],
  "crossSessionVisibility": false,
  "operationalLearningAccess": false
}
```

---

## Layer 2: Roles

Named collections of users with shared permissions.

**Location:** `state/clawtext/prod/permissions/roles/`

```json5
// roles/executive.json5
{
  "roleId": "executive",
  "displayName": "Executive",
  "members": ["user-1", "user-2"],
  "recall": true,
  "retain": true,
  "recallBudget": "high",
  "recallMaxTokens": 4096,
  "llmModel": "claude-opus-4.6",
  "crossSessionVisibility": true,
  "operationalLearningAccess": true
}
```

```json5
// roles/staff.json5
{
  "roleId": "staff", 
  "displayName": "Staff",
  "members": ["user-3", "user-4"],
  "recall": true,
  "retain": true,
  "recallBudget": "low",
  "recallMaxTokens": 512,
  "llmModel": "claude-haiku-4.5",
  "crossSessionVisibility": false,
  "operationalLearningAccess": false
}
```

---

## Layer 3: Vault Overrides

A specific memory vault can override role permissions.

**Location:** `state/clawtext/prod/permissions/vaults/`

```json5
// vaults/financial-analysis.json5
{
  "vaultId": "financial-analysis",
  "roleOverrides": {
    "executive": {
      "recallBudget": "medium",  // even execs get reduced budget here
      "recallMaxTokens": 2048
    }
  }
}
```

---

## Layer 4: User Overrides

A specific user within a specific vault can have custom permissions.

**Location:** `state/clawtext/prod/permissions/users/`

```json5
// users/user-1/financial-analysis.json5
{
  "userId": "user-1",
  "vaultId": "financial-analysis",
  "recallBudget": "high",       // override: gets high budget
  "llmModel": "claude-opus-4.6"
}
```

---

## Resolution Order

When evaluating a request for **user-X** accessing **vault-Y**:

1. Start with **Global Defaults**
2. Apply **Role** permissions (what roles is user-X in?)
3. Apply **Vault Override** (does vault-Y override for that role?)
4. Apply **User Override** (does user-X have a specific override for vault-Y?)

Most specific wins.

---

## Permission Fields

| Field | Type | Description |
|-------|------|-------------|
| `recall` | boolean | Can read from memory? |
| `retain` | boolean | Can write to memory? |
| `recallBudget` | string | Token budget: `low`, `medium`, `high` |
| `recallMaxTokens` | number | Hard cap on recall |
| `retainEveryNTurns` | number | Save every N turns |
| `retainRoles` | string[] | Which roles to retain: `user`, `assistant`, `tool` |
| `retainTags` | string[] | Tags to include in retention |
| `llmModel` | string | Which model processes this user's memory |
| `excludeProviders` | string[] | Blocked LLM providers |
| `crossSessionVisibility` | boolean | Can see other sessions? |
| `operationalLearningAccess` | boolean | Can access failure patterns? |

---

## Resolver API

```typescript
interface PermissionContext {
  userId: string;
  vaultId: string;
  operation: 'recall' | 'retain' | 'both';
}

interface ResolvedPermissions {
  recall: boolean;
  retain: boolean;
  recallBudget: 'low' | 'medium' | 'high';
  recallMaxTokens: number;
  retainEveryNTurns: number;
  llmModel: string;
  crossSessionVisibility: boolean;
  operationalLearningAccess: boolean;
  source: 'defaults' | 'role' | 'vault' | 'user';
}

function resolvePermissions(ctx: PermissionContext): ResolvedPermissions;
```

---

## Example Resolution

**Scenario:**
- User: `user-1` (in executive role)
- Vault: `financial-analysis` (has vault override for executive)
- Global: `budget: low, tokens: 512`

**Resolution:**
1. Global defaults: `budget: low, tokens: 512`
2. Role (executive): `budget: high, tokens: 4096` → override
3. Vault override (executive in financial-analysis): `budget: medium, tokens: 2048` → override
4. User override: none

**Result:** `budget: medium, tokens: 2048`

---

## Implementation Path

1. Create permission resolver module
2. Define default config schema
3. Add role loading
4. Add vault override loading
5. Add user override loading
6. Wire into memory retrieval/retainment
7. Add CLI: `clawtext permissions check <user> <vault>`

---

*This model is inspired by HindClaw's RBAC system, adapted for ClawText's multi-lane architecture.*
