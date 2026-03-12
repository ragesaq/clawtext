import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Users, Terminal, Clock, Activity, Square, RefreshCw } from 'lucide-react'

export default function AgentStatus() {
  const sessions = [
    {
      id: 'sess-001',
      label: 'Discord #ai-projects',
      model: 'qwen/qwen3.5-122b-a10b',
      status: 'active',
      started: '2026-03-10T18:30:00Z',
      messages: 47,
      tokens: '12.4K',
      cost: '$0.08',
    },
    {
      id: 'sess-002',
      label: 'Sub-agent: thread-bridge',
      model: 'anthropic/claude-3.5-sonnet',
      status: 'active',
      started: '2026-03-10T19:15:00Z',
      messages: 12,
      tokens: '3.2K',
      cost: '$0.04',
    },
    {
      id: 'sess-003',
      label: 'Memory extraction cron',
      model: 'qwen/qwen3.5-122b-a10b',
      status: 'completed',
      started: '2026-03-10T19:00:00Z',
      ended: '2026-03-10T19:02:00Z',
      messages: 8,
      tokens: '2.1K',
      cost: '$0.01',
    },
  ]

  const subAgents = [
    {
      id: 'agent-001',
      label: 'Thread refresh #1481011906901704704',
      runtime: 'subagent',
      status: 'running',
      started: '2026-03-10T19:15:00Z',
      progress: 'Extracting thread history...',
    },
    {
      id: 'agent-002',
      label: 'ClawText cluster rebuild',
      runtime: 'subagent',
      status: 'queued',
      started: null,
      progress: 'Waiting...',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agent Status</h1>
        <p className="text-muted-foreground">Active sessions and sub-agent orchestration</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">+1 from last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Running Agents</CardTitle>
            <Terminal className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Thread-bridge in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Queued</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">Cluster rebuild</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens (Today)</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">17.7K</div>
            <p className="text-xs text-muted-foreground">$0.13 cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Sessions</CardTitle>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-secondary rounded hover:bg-accent">
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id} className="p-4 bg-secondary rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      session.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                    }`} />
                    <span className="font-medium">{session.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(session.started).toLocaleTimeString()}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-muted-foreground">Model</p>
                    <p className="font-medium">{session.model.split('/')[1] || session.model}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Messages</p>
                    <p className="font-medium">{session.messages}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tokens</p>
                    <p className="font-medium">{session.tokens}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cost</p>
                    <p className="font-medium">{session.cost}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sub-Agents */}
      <Card>
        <CardHeader>
          <CardTitle>Sub-Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {subAgents.map((agent) => (
              <div key={agent.id} className="p-4 bg-secondary rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{agent.label}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    agent.status === 'running' 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-yellow-500/10 text-yellow-500'
                  }`}>
                    {agent.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <p className="text-muted-foreground">{agent.progress}</p>
                  {agent.status === 'running' && (
                    <button className="p-1 hover:bg-accent rounded">
                      <Square className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
