# ClawDash — OpenClaw Operations Dashboard

A unified React dashboard for monitoring and managing all OpenClaw operations, features, and metrics.

## 🎯 Purpose

Central hub for:
- **ClawText Memory Browser** — Search, view, and manage memory clusters
- **Model/Provider Health** — Real-time usage, latency, error rates, costs
- **Agent Status** — Active sessions, sub-agent orchestration
- **Operational Metrics** — Heartbeat status, cron jobs, hook activity
- **Grafana Integration** — Advanced performance charts and telemetry
- **Feature Modules** — Plug-and-play components for new capabilities

## 🏗️ Architecture

```
openclaw-dashboard/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── memory-browser/  # ClawText integration
│   │   ├── metrics/         # Charts, graphs, health indicators
│   │   ├── agents/          # Session/sub-agent management
│   │   └── modules/         # Plug-in feature modules
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API clients (OpenClaw gateway, memory, etc.)
│   ├── stores/              # State management (Zustand/Redux)
│   ├── types/               # TypeScript interfaces
│   └── utils/               # Helpers, formatters
├── public/
├── package.json
├── vite.config.ts
└── README.md
```

## 🚀 Quick Start

```bash
cd openclaw-dashboard
npm install
npm run dev
```

Dashboard runs on `http://localhost:5173` by default.

## 📦 Core Modules (Planned)

### 1. Memory Browser (ClawText)
- Cluster visualization
- Memory search (BM25 + semantic)
- Daily notes viewer
- Memory quality metrics
- Manual cluster rebuild trigger

### 2. Model/Provider Health
- Real-time token usage (input/output/cost)
- Latency histograms
- Error rate tracking
- Provider uptime/status
- Cost breakdown by model/session

### 3. Agent Operations
- Active sessions list
- Sub-agent status (list/steer/kill)
- Session history viewer
- Model override controls
- Thinking level indicators

### 4. System Health
- Heartbeat status (last check, next scheduled)
- Cron job health
- Hook activity logs
- Gateway daemon status
- Resource usage (CPU, memory, disk)

### 5. Grafana Metrics ⭐ **NEW**
- Embedded Grafana dashboards
- Advanced performance charts
- Real-time telemetry visualization
- Custom time-range selection
- Full-screen Grafana integration
- Pre-built dashboards for:
  - OpenClaw Gateway overview
  - Model performance & cost tracking
  - ClawText memory analytics
  - ClawSaver batching efficiency
  - Agent orchestration metrics

### 6. Feature Modules (Plug-in)
- ClawSaver metrics (calls saved, batches)
- Thread-bridge logs
- RGCS build status (if integrated)
- Custom widgets via config

## 🔌 Module Interface

Modules follow a simple contract:

```typescript
interface DashboardModule {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType;
  route: string;
  component: React.ComponentType;
  permissions?: string[];
  settings?: ModuleSettings;
}
```

Modules are auto-discovered from `src/modules/` and registered in `src/config/modules.ts`.

## 🎨 Design Principles

- **Modular** — Each feature is a self-contained module
- **Real-time** — WebSocket/SSE for live updates where applicable
- **Responsive** — Works on desktop, tablet, mobile
- **Extensible** — New modules drop in without core changes
- **Performant** — Lazy loading, virtualized lists, memoized queries
- **Accessible** — WCAG 2.1 AA compliance

## 🛠️ Tech Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **State:** Zustand (lightweight, dev-friendly)
- **Routing:** React Router v6
- **Charts:** Recharts / Chart.js (for simple charts)
- **Grafana:** Embedded dashboards for advanced metrics
- **UI:** Tailwind CSS + shadcn/ui components
- **API:** React Query (TanStack Query) for data fetching
- **Real-time:** WebSocket client for gateway events
- **Icons:** Lucide React

## 📊 Data Sources

### OpenClaw Gateway API
- `/api/status` — Gateway health
- `/api/sessions` — Session list
- `/api/sessions/:key/history` — Session history
- `/api/memory/search` — Memory search
- `/api/memory/clusters` — Cluster metadata
- `/api/hooks/activity` — Hook logs
- `/api/cron/status` — Cron job health

### ClawText Memory System
- `memory/YYYY-MM-DD.md` — Daily notes
- `memory/clusters/*.yaml` — Cluster data
- `memory/extract-buffer.jsonl` — Rolling buffer
- `memory/extract-state.json` — Extraction state

### Provider APIs (if configured)
- Model usage/cost endpoints
- Health check endpoints

## 🔄 Real-time Updates

Dashboard subscribes to OpenClaw gateway events via WebSocket:
- Session start/end
- Memory extraction events
- Hook triggers
- Cron job completions
- Model response events

## 📱 Mobile Considerations

- Collapsible sidebar navigation
- Touch-friendly charts
- Reduced data density on small screens
- Offline mode for cached data

## 🚧 Development Status

**Phase 1 (Current):** Foundation
- [ ] Project scaffolding
- [ ] Basic layout (sidebar, header, main area)
- [ ] Theme system (light/dark)
- [ ] Module registry
- [ ] Mock data for testing

**Phase 2:** Core Modules
- [ ] Memory Browser (read-only)
- [ ] Model metrics (static charts)
- [ ] Agent status list
- [ ] System health indicators

**Phase 3:** Real-time & Interactivity
- [ ] WebSocket integration
- [ ] Live updates
- [ ] Memory search (live)
- [ ] Session history viewer
- [ ] Module controls (trigger rebuild, kill agent, etc.)

**Phase 4:** Polish & Advanced
- [ ] Custom widget builder
- [ ] Dashboard layout persistence
- [ ] Export reports (PDF, CSV)
- [ ] Alerting/notifications
- [ ] Role-based access control

## 🤝 Contributing

1. Create a new module in `src/modules/your-feature/`
2. Register it in `src/config/modules.ts`
3. Add tests in `src/modules/your-feature/__tests__/`
4. Update this README with your module's docs

## 📝 License

Internal use only (OpenClaw project)

---

*Built with ❤️ for the OpenClaw ecosystem*
