import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useOpsMetrics } from '@/hooks/useOpsMetrics'
import { formatRelativeFromIso } from '@/lib/timeFormat'

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

export default function TopOpsStrip() {
  const ops = useOpsMetrics()
  const openaiPct = ops.openaiPlus.fiveHourWindow.usedPct
  const weeklyPct = ops.openaiPlus.weeklyWindow.usedPct
  const copilotPct = (ops.copilot.monthlyPremiumMessages.used / ops.copilot.monthlyPremiumMessages.limit) * 100

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <Card>
        <CardContent className="p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Data source</span>
            <Badge className="bg-secondary text-foreground">{ops.source}</Badge>
          </div>
          <p className="text-sm font-medium">updated {formatRelativeFromIso(ops.updatedAt)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">OpenAI 5h</span>
            <span>{openaiPct}%</span>
          </div>
          <ProgressBar value={openaiPct} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">OpenAI weekly</span>
            <span>{weeklyPct}%</span>
          </div>
          <ProgressBar value={weeklyPct} colorClass="bg-blue-500" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Copilot premium</span>
            <span>{ops.copilot.monthlyPremiumMessages.used}/{ops.copilot.monthlyPremiumMessages.limit}</span>
          </div>
          <ProgressBar value={copilotPct} colorClass="bg-purple-500" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex h-full items-center gap-2 p-3">
          <div className="flex flex-wrap gap-2">
            {ops.providers.map((provider) => (
              <Badge key={provider.id} className={statusClass(provider.status)}>
                {provider.name}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
