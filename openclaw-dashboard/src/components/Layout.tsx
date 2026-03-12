import { ReactNode, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  Activity,
  Settings,
  Terminal,
  BarChart3,
  FolderKanban,
  CheckSquare,
  ClipboardList,
  FileText,
  Menu,
  X,
  Zap,
} from 'lucide-react'
import { MiniBars } from '@/components/ui/MiniBars'
import { useSidebarUsage } from '@/hooks/useSidebarUsage'
import { formatRelativeFromIso } from '@/lib/timeFormat'

interface LayoutProps {
  children: ReactNode
}

const navItems = [
  { path: '/now', icon: LayoutDashboard, label: 'Now' },
  { path: '/health', icon: Terminal, label: 'Health' },
  { path: '/costs', icon: Activity, label: 'Costs / Usage' },
  { path: '/projects', icon: FolderKanban, label: 'Projects' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/memory', icon: Database, label: 'Memory / Learnings' },
  { path: '/docs', icon: FileText, label: 'Docs' },
  { path: '/review', icon: ClipboardList, label: 'Review' },
  { path: '/grafana', icon: BarChart3, label: 'Grafana' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

const pageTitles: Record<string, string> = {
  '/': 'Now',
  '/now': 'Now',
  '/health': 'Health',
  '/costs': 'Costs / Usage',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
  '/memory': 'Memory / Learnings',
  '/docs': 'Docs',
  '/review': 'Review',
  '/grafana': 'Grafana',
  '/settings': 'Settings',
  '/agents': 'Agents',
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const currentTitle = pageTitles[location.pathname] ?? 'ClawDash'
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const usage = useSidebarUsage()

  return (
    <div className="flex min-h-screen bg-background">
      {mobileNavOpen && (
        <button
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card transition-transform md:static md:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-primary">ClawDash</h1>
            <p className="text-xs text-muted-foreground">OpenClaw Operations</p>
          </div>
          <button
            className="rounded-lg p-2 hover:bg-accent md:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 pb-3">
          <div className="rounded-lg bg-secondary p-3">
            <div className="mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Usage pulse</p>
            </div>
            <div className="space-y-2 text-xs">
              <div className="rounded bg-background px-2 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">OpenAI</span>
                  <span>${usage.openai.costUsd.toFixed(2)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-muted-foreground">
                  <span>{usage.openai.requests} req</span>
                  <span>{Math.round(usage.openai.tokens / 1000)}k tok</span>
                </div>
                <div className="mt-2">
                  <MiniBars values={usage.openai.trend} colorClass="bg-emerald-500" />
                </div>
              </div>
              <div className="rounded bg-background px-2 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Copilot</span>
                  <span>{usage.copilot.completions} comps</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-muted-foreground">
                  <span>{usage.copilot.chatRequests} chats</span>
                  <span>{Math.round(usage.copilot.acceptRate * 100)}% accept</span>
                </div>
                <div className="mt-2">
                  <MiniBars values={usage.copilot.trend} colorClass="bg-purple-500" />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Source: {usage.source} • updated {formatRelativeFromIso(usage.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        <nav className="mt-1 px-2 pb-24">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileNavOpen(false)}
              className={({ isActive }) =>
                `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-3 left-0 right-0 px-3">
          <div className="rounded-lg bg-secondary p-3">
            <p className="text-xs text-muted-foreground">Gateway Status</p>
            <p className="text-sm font-medium text-green-500">● Online</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Health + Costs becoming live pillars</p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <header className="border-b border-border bg-card px-3 py-3 md:px-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <button
                className="rounded-lg border border-border p-2 hover:bg-accent md:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <h2 className="text-base font-semibold md:text-lg">{currentTitle}</h2>
              </div>
            </div>
            <div className="hidden items-center gap-4 md:flex">
              <span className="text-xs text-muted-foreground md:text-sm">Last updated: Just now</span>
            </div>
          </div>
        </header>

        <div className="p-3 md:p-4">{children}</div>
      </main>
    </div>
  )
}
