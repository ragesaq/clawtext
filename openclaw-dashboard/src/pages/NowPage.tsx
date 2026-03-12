import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import TopOpsStrip from '@/components/TopOpsStrip'
import { getProductName } from '@/data/clawtaskSeed'
import { useClawTaskData } from '@/hooks/useClawTaskData'
import { getActiveTasks, getBlockedTasks, getPriorityCounts, getReadyTasks, getReviewTasks } from '@/lib/clawtaskSelectors'
import { AlertTriangle, Clock, Activity, Users, ArrowRightCircle, ShieldAlert, BarChart3, Database, Cpu, FolderOpen, BookOpen, Brain, GitBranch, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

function priorityClass(priority: string) {
  switch (priority) {
    case 'p0': return 'bg-red-500/10 text-red-600'
    case 'p1': return 'bg-orange-500/10 text-orange-600'
    case 'p2': return 'bg-yellow-500/10 text-yellow-700'
    default: return 'bg-secondary text-muted-foreground'
  }
}

const diveCards = [
  { to: '/tasks', title: 'Current execution', detail: 'Board, blockers, linked threads, task actions', icon: GitBranch },
  { to: '/docs', title: 'Specs and plans', detail: 'Edit milestone docs, models, contracts, drafts', icon: BookOpen },
  { to: '/memory', title: 'Context + learnings', detail: 'Daily memory, long-term memory, working notes', icon: Brain },
  { to: '/costs', title: 'Health / costs', detail: 'Model usage, quotas, provider state, live burn', icon: BarChart3 },
  { to: '/projects', title: 'Program structure', detail: 'Products, lanes, milestones, portfolio framing', icon: FolderOpen },
]

export default function NowPage() {
  const { data, source } = useClawTaskData()
  const activeTasks = getActiveTasks(data)
  const blockedTasks = getBlockedTasks(data)
  const readyTasks = getReadyTasks(data)
  const reviewTasks = getReviewTasks(data)
  const priorityCounts = getPriorityCounts(data)
  const activeProductCount = data.products.filter((product) => product.status === 'active').length
  const activeMilestone = data.milestones.find((milestone) => milestone.id === data.milestoneFocus.id) ?? data.milestones.find((milestone) => milestone.status === 'active')
  const activeProducts = data.products.filter((product) => product.status === 'active')
  const needsAttention = [...activeTasks, ...blockedTasks, ...readyTasks.filter((task) => task.priority === 'p0')].slice(0, 5)
  const recentImportant = reviewTasks.slice(0, 4)
  const currentPhaseNarrative = 'We are in coordination-layer-first mode: making ClawDash a real operator cockpit with editable docs, memory, task board, Discord linkage, and practical task-to-agent/task-to-thread handoff.'

  return (
    <div className="space-y-4">
      <TopOpsStrip />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Open Incidents</CardTitle><ShieldAlert className="w-4 h-4 text-orange-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{blockedTasks.length || 0}</div><p className="text-xs text-muted-foreground">Proxy incidents from blocked work</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Blocked P0/P1</CardTitle><AlertTriangle className="w-4 h-4 text-yellow-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{blockedTasks.filter((task) => task.priority === 'p0' || task.priority === 'p1').length}</div><p className="text-xs text-muted-foreground">Decision/dependency constrained</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active Products</CardTitle><Users className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{activeProductCount}</div><p className="text-xs text-muted-foreground">Products currently in motion</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">P0 Tasks</CardTitle><Clock className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{priorityCounts.p0}</div><p className="text-xs text-muted-foreground">Highest-priority execution items</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Board Source</CardTitle><Database className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-lg font-bold">{source}</div><p className="text-xs text-muted-foreground">Loadable board data layer</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Ops Readiness</CardTitle><Cpu className="w-4 h-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-lg font-bold">Phase 1</div><p className="text-xs text-muted-foreground">Coordination layer active</p></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Where the project stands</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg bg-secondary p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium"><Activity className="h-4 w-4 text-primary" />Current phase</div>
              <div className="text-sm">{activeMilestone?.title ?? 'Milestone 1 — Coordination Layer'}</div>
              <div className="mt-1 text-xs text-muted-foreground">{currentPhaseNarrative}</div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <div className="mb-2 text-xs text-muted-foreground">In scope now</div>
                <div className="space-y-2">{data.milestoneFocus.inScope.slice(0, 5).map((item) => <div key={item} className="text-sm">• {item}</div>)}</div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="mb-2 text-xs text-muted-foreground">Not the current phase</div>
                <div className="space-y-2">{data.milestoneFocus.outOfScope.slice(0, 5).map((item) => <div key={item} className="text-sm text-muted-foreground">• {item}</div>)}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="mb-2 text-xs text-muted-foreground">Active product stack</div>
              <div className="flex flex-wrap gap-2">{activeProducts.map((product) => <Badge key={product.id} className={priorityClass(product.priority)}>{product.name}</Badge>)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>How to dive in</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {diveCards.map(({ to, title, detail, icon: Icon }) => (
              <Link key={to} to={to} className="block rounded-lg border border-border p-3 hover:bg-accent">
                <div className="mb-1 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-medium"><Icon className="h-4 w-4 text-primary" />{title}</div><ExternalLink className="h-4 w-4 text-muted-foreground" /></div>
                <div className="text-xs text-muted-foreground">{detail}</div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Operator landing hints</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-secondary p-3 text-sm"><div className="mb-1 font-medium">Want the current phase?</div><div className="text-xs text-muted-foreground">Start here on <b>Now</b>, then go to <b>Tasks</b> for execution detail.</div></div>
            <div className="rounded-lg bg-secondary p-3 text-sm"><div className="mb-1 font-medium">Want rationale/specs?</div><div className="text-xs text-muted-foreground">Go to <b>Docs</b> for domain models, milestone locks, event schema, telemetry model, and handoff docs.</div></div>
            <div className="rounded-lg bg-secondary p-3 text-sm"><div className="mb-1 font-medium">Want thread/context continuity?</div><div className="text-xs text-muted-foreground">Go to <b>Tasks</b> for Discord linkage and task handoff, then <b>Memory</b> for narrative continuity.</div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Operational Heads Up</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-lg bg-secondary p-3 text-sm"><div className="mb-1 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><span className="font-medium">Usage pulse seeded</span></div><p className="text-xs text-muted-foreground">Sidebar is ready for non-LLM cron-fed OpenAI/Copilot usage stats.</p></div>
            <div className="rounded-lg bg-secondary p-3 text-sm"><div className="mb-1 flex items-center gap-2"><Database className="h-4 w-4 text-primary" /><span className="font-medium">Board is editable</span></div><p className="text-xs text-muted-foreground">Tasks now support notes, findings, subtasks, Discord linkage, and task action packets.</p></div>
            <div className="rounded-lg bg-secondary p-3 text-sm"><div className="mb-1 flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /><span className="font-medium">Health/Costs are the next live pillar</span></div><p className="text-xs text-muted-foreground">Prometheus/Grafana depth still follows later after the shared snapshot contract.</p></div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Needs Attention Now</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">{needsAttention.map((task) => <div key={task.id} className="rounded-lg bg-secondary p-3"><div className="mb-1 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><ArrowRightCircle className="h-4 w-4 text-primary" /><p className="text-sm font-medium">{task.title}</p></div><Badge className={priorityClass(task.priority)}>{task.priority}</Badge></div><p className="text-xs text-muted-foreground">{getProductName(task.productId)} • {task.status}</p></div>)}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Open Blockers</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">{data.blockers.map((blocker) => <div key={blocker.id} className="rounded-lg bg-secondary p-3"><p className="text-sm font-medium">{blocker.title}</p><p className="mt-1 text-xs text-muted-foreground">{blocker.description}</p></div>)}</CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Recent Important Activity</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">{recentImportant.map((task) => <div key={task.id} className="flex items-center gap-3 rounded-lg bg-secondary p-3"><Activity className="h-4 w-4 text-green-500" /><div><p className="text-sm font-medium">{task.title}</p><p className="text-xs text-muted-foreground">Review state • {getProductName(task.productId)}</p></div></div>)}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ready Queue</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">{readyTasks.length > 0 ? readyTasks.map((task) => <div key={task.id} className="rounded-lg bg-secondary p-3 text-sm"><div className="flex items-center justify-between gap-2"><span>{task.title}</span><Badge className={priorityClass(task.priority)}>{task.priority}</Badge></div></div>) : <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">No ready tasks.</div>}</CardContent>
        </Card>
      </div>
    </div>
  )
}
