---
doc: LIFECYCLE_BASELINE
version: 0.2.0
status: active
owner: PsiClawOps
last_updated: 2026-03-19
---

# Lifecycle Baseline — ClawText

## Repo identity
- Blade path (if monorepo-blade): none
- Repo topology: standalone-repo
- Project type: skill
- Governance structure: standalone
- Ancestors (if child): none
- Project name: clawtext
- GitHub identity profile: psiclawops
- Repo state: attach

## ClawTomation baseline status
- Profile: code-build
- Framework version: 2026-03-18.e
- Baseline version: 2026-03-17.a
- Last sync date: 2026-03-19
- Sync result: synced

## Installed modules
- Model policy: no
- Security scanning: no
- Core lifecycle docs: yes
- Enforcement stack: yes
- Output artifact discipline: yes
- Workstream clearinghouse: no
- Master/child coordination: no
- Private stealth hooks: yes

## GitHub settings status
- Conversation resolution required: no
- Workflow installed: yes
- PR template installed: yes
- Labels configured: yes
- Branch protection/rulesets configured: no (GitHub plan limit — private-stealth hooks active instead)
- Required status checks configured: no
- Direct push restrictions configured: no (private-stealth)

## Pending upgrades
- None

## Notes / exceptions
- ClawText is the sole public PsiClawOps repo.
- Pre-existing governance docs (NORTHSTAR, PRD, MILESTONES, FLIGHT_CONTROL, POST_BRIEF) retained with rich pre-ClawTomation content.
- NORTHSTAR.md now carries YAML front matter while preserving its richer ClawText-native body structure.
- Enforcement mode: private-stealth (github-hard blocked by GitHub plan).
