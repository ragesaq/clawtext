import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Activity, Database, Users, Zap, Clock, AlertTriangle } from 'lucide-react'

export default function DashboardHome() {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">+3 from last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Memory Clusters</CardTitle>
            <Database className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">122 memories indexed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">API Calls Saved</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="text-xs text-muted-foreground">ClawSaver this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.2s</div>
            <p className="text-xs text-muted-foreground">Across all providers</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                <Activity className="w-5 h-5 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Memory extraction completed</p>
                  <p className="text-xs text-muted-foreground">3 new memories added to clusters</p>
                </div>
                <span className="text-xs text-muted-foreground">5m ago</span>
              </div>
              
              <div className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                <Users className="w-5 h-5 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">New sub-agent spawned</p>
                  <p className="text-xs text-muted-foreground">Thread-bridge: refresh thread #1481011906901704704</p>
                </div>
                <span className="text-xs text-muted-foreground">12m ago</span>
              </div>

              <div className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                <Zap className="w-5 h-5 text-yellow-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">ClawSaver batch sent</p>
                  <p className="text-xs text-muted-foreground">4 messages batched, 3 calls saved</p>
                </div>
                <span className="text-xs text-muted-foreground">18m ago</span>
              </div>

              <div className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">RAG quality alert</p>
                  <p className="text-xs text-muted-foreground">Quality score dropped to 68% (threshold: 70%)</p>
                </div>
                <span className="text-xs text-muted-foreground">1h ago</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Gateway Daemon</span>
              <span className="text-sm font-medium text-green-500">● Running</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Extraction Cron</span>
              <span className="text-sm font-medium text-green-500">● Active (20m)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Daily Rebuild</span>
              <span className="text-sm font-medium text-green-500">● Scheduled (2am UTC)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Memory Buffer</span>
              <span className="text-sm font-medium">19 messages</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm">
              Trigger Memory Cluster Rebuild
            </button>
            <button className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors text-sm">
              Force Memory Extraction
            </button>
            <button className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors text-sm">
              View Recent Errors
            </button>
            <button className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors text-sm">
              Export System Report
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
