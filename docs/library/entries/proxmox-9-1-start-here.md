---
kind: library-entry
project: external-reference
topic: proxmox-start-here
status: active
curation: reviewed
visibility: shared
last_reviewed: 2026-03-17
source_docs:
  - docs/library/collections/proxmox-official-docs-9.1.yaml
  - https://pve.proxmox.com/pve-docs/
  - https://pve.proxmox.com/pve-docs/pve-admin-guide.html
summary_confidence: 0.87
linked_collection: proxmox-official-docs-9-1
---

# Proxmox VE 9.1 — Start Here

## Purpose of this entry
This is the curated starting point for the Proxmox VE 9.1 official documentation collection.

Use this when the question is:
- where should we start reading for Proxmox VE 9.1
- what is the official reference corpus
- what topics should be treated as canonical first

## Canonical upstream sources
The initial trusted reference corpus for Proxmox VE 9.1 should start with:
- the official Proxmox VE documentation index
- the official Proxmox VE Administration Guide
- associated official command/API documentation linked from the docs index

## Why this collection matters
The point is not to depend on vague model priors or shifting web search results.

The point is to give the agent a stable, known Proxmox documentation base that can be:
- ingested once
- refreshed intentionally
- queried consistently
- combined later with our own environment-specific overlays

## Initial high-value topic areas
Prioritize these topics for the first ingestion pass:
1. installation
2. storage and ZFS
3. networking and bridges
4. clustering
5. VM management
6. container management
7. backup / restore
8. command-line and API references

## Retrieval intent
For questions like:
- how does Proxmox handle ZFS
- what does the official guide say about clustering
- what is the recommended install approach
- how does Proxmox networking work

this collection should outrank general ingest or random external sources.

## Next layer
Once the official collection exists, add local overlays for:
- our target hardware and environment
- our preferred storage choices
- our chosen deployment path
- cautions specific to our infra goals
