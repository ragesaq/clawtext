---
source: mindgardener-summarizer
key: 28468c4aab0c
count: 337
matchedPhrases: ["setdeviceoffset","target=DriverOffsets"]
ts: 2026-03-06T18:12:12.295Z
summary_priority: medium
summary_confidence: 0.6
category: observational
---

Summary (assistant):
The archive group contains many near-identical SetDeviceOffset log lines (device=6, hand=LEFT) targeting DriverOffsets, differing only by small position/rotation deltas — likely repeated sampling or log duplication.

Suggested action:
Investigate the producer of SetDeviceOffset/DriverOffsets logs and deduplicate or suppress redundant entries.

Notes:
- Confidence 0.60 (below auto-promote threshold 0.70) — moved to review for manual inspection.
- Raw group archived at: memory/log-archive/28468c4aab0c.md
