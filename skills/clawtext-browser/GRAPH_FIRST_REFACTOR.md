# ClawText Browser — Graph-First Refactor Brief

Date: 2026-03-10
Status: approved direction
Owner intent: the association cloud is the main artifact; management UI is secondary and should layer over it.

## Product posture

This page is not an admin panel with a graph widget.
It is a spatial memory model first, and an operator console second.

Default visual priority:
1. Graph stage
2. Lightweight overlays
3. Optional drawers / inspectors

## ClawDash integration constraint

ClawText Browser must be buildable as a self-contained module that can mount inside a ClawDash tab.
That means:
- no assumptions about global page chrome beyond the immediate container
- the module should fill 100% of its parent bounds
- internal layout should treat the graph stage as the root visual surface
- integration into the main ClawDash page is separate from this module design

## Core design goals

### Primary
- Graph canvas should occupy 100% of available module area by default
- No permanent panels should reduce graph area unless explicitly opened or pinned
- Controls may sit on top of the canvas
- Drawers may overlay the canvas
- If a drawer is pinned, graph may resize intentionally

### Secondary
- Search, walls, hygiene, learnings, and operator actions should behave like tools around the graph
- The shell should support future ClawDash tab mounting cleanly
- Dense information display is preferred over decorative whitespace

## Current problems in code

### App.jsx
Current shell is still sidebar + content.
That structurally demotes the graph into a content pane.

### GraphPanel.jsx
Current graph panel mixes too many concerns:
- sizing
- simulation
- stage rendering
- overlay controls
- tooltip logic
- detail drawer
- graph normalization

This makes it brittle and hard to reason about.

## Target architecture

## 1. Module boundary

Create a top-level export intended for ClawDash mounting:
- `ClawTextBrowserModule`

Responsibilities:
- fill its parent container
- own local UI state for mode / drawer / selected node
- render graph-first shell

This module should be mountable both:
- standalone in the current browser app
- as a ClawDash tab body later

## 2. Graph-first shell

Component: `GraphFirstShell`

Layers:
1. `GraphStage` — full bounds, absolute fill
2. `GraphOverlayChrome` — tabs, controls, status chips, minimap later
3. `GraphDrawer` — right/left overlay drawer for detail/search/hygiene/etc.

Default behavior:
- graph consumes full area
- a thin left rail or top pill strip provides navigation
- no reserved side width by default

## 3. Stage / graph split

### `GraphStage`
Owns:
- available bounds
- svg/canvas viewport
- pan/zoom
- pointer event plumbing
- selected / hovered ids

Does not own:
- tabs
- drawer mode selection
- persistent shell state

### `GraphSimulation`
Owns:
- d3-force simulation
- node/edge layout
- stable tick output
- refit / reheat actions

### `GraphOverlayChrome`
Owns:
- floating controls
- mode pills / rail
- zoom indicator
- status chips
- optional legend

### `GraphDrawer`
Owns:
- selected node details
- walls manager view
- hygiene triage view
- learnings / search overlays later

## Visual layout target

### Default state
- full graph stage
- tiny left rail or top pill row
- small floating controls top-right
- compact status chips bottom-left or top-left
- no detail drawer open

### On node click
- detail drawer slides over graph from right
- graph remains visible beneath
- drawer width ~360px by default
- close returns graph to full width immediately

### On search / hygiene / walls
- either overlay drawer or command-palette style view
- never permanent multi-column layout by default

## Interaction model

### Navigation modes
- Graph
- Search
- Walls
- Hygiene
- Learnings

These are shell modes, not permanent panes.

### Selection model
- click node => open detail drawer
- click edge => edge inspector / wall context
- escape => close drawer / clear selection
- double click background => fit / reset optional

### Pinned drawer mode
Optional future behavior:
- open drawer as overlay by default
- pin drawer => convert to split layout with draggable divider

## Density rules

- no decorative margins
- overlays should be compact and translucent
- controls should not claim permanent layout space
- labels should be zoom-dependent
- graph should feel expansive, not boxed-in

## Immediate implementation plan

## Phase 1 — stabilize shell
1. Introduce `ClawTextBrowserModule`
2. Introduce `GraphFirstShell`
3. Replace permanent sidebar with minimal overlay navigation
4. Ensure graph stage is absolute-fill inside module root

## Phase 2 — simplify graph core
1. Split viewport sizing from drawer/layout concerns
2. Keep existing D3 logic but isolate it behind stage + simulation boundary
3. Remove any permanent panel width from graph layout math
4. Ensure drawer overlays instead of shrinking stage by default

## Phase 3 — improve graph feel
1. zoom-dependent labels
2. optional minimap
3. neighborhood/focus modes
4. edge inspector / wall overlays

## What to keep from current code
- existing API routes
- existing graph data model from `/api/graph`
- D3 force basis
- anti-pattern wall rendering concept
- node detail content model

## What to stop doing
- permanent sidebar width as default shell
- graph treated as a child pane in flex layout
- forcing admin-style multipanel layout on initial load
- repeated ad hoc sizing hacks inside graph shell

## Suggested component tree

```text
ClawTextBrowserModule
└─ GraphFirstShell
   ├─ GraphStage
   │  ├─ GraphSvgViewport
   │  └─ GraphSimulationAdapter
   ├─ GraphOverlayChrome
   │  ├─ ModeRail
   │  ├─ GraphControls
   │  ├─ StatusChips
   │  └─ LegendBadge
   └─ GraphDrawer
      ├─ NodeDetailView
      ├─ WallsView
      ├─ HygieneView
      ├─ SearchView
      └─ LearningsView
```

## Technical constraints for ClawDash embedding

- module root must use `width: 100%; height: 100%`
- no direct `100vh` dependence in module internals
- standalone wrapper may still provide viewport height for dev mode
- avoid hidden global assumptions about body sizing
- shell should remain visually correct inside any parent tab container

## Success criteria

- On load, the graph visibly owns the page
- Opening a tool does not make the graph feel like a thumbnail
- Closing overlays returns the graph to full module area
- The module can be mounted into a ClawDash tab without structural changes
- No blank-page regressions from shell refactors
