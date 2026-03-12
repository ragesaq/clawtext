
## ragefx-thread-context-1480436727058530304-1480640883887050762.md

---
date: 2026-03-09
project: compositor-fx
type: file
entities: []
keywords: []
source: file:/home/lumadmin/.openclaw/workspace/tmp/ragefx-thread-context-1480436727058530304-1480640883887050762.md
---
# RageFX thread context recovery

Thread: `1479768177062842388`
Range: `1480436727058530304` → `1480640883887050762`
Recovered on: 2026-03-09 UTC

This note reconstructs the critical project context from the RageFX Discord thread using the recovered session/memory transcript and the subsequent implementation pass.

## Core project structure

RageFX currently has three main moving parts:

1. **Driver / compositor injection path**
   - Driver loads, injects into `vrcompositor.exe`
   - Shader hook path handles compositor-side effects like RCAS, LUT, and FOV crop
   - Driver/runtime config reloads are visible in `ragefx.log`

2. **Overlay executable / dashboard UI path**
   - `ragefx_overlay.exe` creates a SteamVR dashboard overlay
   - Dashboard QML is `overlay/qml/main.qml`
   - In-scene adjust panel is `overlay/qml/adjust.qml`
   - `ConfigBridge` exposes runtime settings to QML
   - `AdjustOverlay` handles the world-space mini panel

3. **Profile + runtime config path**
   - Earlier blocker: profile persistence and driver-facing runtime config were sharing the same file path, causing schema-v2/default-off state to clobber effective runtime settings
   - Fix already landed: runtime/effective config stays authoritative, profiles moved aside into `profiles.json`

## What the thread established

### Phase 1 — The problem stopped being startup and became interaction
The dashboard/overlay eventually reached the point where:
- it launches
- QML loads
- texture submission succeeds
- event loop stays alive

So the project moved beyond “overlay won’t launch” and into:
- **dashboard is visible/alive, but interaction is broken**

### Phase 2 — Input bridge became the main blocker
The thread logs showed:
- lots of raw OpenVR overlay events
- repeated dashboard event traffic
- no translated `dashboard mouse down ...` logs
- no config-save logs from actual UI interaction

That strongly suggested the UI was **not frozen in rendering**, but rather **missing a proper OpenVR → Qt/QML input bridge**.

### Phase 3 — RGCS is the working pattern
The thread explicitly converged on this decision:
- do **not** re-derive a new model for RageFX input handling
- do **not** over-think this specific problem
- treat RGCS as the canonical, working SteamVR overlay pattern
- port the known-good RGCS event-forwarding behavior directly into RageFX

This applies to both:
- event translation / mouse state / timestamps / focus / scroll
- UI styling consistency (same family look and control treatment)

## Implemented after that thread context

A functionality-first implementation pass was completed in `compositor-fx`:

### Commit `5b240dd`
`fix: separate runtime config from profiles and restore UI-driven config saves`

Meaning:
- `config.json` is authoritative again for driver/runtime behavior
- `profiles.json` owns profile persistence
- UI changes can save runtime config directly again

### Commit `e35424b`
`overlay: port RGCS input bridge and unify RageFX UI styling`

Meaning:
- direct RGCS-style input bridge port into:
  - `overlay/main.cpp`
  - `overlay/AdjustOverlay.cpp`
  - `overlay/AdjustOverlay.h`
- persistent mouse button state
- monotonic mouse timestamps
- fuller Qt6 mouse event construction
- focus + scroll handling retained
- shared QML control layer added:
  - `MyText`
  - `MyPushButton`
  - `MySlider`
  - `MyComboBox`
  - `MyTextField`
  - `MySwitch`
- dashboard and adjust panel restyled into an RGCS-consistent blue/steel theme

## What this validates about next steps

The next step is **not** architecture work.
The next step is **build + validation**.

### Correct build workflow
- Use the **VSCode build system / build server workflow** for RageFX
- Do **not** treat `build-all.ps1` as the authoritative day-to-day build path for this project

### What to validate in the next build/test
1. Dashboard appears reliably
2. Buttons produce translated mouse logs
3. Sliders drag and update values
4. Combo box opens
5. LUT path field is usable
6. UI interactions trigger config save / runtime reload behavior

### What logs should appear if the port is working
Look for logs like:
- `dashboard mouse down ... accepted=... isAccepted=...`
- `dashboard mouse up ...`
- `dashboard focus enter`
- `dashboard scroll ...`
- runtime config save / reload logs after interaction

## Current engineering position

The project is now structured enough that the remaining blocker is very narrow:
- either the new RGCS-style event bridge wakes the dashboard UI up
- or the residual bug is specifically in final delivery of events to the dashboard/root Qt object hierarchy

That is a much smaller problem than where the thread started.


---

