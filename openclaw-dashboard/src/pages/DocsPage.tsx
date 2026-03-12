import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeFromIso } from '@/lib/timeFormat'
import { FileText, Search, ChevronLeft, Menu, ListTree, Pencil, Eye, Save, RotateCcw, Copy, Download } from 'lucide-react'

interface DashboardDoc {
  id: string
  title: string
  category: 'handoff' | 'milestone' | 'model' | 'workflow' | 'lane'
  path: string
}

interface LoadedDoc extends DashboardDoc {
  content: string
}

interface HeadingItem {
  id: string
  text: string
  level: number
}

function categoryClass(category: string) {
  switch (category) {
    case 'handoff': return 'bg-blue-500/10 text-blue-600'
    case 'milestone': return 'bg-green-500/10 text-green-600'
    case 'model': return 'bg-purple-500/10 text-purple-600'
    case 'workflow': return 'bg-orange-500/10 text-orange-600'
    case 'lane': return 'bg-yellow-500/10 text-yellow-700'
    default: return 'bg-secondary text-muted-foreground'
  }
}

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
}

function extractHeadings(content: string): HeadingItem[] {
  const seen = new Map<string, number>()
  return content.split('\n').map((line) => {
    const match = /^(#{1,4})\s+(.+)$/.exec(line)
    if (!match) return null
    const [, hashes, text] = match
    const base = slugify(text)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return { id: count === 0 ? base : `${base}-${count + 1}`, text: text.trim(), level: hashes.length }
  }).filter((item): item is HeadingItem => item !== null)
}

function draftKey(id: string) {
  return `clawdash-doc-draft:${id}`
}

export default function DocsPage() {
  const [query, setQuery] = useState('')
  const [docs, setDocs] = useState<DashboardDoc[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<LoadedDoc | null>(null)
  const [mobileListOpen, setMobileListOpen] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [draftContent, setDraftContent] = useState('')
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)
  const [fileSavedAt, setFileSavedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/docs')
      .then((res) => res.json())
      .then((json: DashboardDoc[]) => {
        setDocs(json)
        setSelectedId((current) => current || json[0]?.id || '')
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return docs
    return docs.filter((doc) => doc.title.toLowerCase().includes(q) || doc.path.toLowerCase().includes(q) || doc.category.toLowerCase().includes(q))
  }, [docs, query])

  useEffect(() => {
    if (!selectedId) return
    fetch(`/api/docs/${encodeURIComponent(selectedId)}`)
      .then((res) => res.json())
      .then((json: LoadedDoc) => {
        setSelectedDoc(json)
        const savedDraft = window.localStorage.getItem(draftKey(json.id))
        setDraftContent(savedDraft ?? json.content)
        setDraftSavedAt(window.localStorage.getItem(`${draftKey(json.id)}:savedAt`))
        setEditMode(false)
      })
  }, [selectedId])

  const currentContent = editMode ? draftContent : draftContent || selectedDoc?.content || ''
  const headings = useMemo(() => (currentContent ? extractHeadings(currentContent) : []), [currentContent])
  const isDirty = !!selectedDoc && draftContent !== selectedDoc.content

  const saveDraft = () => {
    if (!selectedDoc) return
    window.localStorage.setItem(draftKey(selectedDoc.id), draftContent)
    const now = new Date().toISOString()
    window.localStorage.setItem(`${draftKey(selectedDoc.id)}:savedAt`, now)
    setDraftSavedAt(now)
  }

  const saveToFile = async () => {
    if (!selectedDoc) return
    const res = await fetch(`/api/docs/${encodeURIComponent(selectedDoc.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: draftContent }),
    })
    const json = await res.json()
    if (res.ok) {
      setSelectedDoc({ ...selectedDoc, content: draftContent })
      setFileSavedAt(json.savedAt)
      window.localStorage.removeItem(draftKey(selectedDoc.id))
      window.localStorage.removeItem(`${draftKey(selectedDoc.id)}:savedAt`)
      setDraftSavedAt(null)
      setEditMode(false)
    }
  }

  const resetDraft = () => {
    if (!selectedDoc) return
    setDraftContent(selectedDoc.content)
    window.localStorage.removeItem(draftKey(selectedDoc.id))
    window.localStorage.removeItem(`${draftKey(selectedDoc.id)}:savedAt`)
    setDraftSavedAt(null)
  }

  const copyContent = async () => {
    if (!currentContent) return
    await navigator.clipboard.writeText(currentContent)
  }

  const downloadDraft = () => {
    if (!selectedDoc) return
    const blob = new Blob([draftContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = selectedDoc.path.split('/').pop() || `${selectedDoc.id}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)] xl:gap-6">
      <Card className={`overflow-hidden xl:h-[calc(100vh-8rem)] ${mobileListOpen ? 'block' : 'hidden xl:block'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Planning Docs</CardTitle>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search docs..." className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm outline-none ring-0" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 overflow-auto xl:h-[calc(100%-8.5rem)]">
          {filteredDocs.map((doc) => (
            <button key={doc.id} onClick={() => { setSelectedId(doc.id); setMobileListOpen(false) }} className={`w-full rounded-lg p-3 text-left transition-colors ${selectedDoc?.id === doc.id ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-accent'}`}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-medium leading-tight">{doc.title}</p>
                <Badge className={selectedDoc?.id === doc.id ? 'bg-primary-foreground/15 text-primary-foreground' : categoryClass(doc.category)}>{doc.category}</Badge>
              </div>
              <p className={`text-xs ${selectedDoc?.id === doc.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{doc.path}</p>
            </button>
          ))}
          {loading && <div className="text-sm text-muted-foreground">Loading docs…</div>}
        </CardContent>
      </Card>

      <Card className={`overflow-hidden xl:h-[calc(100vh-8rem)] ${mobileListOpen ? 'hidden xl:block' : 'block'}`}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2 xl:hidden">
                <button onClick={() => setMobileListOpen(true)} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><ChevronLeft className="h-4 w-4" />Docs list</button>
              </div>
              <CardTitle className="leading-tight">{selectedDoc?.title ?? 'No document selected'}</CardTitle>
              <p className="mt-1 break-all text-sm text-muted-foreground">{selectedDoc?.path}</p>
            </div>
            {selectedDoc && <div className="flex items-center gap-2"><Badge className={categoryClass(selectedDoc.category)}>{selectedDoc.category}</Badge><button onClick={() => setMobileListOpen(true)} className="rounded-lg border border-border p-2 hover:bg-accent xl:hidden" aria-label="Open docs list"><Menu className="h-4 w-4" /></button></div>}
          </div>
        </CardHeader>
        <CardContent className="overflow-auto xl:h-[calc(100%-5.5rem)]">
          {selectedDoc ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge className="bg-background text-foreground">{selectedDoc.path}</Badge>
                  <Badge className={isDirty ? 'bg-orange-500/10 text-orange-600' : 'bg-green-500/10 text-green-600'}>{isDirty ? 'dirty draft' : 'clean'}</Badge>
                  {draftSavedAt && <Badge className="bg-secondary text-foreground">draft {formatRelativeFromIso(draftSavedAt)}</Badge>}
                  {fileSavedAt && <Badge className="bg-green-500/10 text-green-600">file saved {formatRelativeFromIso(fileSavedAt)}</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setEditMode((v) => !v)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">{editMode ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}{editMode ? 'Preview' : 'Edit'}</button>
                  <button onClick={saveDraft} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Save className="h-4 w-4" />Save draft</button>
                  <button onClick={saveToFile} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Save className="h-4 w-4" />Save to file</button>
                  <button onClick={resetDraft} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><RotateCcw className="h-4 w-4" />Reset</button>
                  <button onClick={copyContent} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Copy className="h-4 w-4" />Copy</button>
                  <button onClick={downloadDraft} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Download className="h-4 w-4" />Download</button>
                </div>
              </div>

              {!editMode && headings.length > 0 && (
                <div className="rounded-lg border border-border bg-secondary/50 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium"><ListTree className="h-4 w-4" />Section jumps</div>
                  <div className="flex flex-wrap gap-2">
                    {headings.slice(0, 24).map((heading) => (
                      <button key={heading.id} onClick={() => document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="rounded-md bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground">{'› '.repeat(Math.max(heading.level - 1, 0))}{heading.text}</button>
                    ))}
                  </div>
                </div>
              )}

              {editMode ? (
                <textarea value={draftContent} onChange={(e) => setDraftContent(e.target.value)} className="min-h-[60vh] w-full rounded-lg border border-border bg-background p-4 font-mono text-[13px] leading-6 text-foreground outline-none md:text-sm md:leading-7" spellCheck={false} />
              ) : (
                <div className="space-y-1 font-mono text-[13px] leading-6 text-foreground md:text-sm md:leading-7">
                  {currentContent.split('\n').map((line, index) => {
                    const match = /^(#{1,4})\s+(.+)$/.exec(line)
                    if (match) {
                      const [, hashes, text] = match
                      const level = hashes.length
                      const sameBefore = currentContent.split('\n').slice(0, index).filter((l) => /^(#{1,4})\s+(.+)$/.test(l) && slugify(l.replace(/^(#{1,4})\s+/, '')) === slugify(text)).length
                      const id = sameBefore === 0 ? slugify(text) : `${slugify(text)}-${sameBefore + 1}`
                      const className = level === 1 ? 'text-lg font-bold md:text-xl' : level === 2 ? 'text-base font-semibold md:text-lg' : 'text-sm font-semibold'
                      return <div key={index} id={id} className={`scroll-mt-24 pt-3 ${className}`}>{text}</div>
                    }
                    return <div key={index} className="whitespace-pre-wrap break-words">{line.length > 0 ? line : <span>&nbsp;</span>}</div>
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No matching document.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
