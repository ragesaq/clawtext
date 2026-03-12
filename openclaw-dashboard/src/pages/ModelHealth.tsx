import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { MiniBars } from '@/components/ui/MiniBars'
import { ProgressBar } from '@/components/ui/ProgressBar'
import TopOpsStrip from '@/components/TopOpsStrip'
import { useOpsMetrics } from '@/hooks/useOpsMetrics'
import { formatRelativeFromIso } from '@/lib/timeFormat'
import { estimateDaysRemainingFromPct, estimateDaysUntilCap, estimateHoursRemainingFromPct, formatRemaining } from '@/lib/usageMath'
import { Activity, TrendingUp, AlertCircle, CheckCircle, Gauge, Wallet, BarChart3 } from 'lucide-react'

function statusClass(status: 'healthy' | 'degraded' | 'down') {
  switch (status) {
    case 'healthy':
      return 'bg-green-500/10 text-green-600'
    case 'degraded':
      return 'bg-orange-500/10 text-orange-600'
    default:
      return 'bg-red-500/10 text-red-600'
  }
}

export default function ModelHealth() {
  const ops = useOpsMetrics()
  const fiveHourRemaining = estimateHoursRemainingFromPct(
    ops.openaiPlus.fiveHourWindow.usedPct,
    ops.openaiPlus.fiveHourWindow.hoursElapsed,
  )
  const weeklyRemaining = estimateDaysRemainingFromPct(
    ops.openaiPlus.weeklyWindow.usedPct,
    ops.openaiPlus.weeklyWindow.daysElapsed,
  )
  const copilotRemaining = estimateDaysUntilCap(
    ops.copilot.monthlyPremiumMessages.used,
    ops.copilot.monthlyPremiumMessages.limit,
    ops.copilot.monthlyPremiumMessages.dayOfMonth,
  )

  return (
    <div className="space-y-4">
      <TopOpsStrip />

      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Costs / Usage</h1>
          <p className="text-muted-foreground">Subscriptions, quotas, metered API spend, and first-pass trend estimates</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge className="bg-secondary text-foreground">{ops.source}</Badge>
          <span>updated {formatRelativeFromIso(ops.updatedAt)}</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">OpenAI 5h Window</CardTitle><Gauge className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{ops.openaiPlus.fiveHourWindow.usedPct}%</div><p className="text-xs text-muted-foreground">{formatRemaining(fiveHourRemaining, 'hours')} at current pace</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">OpenAI Weekly</CardTitle><Activity className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{ops.openaiPlus.weeklyWindow.usedPct}%</div><p className="text-xs text-muted-foreground">{formatRemaining(weeklyRemaining, 'days')} at current pace</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Copilot Premium</CardTitle><Gauge className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{ops.copilot.monthlyPremiumMessages.used}/{ops.copilot.monthlyPremiumMessages.limit}</div><p className="text-xs text-muted-foreground">{formatRemaining(copilotRemaining, 'days')} at current pace</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Metered APIs Today</CardTitle><Wallet className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">${ops.costs.meteredApis.todayUsd.toFixed(2)}</div><p className="text-xs text-muted-foreground">${ops.costs.meteredApis.weekUsd.toFixed(2)} this week</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">ClawSaver Savings</CardTitle><TrendingUp className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{Math.round(ops.costs.clawsaver.savingsRatio * 100)}%</div><p className="text-xs text-muted-foreground">{ops.costs.clawsaver.callsSaved} calls saved</p></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>ChatGPT Plus Quota</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm"><span>5 hour window</span><span>{ops.openaiPlus.fiveHourWindow.usedPct}% used</span></div>
              <ProgressBar value={ops.openaiPlus.fiveHourWindow.usedPct} />
              <div className="mt-2">
                <MiniBars values={ops.openaiPlus.fiveHourWindow.historyPct} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Trend estimate: {formatRemaining(fiveHourRemaining, 'hours')}</p>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm"><span>Weekly window</span><span>{ops.openaiPlus.weeklyWindow.usedPct}% used</span></div>
              <ProgressBar value={ops.openaiPlus.weeklyWindow.usedPct} colorClass="bg-blue-500" />
              <div className="mt-2">
                <MiniBars values={ops.openaiPlus.weeklyWindow.historyPct} colorClass="bg-blue-500" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Trend estimate: {formatRemaining(weeklyRemaining, 'days')}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>GitHub Copilot Premium</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm"><span>Monthly premium messages</span><span>{ops.copilot.monthlyPremiumMessages.used}/{ops.copilot.monthlyPremiumMessages.limit}</span></div>
              <ProgressBar value={(ops.copilot.monthlyPremiumMessages.used / ops.copilot.monthlyPremiumMessages.limit) * 100} colorClass="bg-purple-500" />
              <div className="mt-2">
                <MiniBars values={ops.copilot.monthlyPremiumMessages.historyUsed} colorClass="bg-purple-500" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Trend estimate: {formatRemaining(copilotRemaining, 'days')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-secondary p-3"><p className="text-xs text-muted-foreground">Chat requests today</p><p className="text-lg font-semibold">{ops.copilot.chatRequestsToday}</p></div>
              <div className="rounded-lg bg-secondary p-3"><p className="text-xs text-muted-foreground">Accept rate</p><p className="text-lg font-semibold">{Math.round(ops.copilot.acceptRate * 100)}%</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Metered Spend + Efficiency</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm"><span>Metered API cost</span><span>${ops.costs.meteredApis.todayUsd.toFixed(2)} today</span></div>
              <MiniBars values={ops.costs.meteredApis.trendUsd} colorClass="bg-emerald-500" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm"><span>ClawSaver trend</span><span>{Math.round(ops.costs.clawsaver.savingsRatio * 100)}%</span></div>
              <MiniBars values={ops.costs.clawsaver.trendPct} colorClass="bg-cyan-500" />
            </div>
            <div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              Source: {ops.source}. Replace with cron-fed collectors and live provider usage sources when available.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Provider Status</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {ops.providers.map((provider) => (
              <div key={provider.id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{provider.name}</p>
                  <div className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${statusClass(provider.status)}`}>
                    {provider.status === 'healthy' ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {provider.status}
                  </div>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-muted-foreground">Latency</p><p className="font-semibold">{provider.latencyMs}ms</p></div>
                  <div><p className="text-muted-foreground">Error rate</p><p className="font-semibold">{provider.errorRatePct}%</p></div>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">{provider.throughputLabel}</p>
                <MiniBars values={provider.trend} colorClass={provider.status === 'degraded' ? 'bg-orange-500' : 'bg-primary'} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Grafana phase</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-foreground"><BarChart3 className="h-4 w-4 text-primary" />Deep time-series belongs there</div>
            <div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
              ClawDash should stay the operator surface. Grafana should become the deep-dive layer for burn, long windows, alerts, and provider comparisons.
            </div>
            <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
              Good future Grafana panels:
              <ul className="mt-2 list-disc pl-4">
                <li>OpenAI 5h/weekly burn history</li>
                <li>Copilot monthly premium burn</li>
                <li>OpenRouter spend + latency correlation</li>
                <li>ClawSaver savings over time</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
