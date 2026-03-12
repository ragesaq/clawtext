# 🏗️ ClawText Browser — Dense Dashboard Foundation

**Status:** Foundation Complete (2026-03-10)  
**Purpose:** Container-aware, maximum-density layout for dashboard integration

---

## 🎯 What Changed

### Before (Standalone App)
- ❌ Assumed full viewport (`100vh` / `100vw`)
- ❌ Fixed-width sidebar (200px)
- ❌ Fixed panel sizes
- ❌ Vertical tab navigation
- ❌ Wasted space with margins/padding

### After (Dashboard-Ready)
- ✅ **Container-aware** — Fills parent container (no `100vh` assumptions)
- ✅ **Resizable panels** — Drag dividers to adjust (layout persists)
- ✅ **Horizontal tab bar** — Dashboard-style tabs (32px height)
- ✅ **Maximum density** — Zero wasted whitespace, minimal margins
- ✅ **Dynamic expansion** — Panels grow to fill available space

---

## 📦 New Components

### 1. `DenseDashboardApp.jsx`
Main container for dashboard integration. Replaces the old `App.jsx`.

**Features:**
- Horizontal tab bar (`DenseTabBar`)
- Resizable panel container (`ResizablePanelContainer`)
- Dense status bar (`DenseStatusBar`)
- Context-aware sizing (fills parent)

**Usage:**
```jsx
// In your dashboard
<DenseDashboardApp />
// Or with custom height
<div style={{ height: '800px' }}>
  <DenseDashboardApp />
</div>
```

### 2. `DenseTabBar.jsx`
Compact horizontal tab bar (32px height).

**Features:**
- Minimal padding/margins
- Active tab highlighted
- Click to switch
- Dashboard-ready

### 3. `DenseStatusBar.jsx`
Single-line status bar (24px height).

**Shows:**
- Connection status
- Cluster/memory counts
- Anti-pattern count
- Hygiene pattern count
- Recent errors
- Provider latency (if available)

### 4. `CompactGraphPanel.jsx`
Container-aware graph visualization.

**Features:**
- Fills 100% of available space
- Overlay controls (hover to show)
- Collapsible detail panel (slide-in)
- No fixed margins
- ResizeObserver for container detection

### 5. `ResizablePanelContainer.jsx`
Dynamic panel system with resizable dividers.

**Features:**
- Percent-based sizing
- Drag to resize
- Layout persists (localStorage)
- Minimum size enforcement
- Multiple panels (2+ supported)

---

## 🎨 Layout Philosophy

### Maximum Density
- **Zero whitespace** — Everything expands to fill space
- **Minimal margins** — 0.25rem–0.5rem max
- **Overlay controls** — Don't take permanent space
- **Compact panels** — Slide-in, not push

### Container Awareness
- **No `100vh`** — Use `height: 100%` relative to parent
- **ResizeObserver** — Detect parent size changes
- **Flexible panels** — Adapt to available space

### Dashboard Integration
- **Horizontal tabs** — Standard dashboard pattern
- **Resizable layout** — User can adjust panel sizes
- **Persistent state** — Remembers layout between sessions

---

## 🚀 How to Use

### Standalone Mode (Development)
```bash
cd ~/.openclaw/workspace/skills/clawtext-browser
npm run dev
# Opens at http://localhost:5173
```

### Dashboard Mode (Production)
Import the component into your dashboard:

```jsx
import DenseDashboardApp from './clawtext-browser/ui/src/components/DenseDashboardApp';

function Dashboard() {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header>My Dashboard</header>
      <div style={{ flex: 1 }}>
        <DenseDashboardApp />
      </div>
    </div>
  );
}
```

### Custom Height
```jsx
<div style={{ height: '800px' }}>
  <DenseDashboardApp />
</div>
```

---

## 📐 Layout Structure

```
┌────────────────────────────────────────────────────────────────┐
│ DenseTabBar (32px) — Horizontal tabs                          │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ResizablePanelContainer (fills remaining height)             │
│  ┌─────────────────────┬───────────────────────────────────┐  │
│  │                     │                                   │  │
│  │  CompactGraphPanel  │  Detail Panel (resizable)         │  │
│  │  (fills 70% by def) │  (fills 30% by default)           │  │
│  │                     │                                   │  │
│  │  [Nodes + Edges]    │  [Cluster info + memories]        │  │
│  │                     │                                   │  │
│  └─────────────────────┴───────────────────────────────────┘  │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│ DenseStatusBar (24px) — Connection, stats, errors             │
└────────────────────────────────────────────────────────────────┘
```

**Panel Behavior:**
- Drag the divider between panels to resize
- Layout persists (remembers sizes)
- Panels expand/shrink with container
- Minimum 200px height enforced

---

## 🔧 Customization

### Adjust Default Panel Sizes
```jsx
<ResizablePanelContainer 
  defaultSizes={[60, 40]} // Graph 60%, Panel 40%
  persistKey="my-custom-layout"
  minHeight={300}
>
  {/* panels */}
</ResizablePanelContainer>
```

### Change Tab Order
```jsx
const TABS = [
  { id: 'graph', label: 'Graph', icon: '🕸' },
  { id: 'search', label: 'Search', icon: '🔍' },
  // ... reorder as needed
];
```

### Hide Status Bar
```jsx
// In DenseDashboardApp.jsx, comment out:
// <DenseStatusBar api={API} />
```

---

## 📊 Performance Notes

### ResizeObserver
- Detects container size changes automatically
- No manual resize handling needed
- Works in all modern browsers

### D3 Simulation
- Runs in web worker (non-blocking)
- Auto-fits to viewport on load
- Smooth 60 FPS for <200 nodes

### Layout Persistence
- Saves to localStorage
- Restores on page reload
- Per-tab layout (graph vs. others)

---

## 🧪 Testing

### Standalone Mode
```bash
npm run dev
# Test: Resize browser window → panels should adapt
# Test: Drag divider → panels should resize
# Test: Reload → layout should persist
```

### Dashboard Mode
```jsx
// In your dashboard app
<div style={{ height: '600px', border: '1px solid red' }}>
  <DenseDashboardApp />
</div>
// Should fill the red box exactly
```

---

## 🔄 Migration Guide

### From Old App.jsx to DenseDashboardApp

**Old:**
```jsx
import App from './App';
// Fixed sidebar, vertical tabs, 100vh
```

**New:**
```jsx
import DenseDashboardApp from './DenseDashboardApp';
// Container-aware, horizontal tabs, resizable panels
```

**No other changes needed** — all existing panels (SearchPanel, GraphPanel, etc.) work as-is.

---

## 📝 Next Steps

### Phase 2 (In Progress)
- [ ] Update SearchPanel to dense version
- [ ] Update AntiPatternPanel to dense version
- [ ] Update HygienePanel to dense version
- [ ] Add multi-panel layout for other tabs

### Phase 3 (Future)
- [ ] Dashboard-wide state management
- [ ] Cross-tab communication
- [ ] Shared global filters
- [ ] Export/import layout presets

---

## 🐛 Known Issues

- **Old panels still use fixed sizes** — Will be updated in Phase 2
- **No dark mode toggle** — GitHub Dark theme only
- **No keyboard shortcuts** — Coming soon

---

## 📚 Related Files

- `ui/src/components/DenseDashboardApp.jsx` — Main container
- `ui/src/components/DenseTabBar.jsx` — Horizontal tabs
- `ui/src/components/DenseStatusBar.jsx` — Status bar
- `ui/src/components/CompactGraphPanel.jsx` — Dense graph
- `ui/src/components/ResizablePanelContainer.jsx` — Resizable panels
- `ui/src/main.jsx` — Entry point (updated)
- `ui/index.html` — HTML (container-aware)

---

*Last updated: 2026-03-10 20:15 UTC*
*Foundation complete — ready for Phase 2 (dense panel updates)*
