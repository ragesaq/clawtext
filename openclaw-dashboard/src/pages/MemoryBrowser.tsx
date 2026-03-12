import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeFromIso } from '@/lib/timeFormat'
import { Search, RefreshCw, Save, RotateCcw, Copy, BookOpen } from 'lucide-react'

interface MemoryFileItem {
  id: string
  path: string
  title: string
  kind: 'memory' | 'daily'
  updatedAt: string
}

interface LoadedMemoryFile extends MemoryFileItem {
  content: string
}

function kindClass(kind: MemoryFileItem['kind']) {
  return kind === 'memory'
    ? 'bg-purple-500/10 text-purple-600'
    : 'bg-blue-500/10 text-blue-600'
}

export default function MemoryBrowser() {
  const [files, setFiles] = useState<MemoryFileItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedFile, setSelectedFile] = useState<LoadedMemoryFile | null>(null)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reloadList = () => {
    setLoading(true)
    fetch('/api/memory/files')
      .then((res) => res.json())
      .then((json: MemoryFileItem[]) => {
        setFiles(json)
        setSelectedId((current) => current || json[0]?.id || '')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reloadList()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    fetch(`/api/memory/file/${encodeURIComponent(selectedId)}`)
      .then((res) => res.json())
      .then((json: LoadedMemoryFile) => {
        setSelectedFile(json)
        setDraft(json.content)
      })
  }, [selectedId])

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return files
    return files.filter((file) =>
      file.title.toLowerCase().includes(q) ||
      file.path.toLowerCase().includes(q),
    )
  }, [files, query])

  const isDirty = selectedFile ? draft !== selectedFile.content : false

  const saveFile = async () => {
    if (!selectedFile) return
    const res = await fetch(`/api/memory/file/${encodeURIComponent(selectedFile.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: draft }),
    })
    const json = await res.json()
    if (res.ok) {
      setSelectedFile({ ...selectedFile, content: draft, updatedAt: json.savedAt })
      setSavedAt(json.savedAt)
      reloadList()
    }
  }

  const resetDraft = () => {
    if (!selectedFile) return
    setDraft(selectedFile.content)
  }

  const copyDraft = async () => {
    await navigator.clipboard.writeText(draft)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-6">
      <Card className="overflow-hidden xl:h-[calc(100vh-8rem)]">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Memory / Learnings
            </CardTitle>
            <button onClick={reloadList} className="rounded-lg border border-border p-2 hover:bg-accent">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memory files..."
              className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm outline-none"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 overflow-auto xl:h-[calc(100%-8.5rem)]">
          {filteredFiles.map((file) => (
            <button
              key={file.id}
              onClick={() => setSelectedId(file.id)}
              className={`w-full rounded-lg p-3 text-left transition-colors ${
                selectedId === file.id ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-accent'
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-medium leading-tight">{file.title}</p>
                <Badge className={selectedId === file.id ? 'bg-primary-foreground/15 text-primary-foreground' : kindClass(file.kind)}>
                  {file.kind}
                </Badge>
              </div>
              <p className={`text-xs ${selectedId === file.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                {file.path}
              </p>
            </button>
          ))}
          {loading && <div className="text-sm text-muted-foreground">Loading memory files…</div>}
        </CardContent>
      </Card>

      <Card className="overflow-hidden xl:h-[calc(100vh-8rem)]">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle>{selectedFile?.title ?? 'No memory file selected'}</CardTitle>
              <p className="mt-1 break-all text-sm text-muted-foreground">{selectedFile?.path}</p>
            </div>
            {selectedFile && <Badge className={kindClass(selectedFile.kind)}>{selectedFile.kind}</Badge>}
          </div>
        </CardHeader>
        <CardContent className="overflow-auto xl:h-[calc(100%-5.5rem)]">
          {selectedFile ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="bg-background text-foreground">{selectedFile.path}</Badge>
                  <Badge className={isDirty ? 'bg-orange-500/10 text-orange-600' : 'bg-green-500/10 text-green-600'}>
                    {isDirty ? 'dirty' : 'clean'}
                  </Badge>
                  <Badge className="bg-secondary text-foreground">updated {formatRelativeFromIso(selectedFile.updatedAt)}</Badge>
                  {savedAt && <Badge className="bg-green-500/10 text-green-600">saved {formatRelativeFromIso(savedAt)}</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={saveFile} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Save className="h-4 w-4" />Save</button>
                  <button onClick={resetDraft} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><RotateCcw className="h-4 w-4" />Reset</button>
                  <button onClick={copyDraft} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Copy className="h-4 w-4" />Copy</button>
                </div>
              </div>

              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-[60vh] w-full rounded-lg border border-border bg-background p-4 font-mono text-[13px] leading-6 text-foreground outline-none md:text-sm md:leading-7"
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              Pick a memory file to read or edit.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
