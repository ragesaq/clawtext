import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getLaneName, getProductName, type BoardStatus, type ClawTaskSeed, type HandoffMode, type HandoffPreference, type Priority, type Task, type TaskSubtask } from '@/data/clawtaskSeed'
import { useClawTaskData } from '@/hooks/useClawTaskData'
import { getBoardColumns } from '@/lib/clawtaskSelectors'
import TopOpsStrip from '@/components/TopOpsStrip'
import { Save, RefreshCw, Sparkles, Clipboard, Search, AlertTriangle, Bot, Hammer, Eye, MessageSquareText, Send, Link2, Rocket } from 'lucide-react'

function titleForStatus(status: string) {
  switch (status) {
    case 'backlog': return 'Vision / Backlog'
    case 'watching': return 'Watching / Ongoing'
    default: return status.charAt(0).toUpperCase() + status.slice(1)
  }
}
function priorityClass(priority: string) {
  switch (priority) {
    case 'p0': return 'bg-red-500/10 text-red-600'
    case 'p1': return 'bg-orange-500/10 text-orange-600'
    case 'p2': return 'bg-yellow-500/10 text-yellow-700'
    default: return 'bg-secondary text-muted-foreground'
  }
}
const statuses: BoardStatus[] = ['backlog', 'ready', 'active', 'blocked', 'review', 'done', 'watching']
const priorities: Priority[] = ['p0', 'p1', 'p2', 'p3']
const taskTypes: Task['type'][] = ['design', 'code', 'infra', 'docs']
const handoffPreferences: HandoffPreference[] = ['new_forum_post', 'existing_thread']

interface ValidationResult { checkedAt: string; ok: boolean; missingRefs: { dependencyId: string; side: string; ref: string }[]; cycles: string[][] }
interface DiscordTargetInfo { targetKind: 'new_forum_post' | 'existing_thread'; targetId: string | null; targetSummary: string }
interface AgentActionPacket { generatedAt: string; action: HandoffMode; title: string; taskId: string; suggestedPrompt: string; suggestedLabel: string; suggestedOutcome: string[]; discordTarget: DiscordTargetInfo }
interface DiscordHandoffPacket { generatedAt: string; mode: HandoffMode; forumTitle: string; forumBody: string; threadUpdate: string; discordTarget: DiscordTargetInfo }
interface DiscordExecutionResult { ok: boolean; executedAt: string; packet: DiscordHandoffPacket; task: Task }

function updateTaskInBoard(board: ClawTaskSeed, taskId: string, updater: (task: Task) => Task) {
  return { ...board, tasks: board.tasks.map((task) => (task.id === taskId ? updater(task) : task)) }
}

export default function TasksPage() {
  const { data, source, reload, setData } = useClawTaskData()
  const columns = getBoardColumns(data)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [researchBrief, setResearchBrief] = useState('')
  const [agentPacket, setAgentPacket] = useState<AgentActionPacket | null>(null)
  const [discordPacket, setDiscordPacket] = useState<DiscordHandoffPacket | null>(null)
  const [executionResult, setExecutionResult] = useState<DiscordExecutionResult | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedTaskId || !data.tasks.some((task) => task.id === selectedTaskId)) setSelectedTaskId(data.tasks[0]?.id ?? null)
  }, [data.tasks, selectedTaskId])
  const selectedTask = useMemo(() => data.tasks.find((task) => task.id === selectedTaskId) ?? null, [data.tasks, selectedTaskId])
  const activeCount = data.tasks.filter((task) => task.status === 'active').length
  const blockedCount = data.tasks.filter((task) => task.status === 'blocked').length
  const reviewCount = data.tasks.filter((task) => task.status === 'review').length
  const readyCount = data.tasks.filter((task) => task.status === 'ready').length
  const isDirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(window.__clawdashLastSavedBoard ?? data), [data])

  useEffect(() => { window.__clawdashLastSavedBoard = data }, [])

  const updateTask = <K extends keyof Task>(taskId: string, key: K, value: Task[K]) => setData((current) => updateTaskInBoard(current, taskId, (task) => ({ ...task, [key]: value })))
  const updateFindings = (taskId: string, value: string) => {
    const findings = value.split('\n').map((line) => line.trim()).filter(Boolean)
    setData((current) => updateTaskInBoard(current, taskId, (task) => ({ ...task, findings })))
  }
  const toggleSubtask = (taskId: string, subtaskId: string) => setData((current) => updateTaskInBoard(current, taskId, (task) => ({ ...task, subtasks: (task.subtasks ?? []).map((subtask) => subtask.id === subtaskId ? { ...subtask, status: subtask.status === 'done' ? 'pending' : 'done' } : subtask) })))

  const saveBoard = async () => {
    const res = await fetch('/api/board', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    const json = await res.json()
    if (res.ok) { setSavedAt(json.savedAt); window.__clawdashLastSavedBoard = data; reload() }
  }
  const validateBoard = async () => {
    setBusyAction('validate')
    try { const res = await fetch('/api/board/validate', { method: 'POST' }); const json = await res.json(); if (res.ok) setValidation(json) } finally { setBusyAction(null) }
  }
  const expandTask = async () => {
    if (!selectedTask) return
    setBusyAction('expand')
    try {
      const res = await fetch(`/api/board/task/${encodeURIComponent(selectedTask.id)}/expand`, { method: 'POST' })
      const json = await res.json()
      if (res.ok) { setData((current) => updateTaskInBoard(current, selectedTask.id, (task) => ({ ...task, subtasks: json.subtasks as TaskSubtask[] }))); setSavedAt(json.savedAt); reload() }
    } finally { setBusyAction(null) }
  }
  const generateResearchBrief = async () => {
    if (!selectedTask) return
    setBusyAction('research')
    try { const res = await fetch(`/api/board/task/${encodeURIComponent(selectedTask.id)}/research-brief`, { method: 'POST' }); const json = await res.json(); if (res.ok) setResearchBrief(json.prompt) } finally { setBusyAction(null) }
  }
  const buildAgentAction = async (mode: HandoffMode) => {
    if (!selectedTask) return
    setBusyAction(`agent-${mode}`)
    try { const res = await fetch(`/api/board/task/${encodeURIComponent(selectedTask.id)}/agent-action`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) }); const json = await res.json(); if (res.ok) setAgentPacket(json) } finally { setBusyAction(null) }
  }
  const buildDiscordHandoff = async (mode: HandoffMode) => {
    if (!selectedTask) return
    setBusyAction(`discord-${mode}`)
    try { const res = await fetch(`/api/board/task/${encodeURIComponent(selectedTask.id)}/discord-handoff`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) }); const json = await res.json(); if (res.ok) setDiscordPacket(json) } finally { setBusyAction(null) }
  }
  const executeDiscordHandoff = async (mode: HandoffMode) => {
    if (!selectedTask) return
    setBusyAction(`discord-exec-${mode}`)
    try {
      const res = await fetch(`/api/board/task/${encodeURIComponent(selectedTask.id)}/discord-execute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) })
      const json = await res.json()
      if (res.ok) {
        setExecutionResult(json)
        reload()
      } else {
        setExecutionResult({ ok: false, executedAt: new Date().toISOString(), packet: discordPacket ?? { generatedAt: new Date().toISOString(), mode, forumTitle: '', forumBody: '', threadUpdate: '', discordTarget: { targetKind: 'new_forum_post', targetId: null, targetSummary: json.error ?? 'unknown error' } }, task: selectedTask })
      }
    } finally { setBusyAction(null) }
  }

  const copyResearchBrief = async () => { if (researchBrief) await navigator.clipboard.writeText(researchBrief) }
  const copyAgentPacket = async () => { if (agentPacket) await navigator.clipboard.writeText(agentPacket.suggestedPrompt) }
  const copyDiscordForumPost = async () => { if (discordPacket) await navigator.clipboard.writeText(`Title: ${discordPacket.forumTitle}\n\n${discordPacket.forumBody}`) }
  const copyDiscordThreadUpdate = async () => { if (discordPacket) await navigator.clipboard.writeText(discordPacket.threadUpdate) }

  return <div className="space-y-4"><TopOpsStrip />
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Ready</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{readyCount}</div><p className="text-xs text-muted-foreground">Can be picked up next</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{activeCount}</div><p className="text-xs text-muted-foreground">Currently in motion</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Blocked</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{blockedCount}</div><p className="text-xs text-muted-foreground">Need dependency or decision cleared</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Review</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{reviewCount}</div><p className="text-xs text-muted-foreground">Awaiting acceptance or synthesis</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Data Source</CardTitle></CardHeader><CardContent><div className="text-lg font-bold">{source}</div><p className="text-xs text-muted-foreground">Board backing layer</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Board Actions</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><button onClick={saveBoard} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Save className="h-4 w-4" />{isDirty ? 'Save changes' : 'Save'}</button><button onClick={reload} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><RefreshCw className="h-4 w-4" />Reload</button><button onClick={validateBoard} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><AlertTriangle className="h-4 w-4" />{busyAction === 'validate' ? 'Checking…' : 'Validate'}</button></CardContent></Card>
    </div>

    <div className="grid gap-4 xl:grid-cols-[2fr_420px]">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">{columns.map(({ status, tasks }) => <Card key={status}><CardHeader><div className="flex items-center justify-between gap-2"><CardTitle className="text-base">{titleForStatus(status)}</CardTitle><Badge className="bg-background text-foreground">{tasks.length}</Badge></div></CardHeader><CardContent className="space-y-2.5">{tasks.length > 0 ? tasks.map((task) => { const dependencyTargets = data.dependencies.filter((dependency) => dependency.fromRef === task.id && dependency.kind === 'blocks').map((dependency) => dependency.toRef); const relatedBlockers = data.blockers.filter((blocker) => dependencyTargets.includes(blocker.ref) || blocker.ref === task.id); const epic = data.epics.find((epic) => epic.id === task.epicId); const handoffLabel = task.handoffPreference === 'existing_thread' && task.discordThreadId ? 'thread linked' : task.discordForumId ? 'forum linked' : null; return <button key={task.id} onClick={() => setSelectedTaskId(task.id)} className={`w-full rounded-lg p-3 text-left text-sm ${selectedTaskId === task.id ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-accent'}`}><div className="mb-2 flex items-start justify-between gap-2"><p className="font-medium">{task.title}</p><Badge className={selectedTaskId === task.id ? 'bg-primary-foreground/15 text-primary-foreground' : priorityClass(task.priority)}>{task.priority}</Badge></div><p className={`text-xs ${selectedTaskId === task.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{getProductName(task.productId)} • {getLaneName(task.laneId)}</p>{epic && <p className={`mt-1 text-xs ${selectedTaskId === task.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>Epic: {epic.title}</p>}{handoffLabel && <p className={`mt-1 text-xs ${selectedTaskId === task.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>Discord: {handoffLabel}</p>}{!!task.subtasks?.length && <p className={`mt-1 text-xs ${selectedTaskId === task.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{task.subtasks.length} subtasks</p>}{status === 'blocked' && relatedBlockers.length > 0 && <p className={`mt-2 text-xs ${selectedTaskId === task.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{relatedBlockers.length} blocker link(s)</p>}</button> }) : <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">No tasks in this column yet.</div>}</CardContent></Card>)}</div>

      <div className="space-y-4">
        <Card><CardHeader><CardTitle>Task editor</CardTitle></CardHeader><CardContent>{selectedTask ? <div className="space-y-3">
          <div><label className="mb-1 block text-xs text-muted-foreground">Title</label><input value={selectedTask.title} onChange={(e) => updateTask(selectedTask.id, 'title', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-xs text-muted-foreground">Status</label><select value={selectedTask.status} onChange={(e) => updateTask(selectedTask.id, 'status', e.target.value as BoardStatus)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></div><div><label className="mb-1 block text-xs text-muted-foreground">Priority</label><select value={selectedTask.priority} onChange={(e) => updateTask(selectedTask.id, 'priority', e.target.value as Priority)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></div></div>
          <div><label className="mb-1 block text-xs text-muted-foreground">Type</label><select value={selectedTask.type} onChange={(e) => updateTask(selectedTask.id, 'type', e.target.value as Task['type'])} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">{taskTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></div>
          <div><label className="mb-1 block text-xs text-muted-foreground">Summary</label><textarea value={selectedTask.summary ?? ''} onChange={(e) => updateTask(selectedTask.id, 'summary', e.target.value)} rows={3} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div><label className="mb-1 block text-xs text-muted-foreground">Notes</label><textarea value={selectedTask.notes ?? ''} onChange={(e) => updateTask(selectedTask.id, 'notes', e.target.value)} rows={5} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>
          <div><label className="mb-1 block text-xs text-muted-foreground">Findings (one per line)</label><textarea value={(selectedTask.findings ?? []).join('\n')} onChange={(e) => updateFindings(selectedTask.id, e.target.value)} rows={4} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></div>

          <div className="rounded-lg border border-border p-3 space-y-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Link2 className="h-4 w-4" />Discord linkage</div><div><label className="mb-1 block text-xs text-muted-foreground">Handoff preference</label><select value={selectedTask.handoffPreference ?? 'new_forum_post'} onChange={(e) => updateTask(selectedTask.id, 'handoffPreference', e.target.value as HandoffPreference)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">{handoffPreferences.map((pref) => <option key={pref} value={pref}>{pref}</option>)}</select></div><div><label className="mb-1 block text-xs text-muted-foreground">Discord forum id</label><input value={selectedTask.discordForumId ?? ''} onChange={(e) => updateTask(selectedTask.id, 'discordForumId', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="1475021817168134144" /></div><div><label className="mb-1 block text-xs text-muted-foreground">Discord thread id</label><input value={selectedTask.discordThreadId ?? ''} onChange={(e) => updateTask(selectedTask.id, 'discordThreadId', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Existing workstream thread id" /></div><div><label className="mb-1 block text-xs text-muted-foreground">Last Discord message id</label><input value={selectedTask.discordLastMessageId ?? ''} onChange={(e) => updateTask(selectedTask.id, 'discordLastMessageId', e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Populated by relay" /></div><div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">Effective target: {selectedTask.handoffPreference === 'existing_thread' && selectedTask.discordThreadId ? `existing thread ${selectedTask.discordThreadId}` : selectedTask.discordForumId ? `new forum post in forum ${selectedTask.discordForumId}` : 'no target linked yet'}</div></div>

          <div className="flex flex-wrap gap-2"><button onClick={expandTask} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Sparkles className="h-4 w-4" />{busyAction === 'expand' ? 'Expanding…' : 'Expand task'}</button><button onClick={generateResearchBrief} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Search className="h-4 w-4" />{busyAction === 'research' ? 'Building…' : 'Research brief'}</button><button onClick={copyResearchBrief} disabled={!researchBrief} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent disabled:opacity-40"><Clipboard className="h-4 w-4" />Copy brief</button></div>
          <div className="rounded-lg border border-border p-3"><div className="mb-2 text-xs text-muted-foreground">Agent actions</div><div className="flex flex-wrap gap-2"><button onClick={() => buildAgentAction('research')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Bot className="h-4 w-4" />{busyAction === 'agent-research' ? 'Preparing…' : 'Research agent'}</button><button onClick={() => buildAgentAction('implement')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Hammer className="h-4 w-4" />{busyAction === 'agent-implement' ? 'Preparing…' : 'Implementation agent'}</button><button onClick={() => buildAgentAction('review')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Eye className="h-4 w-4" />{busyAction === 'agent-review' ? 'Preparing…' : 'Review agent'}</button></div><div className="mt-2 text-xs text-muted-foreground">This builds the correct task-context packet for an agent run.</div></div>
          <div className="rounded-lg border border-border p-3"><div className="mb-2 text-xs text-muted-foreground">Discord handoff</div><div className="flex flex-wrap gap-2"><button onClick={() => buildDiscordHandoff('research')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><MessageSquareText className="h-4 w-4" />{busyAction === 'discord-research' ? 'Preparing…' : 'Research forum post'}</button><button onClick={() => buildDiscordHandoff('implement')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Send className="h-4 w-4" />{busyAction === 'discord-implement' ? 'Preparing…' : 'Implementation update'}</button><button onClick={() => buildDiscordHandoff('review')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Eye className="h-4 w-4" />{busyAction === 'discord-review' ? 'Preparing…' : 'Review handoff'}</button></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => executeDiscordHandoff('research')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Rocket className="h-4 w-4" />{busyAction === 'discord-exec-research' ? 'Posting…' : 'Post research now'}</button><button onClick={() => executeDiscordHandoff('implement')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Rocket className="h-4 w-4" />{busyAction === 'discord-exec-implement' ? 'Posting…' : 'Post implementation now'}</button><button onClick={() => executeDiscordHandoff('review')} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Rocket className="h-4 w-4" />{busyAction === 'discord-exec-review' ? 'Posting…' : 'Post review now'}</button></div><div className="mt-2 text-xs text-muted-foreground">These now use the OpenClaw CLI relay path: create a forum post or send an update to the linked thread.</div></div>
          <div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">Product: {getProductName(selectedTask.productId)}<br />Lane: {getLaneName(selectedTask.laneId)}<br />ID: {selectedTask.id}<br />Last handoff: {selectedTask.lastHandoffMode ? `${selectedTask.lastHandoffMode} at ${selectedTask.lastHandoffAt ?? 'unknown time'}` : 'none recorded yet'}</div>
          {selectedTask.subtasks && selectedTask.subtasks.length > 0 && <div className="rounded-lg border border-border p-3"><div className="mb-2 text-xs text-muted-foreground">Expanded subtasks</div><div className="space-y-2">{selectedTask.subtasks.map((subtask) => <label key={subtask.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={subtask.status === 'done'} onChange={() => toggleSubtask(selectedTask.id, subtask.id)} /><span>{subtask.title}</span></label>)}</div></div>}
          {savedAt && <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">Board saved {savedAt}</div>}
        </div> : <div className="text-sm text-muted-foreground">Select a task to edit it.</div>}</CardContent></Card>
        {executionResult && <Card><CardHeader><CardTitle>Discord execution</CardTitle></CardHeader><CardContent className="space-y-3"><div className={`rounded-lg p-3 text-xs ${executionResult.ok ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>{executionResult.ok ? `Executed at ${executionResult.executedAt}` : `Execution failed at ${executionResult.executedAt}`}</div><div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">Target: {executionResult.packet.discordTarget.targetSummary}<br />Task: {executionResult.task.id}<br />Thread linked after send: {executionResult.task.discordThreadId ?? 'none yet'}</div></CardContent></Card>}
        {discordPacket && <Card><CardHeader><CardTitle>Discord handoff packet</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">Mode: {discordPacket.mode}<br />Target: {discordPacket.discordTarget.targetSummary}<br />Forum title: {discordPacket.forumTitle}</div><div><div className="mb-1 text-xs text-muted-foreground">New forum post</div><textarea readOnly value={discordPacket.forumBody} rows={14} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs" /><button onClick={copyDiscordForumPost} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Clipboard className="h-4 w-4" />Copy forum post</button></div><div><div className="mb-1 text-xs text-muted-foreground">Existing thread update</div><textarea readOnly value={discordPacket.threadUpdate} rows={8} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs" /><button onClick={copyDiscordThreadUpdate} className="mt-2 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Clipboard className="h-4 w-4" />Copy thread update</button></div></CardContent></Card>}
        {agentPacket && <Card><CardHeader><CardTitle>Agent action packet</CardTitle></CardHeader><CardContent className="space-y-3"><div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground">Action: {agentPacket.action}<br />Label: {agentPacket.suggestedLabel}<br />Task: {agentPacket.taskId}<br />Discord target: {agentPacket.discordTarget.targetSummary}</div><div><div className="mb-1 text-xs text-muted-foreground">Expected outcome</div><div className="space-y-1 text-xs">{agentPacket.suggestedOutcome.map((item) => <div key={item}>- {item}</div>)}</div></div><textarea readOnly value={agentPacket.suggestedPrompt} rows={16} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs" /><button onClick={copyAgentPacket} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Clipboard className="h-4 w-4" />Copy agent packet</button></CardContent></Card>}
        {researchBrief && <Card><CardHeader><CardTitle>Research brief</CardTitle></CardHeader><CardContent><textarea readOnly value={researchBrief} rows={14} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs" /></CardContent></Card>}
        {validation && <Card><CardHeader><CardTitle>Dependency validation</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className={validation.ok ? 'text-green-600' : 'text-yellow-600'}>{validation.ok ? 'Board dependency graph looks clean.' : 'Board dependency graph has issues.'}</div>{validation.missingRefs.length > 0 && <div><div className="mb-1 text-xs text-muted-foreground">Missing refs</div><div className="space-y-1 text-xs">{validation.missingRefs.map((item) => <div key={`${item.dependencyId}-${item.side}`}>{item.dependencyId} → {item.side} missing {item.ref}</div>)}</div></div>}{validation.cycles.length > 0 && <div><div className="mb-1 text-xs text-muted-foreground">Cycles</div><div className="space-y-1 text-xs">{validation.cycles.map((cycle, index) => <div key={index}>{cycle.join(' → ')}</div>)}</div></div>}<div className="text-xs text-muted-foreground">Checked {validation.checkedAt}</div></CardContent></Card>}
      </div>
    </div>
  </div>
}

declare global { interface Window { __clawdashLastSavedBoard?: ClawTaskSeed } }
