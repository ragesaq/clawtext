---
kind: library-overlay
slug: proxmox-our-environment
collection: proxmox-official-docs-9-1
project: infrastructure
scope: local-ops
status: draft
visibility: shared
last_reviewed: 2026-03-17
---

# Proxmox — Our Environment Overlay

## Purpose
This overlay is where local/operator truth sits on top of the official Proxmox documentation corpus.

## Intended local details
Examples of what belongs here:
- hardware assumptions for our Proxmox host
- whether we are using ZFS and how
- storage layout decisions
- cluster vs single-node decision
- constraints specific to our environment
- things the official docs allow that we intentionally are not doing

## Rule
Official docs answer what Proxmox supports.
This overlay answers how **we** are choosing to use it.
