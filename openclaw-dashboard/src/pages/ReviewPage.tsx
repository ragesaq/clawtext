import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { AlertTriangle, Archive, Eye } from 'lucide-react'

const staleItems = [
  'Provider health lane still conceptual until incident + telemetry layers produce real signals.',
  'ClawText browser density/full-canvas behavior still needs implementation work.',
  'Routing preferences are known informally but not yet in a structured registry.',
]

const cleanupItems = [
  'Promote the new v0 design docs into the seed board and UI surfaces.',
  'Convert event schema and incident taxonomy into machine-readable registries.',
  'Replace placeholder metrics with Prometheus-backed queries.',
]

export default function ReviewPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stale Items</CardTitle>
            <Eye className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Needs re-entry or follow-up</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cleanup Candidates</CardTitle>
            <Archive className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Low-friction maintenance wins</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Risk Watch</CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Coordination drift + missing telemetry wiring</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Stale / Aging Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {staleItems.map((item) => (
              <div key={item} className="rounded-lg bg-secondary p-4 text-sm">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cleanup / Review Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cleanupItems.map((item) => (
              <div key={item} className="rounded-lg border border-border p-4 text-sm">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
