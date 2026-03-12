import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useTheme } from '@/components/ThemeProvider'
import { Settings as SettingsIcon, Save, RefreshCw, Moon, Sun, Monitor } from 'lucide-react'

function ThemeButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean
  label: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-accent'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

export default function Settings() {
  const { themeMode, setThemeMode, resolvedTheme } = useTheme()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure ClawDash behavior and appearance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">Theme mode</p>
            <p className="mb-3 text-xs text-muted-foreground">Choose light, dark, or follow your system preference. Current resolved theme: {resolvedTheme}.</p>
            <div className="flex flex-wrap gap-2">
              <ThemeButton active={themeMode === 'light'} label="Light" icon={<Sun className="h-4 w-4" />} onClick={() => setThemeMode('light')} />
              <ThemeButton active={themeMode === 'dark'} label="Dark" icon={<Moon className="h-4 w-4" />} onClick={() => setThemeMode('dark')} />
              <ThemeButton active={themeMode === 'system'} label="System" icon={<Monitor className="h-4 w-4" />} onClick={() => setThemeMode('system')} />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">Future theme packs</p>
            <p className="text-xs text-muted-foreground">Color scheme packs are queued as follow-on work, but not implemented yet.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground hover:opacity-90"><Save className="w-4 h-4" />Save Settings</button>
          <button onClick={() => setThemeMode('system')} className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 hover:bg-accent"><RefreshCw className="w-4 h-4" />Reset Theme to System</button>
        </CardContent>
      </Card>
    </div>
  )
}
