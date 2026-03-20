# ClawText IaC — Plan & Apply

**Status:** Proposed  
**Date:** 2026-03-20  
**Purpose:** Infrastructure-as-Code tooling for ClawText memory configuration

---

## The Problem

Before: You manually edit memory config files, restart, hope it works.

After: You edit config files, run `plan`, review changes, run `apply`. Everything is version-controlled, auditable, reproducible.

---

## The Solution: Plan & Apply

Inspired by Terraform, adapted for ClawText.

### Workflow

```bash
# See what would change
clawtext plan

# Apply changes
clawtext apply

# Validate config without applying
clawtext validate
```

---

## What Can Be Managed

| Resource | Description |
|----------|-------------|
| Memory Vaults | Bank configurations |
| Roles | Permission roles |
| Extraction Strategies | Topic-based retention |
| Templates | Prompt templates |
| Library Entries | Reference knowledge |
| Hive Nodes | Cluster configuration |

---

## Configuration Files

### Directory Structure

```
state/clawtext/prod/
  config/
    vaults/
      default.json5
      financial-analysis.json5
      project-alpha.json5
    roles/
      executive.json5
      staff.json5
    strategies/
      deep-analysis.json5
      lightweight.json5
    templates/
      council-prompt.json5
      bootstrap.json5
    library/
      architecture-decisions.json5
```

---

## Example: Vault Config

```json5
// vaults/financial-analysis.json5
{
  "vaultId": "financial-analysis",
  "displayName": "Financial Analysis",
  "description": "Memory vault for financial discussions",
  "retention": {
    "maxAge": "90d",
    "maxEntries": 1000,
    "autoArchive": true
  },
  "extraction": {
    "enabled": true,
    "strategy": "deep-analysis",
    "confidenceThreshold": 0.7
  },
  "tags": ["financial", "sensitive", "analysis"]
}
```

---

## Example: Role Config

```json5
// roles/executive.json5
{
  "roleId": "executive",
  "displayName": "Executive",
  "members": ["user-1", "user-2"],
  "permissions": {
    "recall": true,
    "retain": true,
    "recallBudget": "high",
    "recallMaxTokens": 4096,
    "llmModel": "claude-opus-4.6",
    "crossSessionVisibility": true,
    "operationalLearningAccess": true
  }
}
```

---

## Example: Extraction Strategy

```json5
// strategies/deep-analysis.json5
{
  "strategyId": "deep-analysis",
  "displayName": "Deep Analysis",
  "description": "Verbose extraction for important conversations",
  "extraction": {
    "mode": "full",
    "entityTypes": ["*"],
    "sentiment": true,
    "topics": true,
    "decisions": true,
    "tasks": true,
    "confidenceThreshold": 0.5
  },
  "retention": {
    "everyNTurns": 1,
    "tags": ["important", "decision", "task"]
  }
}
```

---

## The Plan Command

```bash
clawtext plan
```

Shows what would change:

```
+ Add vault: "project-alpha"
~ Modify role: "executive" (recallBudget: high → medium)
- Remove strategy: "experimental"
~ Modify library: "architecture-decisions" (1 entry added)

Plan: 1 add, 2 modify, 1 remove
```

Uses color coding:
- `+` green: additions
- `~` yellow: modifications
- `-` red: deletions

---

## The Apply Command

```bash
clawtext apply
```

Interactive confirmation:

```
Apply plan? [y/n]: y
Applying...
+ Create vault project-alpha
~ Update role executive
- Remove strategy experimental
~ Update library architecture-decisions

Apply complete! 4 changes made.
```

### Non-interactive

```bash
clawtext apply --auto-approve
```

---

## The Validate Command

```bash
clawtext validate
```

Checks all config files for:
- Valid JSON5
- Required fields present
- References valid (role exists, etc)
- No circular dependencies

```
Validating config...
✓ vaults/financial-analysis.json5 — OK
✓ roles/executive.json5 — OK
✗ roles/staff.json5 — ERROR: member "user-99" not found

Validation failed: 1 error
```

---

## State Management

### State File

`state/clawtext/prod/.terraform/` or similar stores applied state.

This tracks what's currently deployed.

### Drift Detection

If config file changes but `apply` hasn't run, `plan` detects drift:

```
~ Modify vault: "financial-analysis" (REMOTE DIFFERS)
  remote: extraction.strategy = "lightweight"
  local:  extraction.strategy = "deep-analysis"
```

---

## Version Control

All config files should be in git.

```bash
git diff vaults/
```

Shows exactly who changed what and when.

---

## Import Existing

Bring existing resources under IaC management:

```bash
clawtext import vault financial-analysis
```

Creates config file from current state.

---

## Why This Matters

- **Auditable** — Every change in git
- **Reproducible** — Same config = same state
- **Safe** — Plan before apply
- **Collaborative** — PRs for config changes
- **Versioned** — Rollback by reverting git commit

---

## Future: Modules

Reusable config snippets:

```json5
{
  "$module": "standard-vault",
  "maxAge": "30d",
  "extraction": { "$module": "default-extraction" }
}
```

---

*This brings Terraform-style discipline to ClawText configuration.*
