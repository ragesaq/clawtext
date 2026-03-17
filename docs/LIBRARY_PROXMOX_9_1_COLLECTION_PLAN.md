# Proxmox VE 9.1 Official Docs — Library Collection Plan

**Status:** Draft  
**Lane:** Documentation / Library Lane  
**Collection slug:** `proxmox-official-docs-9-1`

---

## Goal

Create the first real external library collection for ClawText using the **official Proxmox VE 9.1 documentation** as a trusted reference corpus.

This collection is meant to prove the Library Lane on a real external technology set:
- stable vendor docs
- long-lived technical reference value
- likely future operational relevance
- clear difference between upstream truth and local overlays

---

## Selected upstream sources

### Primary
- Documentation index: `https://pve.proxmox.com/pve-docs/`
- Admin guide HTML: `https://pve.proxmox.com/pve-docs/pve-admin-guide.html`

### Secondary
- Proxmox documentation download page for 9.x admin guide:  
  `https://www.proxmox.com/en/downloads/proxmox-virtual-environment/documentation/proxmox-ve-admin-guide-for-9-x`

---

## Evidence from initial source review

Initial external review indicates:
- the docs index is official and current
- the admin guide is available in HTML and linked from the index
- Brave search surfaced version language indicating **9.1.2** and a December 2025 update window
- the docs index exposes high-value linked references including CLI tools, service daemons, config options, and API viewer access

This is enough to justify using the official Proxmox documentation site as the first trusted corpus target.

---

## Why Proxmox is a good first external collection

- it is a real system likely to be used operationally
- the official docs are structured and authoritative
- the distinction between official docs and local environment choices is very clear
- it exercises the exact value proposition of the Library Lane:
  stable reference retrieval from a known source base

---

## Planned collection shape

### 1. Collection manifest
Use:
- `docs/library/collections/proxmox-official-docs-9.1.yaml`

### 2. Curated start-here entry
Use:
- `docs/library/entries/proxmox-9-1-start-here.md`

### 3. Local overlay template
Use:
- `docs/library/overlays/proxmox-our-environment.example.md`

---

## Initial ingestion scope

Start with:
1. documentation index
2. admin guide
3. linked official CLI/API references if ingestion scope remains manageable

Do **not** begin with:
- community forum content
- blog posts
- random tutorials
- mixed third-party how-to material

That can come later, but should not outrank the official corpus.

---

## Initial retrieval goals

The first successful collection should improve answers to questions like:
- how does Proxmox VE 9.1 handle installation
- what does the official guide say about ZFS/storage
- what is the Proxmox model for networking/bridges
- how does clustering work at a high level
- where are the CLI and API references

---

## Important product distinction

This collection is **not** operational learning.

It is:
- trusted upstream documentation
- intentionally ingested once
- kept refreshable
- retrieved as a stable reference base

Operational learning comes later when *our actual experience* with Proxmox produces recurring failures, fixes, and environment-specific wisdom.

---

## Recommended next implementation step

After this planning slice, the next engineering slice should define:
- collection ingest command shape
- collection manifest parsing/loading
- retrieval provenance for `collection` / `entry` / `overlay`
- reference-intent ranking boost
