import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { BarChart3, RefreshCw, ExternalLink, Settings } from 'lucide-react'

interface GrafanaDashboard {
  id: string
  name: string
  description: string
  url: string
  folder: string
  tags: string[]
  lastUpdated: string
}

export default function GrafanaMetrics() {
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('6h')

  // Mock data - will be replaced with real Grafana API calls
  const dashboards: GrafanaDashboard[] = [
    {
      id: 'openclaw-overview',
      name: 'OpenClaw Overview',
      description: 'Gateway health, session metrics, and system status',
      url: 'http://localhost:3000/d/openclaw-overview/openclaw-overview',
      folder: 'OpenClaw',
      tags: ['gateway', 'sessions', 'health'],
      lastUpdated: '2026-03-10T18:00:00Z',
    },
    {
      id: 'model-performance',
      name: 'Model Performance',
      description: 'Latency, error rates, token usage, and cost tracking',
      url: 'http://localhost:3000/d/model-performance/model-metrics',
      folder: 'AI Providers',
      tags: ['models', 'performance', 'cost'],
      lastUpdated: '2026-03-10T19:30:00Z',
    },
    {
      id: 'clawtext-memory',
      name: 'ClawText Memory System',
      description: 'Memory extraction, cluster quality, RAG injection metrics',
      url: 'http://localhost:3000/d/clawtext-memory/memory-analytics',
      folder: 'ClawText',
      tags: ['memory', 'clawtext', 'rag'],
      lastUpdated: '2026-03-10T19:00:00Z',
    },
    {
      id: 'clawsaver-batching',
      name: 'ClawSaver Batching',
      description: 'Message batching efficiency, API calls saved, cost reduction',
      url: 'http://localhost:3000/d/clawsaver/clawsaver-metrics',
      folder: 'ClawSaver',
      tags: ['clawsaver', 'batching', 'cost-savings'],
      lastUpdated: '2026-03-10T19:15:00Z',
    },
    {
      id: 'agent-orchestration',
      name: 'Agent Orchestration',
      description: 'Sub-agent status, session lifecycle, task completion rates',
      url: 'http://localhost:3000/d/agents/agent-orchestration',
      folder: 'Agents',
      tags: ['agents', 'orchestration', 'sessions'],
      lastUpdated: '2026-03-10T18:45:00Z',
    },
  ]

  const timeRanges = [
    { value: '1h', label: 'Last Hour' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
  ]

  const selectedDash = dashboards.find(d => d.id === selectedDashboard)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-orange-500" />
            Grafana Metrics
          </h1>
          <p className="text-muted-foreground">Advanced analytics and performance monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 bg-secondary rounded-lg text-sm border border-input"
          >
            {timeRanges.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <button className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg hover:bg-accent text-sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Grafana
          </a>
        </div>
      </div>

      {/* Dashboard List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {dashboards.map((dashboard) => (
          <Card
            key={dashboard.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedDashboard === dashboard.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedDashboard(dashboard.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{dashboard.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dashboard.folder}
                  </p>
                </div>
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {dashboard.description}
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                {dashboard.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-secondary text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Updated: {new Date(dashboard.lastUpdated).toLocaleString()}</span>
                <button className="flex items-center gap-1 hover:text-primary">
                  <Settings className="w-3 h-3" />
                  Configure
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Embedded Grafana Dashboard */}
      {selectedDash && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{selectedDash.name}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Time range: {timeRange}
                </span>
                <a
                  href={`${selectedDash.url}?from=now-${timeRange}&to=now&kiosk`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 bg-secondary rounded text-xs hover:bg-accent"
                >
                  <ExternalLink className="w-3 h-3" />
                  Full Screen
                </a>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border border-border rounded-lg overflow-hidden bg-background">
              <iframe
                src={`${selectedDash.url}?from=now-${timeRange}&to=now&kiosk&theme=dark`}
                title={selectedDash.name}
                className="w-full"
                style={{ height: '600px', border: 'none' }}
                loading="lazy"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Tip: Click "Full Screen" to open this dashboard in a new tab with all Grafana features
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats from Grafana API */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2s</div>
            <div className="text-xs text-green-500">↓ 8% from yesterday</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.3%</div>
            <div className="text-xs text-green-500">↓ 0.1% from yesterday</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings (ClawSaver)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28%</div>
            <div className="text-xs text-green-500">↑ 3% from yesterday</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Memory Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">72%</div>
            <div className="text-xs text-orange-500">↑ 2% from yesterday</div>
          </CardContent>
        </Card>
      </div>

      {/* Grafana Integration Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><strong>Setup Requirements:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Grafana server running (default: http://localhost:3000)</li>
            <li>OpenClaw data sources configured (Prometheus, InfluxDB, or PostgreSQL)</li>
            <li>Dashboard JSON files imported or created via Grafana UI</li>
            <li>Anonymous access enabled or API key configured for embedding</li>
          </ul>

          <p className="mt-3"><strong>Data Sources to Monitor:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>OpenClaw Gateway metrics (sessions, hooks, cron jobs)</li>
            <li>Model provider APIs (latency, tokens, costs, errors)</li>
            <li>ClawText memory system (extraction rate, cluster quality)</li>
            <li>ClawSaver batching (calls saved, batch efficiency)</li>
            <li>System resources (CPU, memory, disk usage)</li>
          </ul>

          <p className="mt-3"><strong>Recommended Dashboards:</strong></p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Real-time gateway health with alert thresholds</li>
            <li>Cost tracking with provider breakdown</li>
            <li>Memory system health and RAG quality trends</li>
            <li>Agent orchestration success/failure rates</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
