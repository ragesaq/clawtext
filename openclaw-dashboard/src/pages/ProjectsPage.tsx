import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getProductName, getLaneName } from '@/data/clawtaskSeed'
import { useClawTaskData } from '@/hooks/useClawTaskData'
import { getProductStats } from '@/lib/clawtaskSelectors'
import { FolderKanban, Milestone, Link2, Layers3, ShieldAlert } from 'lucide-react'

function statusBadgeClass(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-500/10 text-green-600'
    case 'ready':
    case 'planned':
      return 'bg-blue-500/10 text-blue-600'
    case 'proposed':
    case 'watching':
      return 'bg-yellow-500/10 text-yellow-700'
    case 'review':
      return 'bg-purple-500/10 text-purple-600'
    case 'blocked':
      return 'bg-orange-500/10 text-orange-600'
    default:
      return 'bg-secondary text-muted-foreground'
  }
}

export default function ProjectsPage() {
  const { data, source } = useClawTaskData()
  const stats = getProductStats(data)
  const epicStatusCounts = data.epics.reduce<Record<string, number>>((acc, epic) => {
    acc[epic.status] = (acc[epic.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Products</CardTitle><FolderKanban className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.productCount}</div><p className="text-xs text-muted-foreground">Platform map from {source}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Epics</CardTitle><Layers3 className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.epicCount}</div><p className="text-xs text-muted-foreground">Across the current pillar set</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Milestones</CardTitle><Milestone className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.milestoneCount}</div><p className="text-xs text-muted-foreground">Delivery targets</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Dependencies</CardTitle><Link2 className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.dependencyCount}</div><p className="text-xs text-muted-foreground">Critical path links</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Blockers</CardTitle><ShieldAlert className="w-4 h-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.blockerCount}</div><p className="text-xs text-muted-foreground">Explicit blocker objects</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Data Source</CardTitle><FolderKanban className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-lg font-bold">{source}</div><p className="text-xs text-muted-foreground">Loadable board layer</p></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-3">
          <CardHeader><CardTitle>Milestone 1 Summary</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">In scope</p>
                <div className="space-y-2">{data.milestoneFocus.inScope.map((item) => <div key={item} className="rounded-lg bg-secondary p-2.5 text-sm">{item}</div>)}</div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Out of scope</p>
                <div className="space-y-2">{data.milestoneFocus.outOfScope.map((item) => <div key={item} className="rounded-lg border border-border p-2.5 text-sm text-muted-foreground">{item}</div>)}</div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Epic status overview</p>
              <div className="space-y-2">{Object.entries(epicStatusCounts).map(([status, count]) => <div key={status} className="flex items-center justify-between rounded-lg bg-secondary p-2.5 text-sm"><span className="capitalize">{status}</span><Badge className={statusBadgeClass(status)}>{count}</Badge></div>)}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2"><CardHeader><CardTitle>Products</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{data.products.map((product) => <div key={product.id} className="rounded-lg bg-secondary p-3"><div className="mb-2 flex items-start justify-between gap-3"><div><p className="font-medium">{product.name}</p><p className="mt-1 text-xs text-muted-foreground">{product.description}</p></div><Badge className={statusBadgeClass(product.status)}>{product.status}</Badge></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><Badge className="bg-background text-foreground">{product.priority}</Badge><span>{data.lanes.filter((lane) => lane.productId === product.id).length} lanes</span><span>•</span><span>{data.epics.filter((epic) => epic.productId === product.id).length} epics</span></div></div>)}</CardContent></Card>

        <Card><CardHeader><CardTitle>Open Blockers</CardTitle></CardHeader><CardContent className="space-y-2.5">{data.blockers.map((blocker) => <div key={blocker.id} className="rounded-lg border border-border p-3"><div className="mb-1 flex items-center justify-between gap-2"><p className="text-sm font-medium">{blocker.title}</p><Badge className={statusBadgeClass('blocked')}>{blocker.severity}</Badge></div><p className="text-xs text-muted-foreground">{blocker.description}</p></div>)}</CardContent></Card>

        <Card><CardHeader><CardTitle>Milestones</CardTitle></CardHeader><CardContent className="space-y-2.5">{data.milestones.map((milestone) => <div key={milestone.id} className="rounded-lg border border-border p-3"><div className="mb-1 flex items-center justify-between gap-2"><p className="text-sm font-medium">{milestone.title}</p><Badge className={statusBadgeClass(milestone.status)}>{milestone.status}</Badge></div><p className="text-xs text-muted-foreground">{getProductName(milestone.productId)}</p></div>)}</CardContent></Card>

        <Card className="xl:col-span-2"><CardHeader><CardTitle>Critical Dependency Map</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.dependencies.map((dependency) => <div key={dependency.id} className="rounded-lg bg-secondary p-3 text-sm"><p className="font-medium">{dependency.kind}</p><p className="mt-2 text-muted-foreground">{dependency.fromRef}</p><p className="text-muted-foreground">→ {dependency.toRef}</p></div>)}</CardContent></Card>

        <Card className="xl:col-span-2"><CardHeader><CardTitle>Epics</CardTitle></CardHeader><CardContent className="space-y-2.5">{data.epics.map((epic) => <div key={epic.id} className="rounded-lg border border-border p-3"><div className="mb-2 flex items-center justify-between gap-3"><div><p className="text-sm font-medium">{epic.title}</p><p className="text-xs text-muted-foreground">{getProductName(epic.productId)} • {getLaneName(epic.laneId)}</p></div><div className="flex items-center gap-2"><Badge className="bg-background text-foreground">{epic.priority}</Badge><Badge className={statusBadgeClass(epic.status)}>{epic.status}</Badge></div></div></div>)}</CardContent></Card>

        <Card><CardHeader><CardTitle>Artifacts</CardTitle></CardHeader><CardContent className="space-y-2.5">{data.artifacts.map((artifact) => <div key={artifact.id} className="rounded-lg border border-border p-3"><p className="text-sm font-medium">{artifact.title}</p><p className="mt-1 text-xs text-muted-foreground">{artifact.pathOrUrl}</p></div>)}</CardContent></Card>
      </div>
    </div>
  )
}
