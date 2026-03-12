import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MiniBars } from '@/components/ui/MiniBars'
import TopOpsStrip from '@/components/TopOpsStrip'
import { useOpsMetrics } from '@/hooks/useOpsMetrics'
import { formatRelativeFromIso } from '@/lib/timeFormat'
import { Terminal, Clock, RefreshCw, AlertTriangle, CheckCircle, Activity, Database } from 'lucide-react'

function statusClass(status: 'healthy' | 'degraded' | 'down') {
  switch (status) {
    case 'healthy': return 'bg-green-500/10 text-green-600'
    case 'degraded': return 'bg-orange-500/10 text-orange-600'
    default: return 'bg-red-500/10 text-red-600'
  }
}

export default function SystemHealth() {
  const ops = useOpsMetrics()

  const cronJobs = [
    { id: 'extraction', name: 'Memory Extraction', schedule: 'Every 20 minutes', lastRun: '2026-03-11T06:40:00Z', nextRun: '2026-03-11T07:00:00Z', status: 'healthy', duration: '2.3s' },
    { id: 'daily-rebuild', name: 'Daily Cluster Rebuild', schedule: '2:00 AM UTC', lastRun: '2026-03-11T02:00:00Z', nextRun: '2026-03-12T02:00:00Z', status: 'healthy', duration: '45s' },
    { id: 'usage-collector', name: 'Usage Pulse Collector', schedule: 'Every 15 minutes', lastRun: '2026-03-11T07:15:00Z', nextRun: '2026-03-11T07:30:00Z', status: 'healthy', duration: '0.6s' },
  ]

  const hooks = [
    { name: 'clawtext-extract', status: 'active', lastTrigger: '2m ago', count: 342 },
    { name: 'clawtext-flush', status: 'active', lastTrigger: '15m ago', count: 12 },
    { name: 'session-memory', status: 'active', lastTrigger: '5m ago', count: 89 },
    { name: 'command-logger', status: 'active', lastTrigger: '1m ago', count: 156 },
  ]

  const systemMetrics = [
    { label: 'Gateway Daemon', value: 'Running', status: 'healthy' },
    { label: 'Board Source', value: 'public-json', status: 'healthy' },
    { label: 'Usage Pulse', value: ops.source, status: 'healthy' },
    { label: 'RAG Quality', value: '72%', status: 'warning' },
    { label: 'Provider Mix', value: `${ops.providers.length} tracked`, status: 'healthy' },
    { label: 'ClawSaver', value: `${Math.round(ops.costs.clawsaver.savingsRatio * 100)}%`, status: 'healthy' },
  ]

  return (
    <div className="space-y-4">
      <TopOpsStrip />

      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Health</h1>
          <p className="text-muted-foreground">Providers, cron jobs, hooks, data sources, and operational heads-up</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge className="bg-secondary text-foreground">{ops.source}</Badge>
          <span>updated {formatRelativeFromIso(ops.updatedAt)}</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {systemMetrics.map((metric, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              {metric.status === 'healthy' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
            </CardHeader>
            <CardContent><div className="text-lg font-bold">{metric.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Provider Status Strip</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ops.providers.map((provider) => (
              <div key={provider.id} className="rounded-lg bg-secondary p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{provider.name}</p>
                  <Badge className={statusClass(provider.status)}>{provider.status}</Badge>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                  <div><p className="text-muted-foreground">Latency</p><p className="font-semibold">{provider.latencyMs}ms</p></div>
                  <div><p className="text-muted-foreground">Errors</p><p className="font-semibold">{provider.errorRatePct}%</p></div>
                </div>
                <MiniBars values={provider.trend} colorClass={provider.status === 'degraded' ? 'bg-orange-500' : 'bg-primary'} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Data pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><Database className="h-4 w-4 text-primary" />Board + usage are loadable</div>
            <div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              Health and Costs are now reading a shared ops-metrics snapshot and exposing source freshness in the UI.
            </div>
            <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
              Next step for this lane: replace seed snapshots with cron collectors, then mirror longer history into Grafana.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cron Jobs</CardTitle>
            <button className="flex items-center gap-2 rounded bg-secondary px-3 py-1.5 text-sm hover:bg-accent"><RefreshCw className="w-3 h-3" />Refresh</button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {cronJobs.map((job) => (
            <div key={job.id} className="rounded-lg bg-secondary p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-muted-foreground" /><span className="font-medium">{job.name}</span></div>
                <span className="rounded bg-green-500/10 px-2 py-1 text-xs text-green-500">{job.status}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Schedule</p><p>{job.schedule}</p></div>
                <div><p className="text-xs text-muted-foreground">Last Run</p><p>{new Date(job.lastRun).toLocaleTimeString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Next Run</p><p>{new Date(job.nextRun).toLocaleTimeString()}</p></div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Hook Activity</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {hooks.map((hook) => (
            <div key={hook.name} className="flex items-center justify-between rounded bg-secondary p-3">
              <div className="flex items-center gap-3"><Terminal className="w-4 h-4 text-muted-foreground" /><div><p className="text-sm font-medium">{hook.name}</p><p className="text-xs text-muted-foreground">Last: {hook.lastTrigger} • Total: {hook.count} triggers</p></div></div>
              <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-green-500" /><span className="text-xs text-green-500">{hook.status}</span></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
