---
key: c92d6f9ccbf1
count: 1
files: 2026-03-03.md
matchedPhrases: ["re-apply smoothing","re-apply smoothing on late device arrival","deviceCountChanged"]
ts: 2026-03-06T18:12:12.316Z
---

# Candidate (count=1)

- `7888c9e` — ini load clamping + zero-value guard - `1024d36` — normalize physical→cutoff in overlay; smoothing.ini folder bug fix (qfileinfo) - `20baac2` — send normalized strength (–) to driver - `6d1f515` — re-apply smoothing on late device arrival (devicecountchanged signal) - `4f46692` — loadprofile("default") must not overwrite devicetypestrengths with zeros - `c91c791` — remove default profile; global is now sole system baseline (% defaults) - `714025f` — build dispatch commit --- _suggested action:_ review this snippet for promotion; annotate priority/category/suggested action if ok.

## Examples

- 2026-03-03.md:361 device matched:["re-apply smoothing","re-apply smoothing on late device arrival","deviceCountChanged"]
  
  - `7888c9e` — INI load clamping + zero-value guard

- `1024d36` — normalize physical→cutoff in overlay; smoothing.ini folder bug fix (QFileInfo)

- `20baac2` — send normalized strength (0–1) to driver

- `6d1f515` — re-apply smoothing on late device arrival (deviceCountChanged signal)

- `4f46692` — loadProfile("Default") must not overwrite deviceTypeStrengths with zeros

- `c91c791` — remove Defa
