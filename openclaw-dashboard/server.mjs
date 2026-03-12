import http from 'node:http'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const workspaceDir = path.resolve(__dirname, '..')
const distDir = path.join(__dirname, 'dist')
const catalogPath = path.join(__dirname, 'docs-catalog.json')
const memoryDir = path.join(workspaceDir, 'memory')
const longTermMemoryPath = path.join(workspaceDir, 'MEMORY.md')
const boardPath = path.join(__dirname, 'public', 'data', 'clawtask-seed.json')
const port = Number(process.env.PORT || 4180)

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type })
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body))
}

async function runOpenClaw(args, timeout = 30000) {
  const { stdout } = await execFileP('openclaw', args, { timeout, cwd: workspaceDir, maxBuffer: 8 * 1024 * 1024 })
  return stdout
}

async function readCatalog() { return JSON.parse(await fs.readFile(catalogPath, 'utf8')) }
async function getDocById(id) { return (await readCatalog()).find((doc) => doc.id === id) ?? null }
function resolveWorkspacePath(relPath) {
  const full = path.resolve(workspaceDir, relPath)
  if (!full.startsWith(workspaceDir)) throw new Error('Path escapes workspace')
  return full
}
async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString('utf8')
}
async function readBoard() { return JSON.parse(await fs.readFile(boardPath, 'utf8')) }
async function writeBoard(board) {
  board.generatedAt = new Date().toISOString()
  await fs.writeFile(boardPath, `${JSON.stringify(board, null, 2)}\n`, 'utf8')
  return board
}

function getTaskContext(board, task) {
  const epic = board.epics.find((item) => item.id === task.epicId)
  const product = board.products.find((item) => item.id === task.productId)
  const lane = board.lanes.find((item) => item.id === task.laneId)
  const dependencies = board.dependencies.filter((dependency) => dependency.fromRef === task.id || dependency.toRef === task.id)
  const blockers = board.blockers.filter((blocker) => blocker.ref === task.id)
  const artifacts = board.artifacts.filter((artifact) => artifact.linkedRefs.includes(task.id) || artifact.linkedRefs.includes(task.epicId))
  return { epic, product, lane, dependencies, blockers, artifacts }
}

function getDiscordTarget(task) {
  const targetKind = task.handoffPreference === 'existing_thread' && task.discordThreadId ? 'existing_thread' : 'new_forum_post'
  const targetId = targetKind === 'existing_thread' ? task.discordThreadId ?? null : task.discordForumId ?? null
  const targetSummary = targetKind === 'existing_thread'
    ? (task.discordThreadId ? `Existing thread ${task.discordThreadId}` : 'Existing thread preference set, but no thread id linked yet.')
    : (task.discordForumId ? `New forum post in forum ${task.discordForumId}` : 'New forum post preference set, but no forum id linked yet.')
  return { targetKind, targetId, targetSummary }
}

function buildTaskResearchBrief(board, task) {
  const { epic, product, lane, dependencies, blockers, artifacts } = getTaskContext(board, task)
  const target = getDiscordTarget(task)
  const prompt = [
    `Research task: ${task.title}`,
    '',
    `Task ID: ${task.id}`,
    `Product: ${product?.name ?? task.productId}`,
    `Lane: ${lane?.name ?? task.laneId}`,
    `Epic: ${epic?.title ?? task.epicId}`,
    `Type: ${task.type}`,
    `Priority: ${task.priority}`,
    `Status: ${task.status}`,
    `Discord target: ${target.targetSummary}`,
    '',
    'Current summary:',
    task.summary || 'No summary yet.',
    '',
    'Current notes:',
    task.notes || 'No notes yet.',
    '',
    'Dependencies and blockers:',
    ...(dependencies.length ? dependencies.map((dependency) => `- ${dependency.kind}: ${dependency.fromRef} -> ${dependency.toRef}`) : ['- No linked dependencies recorded.']),
    ...(blockers.length ? blockers.map((blocker) => `- blocker: ${blocker.title} (${blocker.status})`) : ['- No direct blocker records.']),
    '',
    'Relevant artifacts:',
    ...(artifacts.length ? artifacts.map((artifact) => `- ${artifact.title}: ${artifact.pathOrUrl}`) : ['- No linked artifacts recorded.']),
    '',
    'Return:',
    '- latest best practices / relevant implementation options',
    '- risks or unknowns',
    '- concrete recommendation',
    '- 3 to 5 findings that can be saved back into the task',
  ].join('\n')
  return { generatedAt: new Date().toISOString(), prompt }
}

function buildAgentActionPacket(board, task, action) {
  const { epic, product, lane, dependencies, blockers, artifacts } = getTaskContext(board, task)
  const target = getDiscordTarget(task)
  const actionMeta = {
    research: { goal: 'Investigate the task and return findings that reduce uncertainty.', deliverables: ['summary of relevant options', 'risks/unknowns', 'clear recommendation', '3-5 findings to save back into the task'] },
    implement: { goal: 'Execute the smallest meaningful slice of the task and report what changed.', deliverables: ['implementation plan', 'files or systems likely affected', 'validation approach', 'follow-up tasks or risks'] },
    review: { goal: 'Review the task, linked artifacts, and current direction for correctness and gaps.', deliverables: ['review summary', 'issues or risks found', 'accept/revise recommendation', 'specific next actions'] },
  }[action]

  const prompt = [
    `${action.toUpperCase()} task: ${task.title}`,
    '',
    `Task ID: ${task.id}`,
    `Goal: ${actionMeta.goal}`,
    `Product: ${product?.name ?? task.productId}`,
    `Lane: ${lane?.name ?? task.laneId}`,
    `Epic: ${epic?.title ?? task.epicId}`,
    `Task type: ${task.type}`,
    `Priority: ${task.priority}`,
    `Status: ${task.status}`,
    `Discord target: ${target.targetSummary}`,
    '',
    'Task summary:',
    task.summary || 'No summary yet.',
    '',
    'Task notes:',
    task.notes || 'No notes yet.',
    '',
    'Existing findings:',
    ...((task.findings?.length ? task.findings : ['No findings recorded yet.']).map((item) => `- ${item}`)),
    '',
    'Dependencies:',
    ...(dependencies.length ? dependencies.map((dependency) => `- ${dependency.kind}: ${dependency.fromRef} -> ${dependency.toRef}`) : ['- No linked dependencies recorded.']),
    '',
    'Blockers:',
    ...(blockers.length ? blockers.map((blocker) => `- ${blocker.title}: ${blocker.description}`) : ['- No direct blocker records.']),
    '',
    'Relevant artifacts:',
    ...(artifacts.length ? artifacts.map((artifact) => `- ${artifact.title}: ${artifact.pathOrUrl}`) : ['- No linked artifacts recorded.']),
    '',
    'Expected deliverables:',
    ...actionMeta.deliverables.map((item) => `- ${item}`),
    '',
    'Return concise, operator-usable output. If assumptions are needed, label them.',
  ].join('\n')

  return { generatedAt: new Date().toISOString(), action, title: `${action}:${task.id}`, taskId: task.id, suggestedPrompt: prompt, suggestedLabel: `${action}-${task.id}`, suggestedOutcome: actionMeta.deliverables, discordTarget: target }
}

function buildDiscordHandoff(board, task, mode) {
  const { epic, product, lane, dependencies, blockers, artifacts } = getTaskContext(board, task)
  const target = getDiscordTarget(task)
  const doneCount = (task.subtasks ?? []).filter((item) => item.status === 'done').length
  const totalCount = task.subtasks?.length ?? 0
  const progressLine = totalCount > 0 ? `${doneCount}/${totalCount} subtasks complete` : 'No subtasks expanded yet'
  const findings = task.findings?.length ? task.findings.slice(0, 5).map((item) => `- ${item}`) : ['- No findings recorded yet.']
  const artifactLines = artifacts.length ? artifacts.slice(0, 5).map((artifact) => `- ${artifact.title}: ${artifact.pathOrUrl}`) : ['- No linked artifacts yet.']
  const blockerLines = blockers.length ? blockers.map((blocker) => `- ${blocker.title} (${blocker.status})`) : ['- No direct blockers recorded.']
  const depLines = dependencies.length ? dependencies.map((dependency) => `- ${dependency.kind}: ${dependency.fromRef} -> ${dependency.toRef}`) : ['- No linked dependencies recorded.']

  const forumTitle = `[${mode}] ${product?.name ?? task.productId} — ${task.title}`
  const forumBody = [
    `**Task:** ${task.title}`,
    `**Task ID:** ${task.id}`,
    `**Mode:** ${mode}`,
    `**Target:** ${target.targetSummary}`,
    `**Product:** ${product?.name ?? task.productId}`,
    `**Lane:** ${lane?.name ?? task.laneId}`,
    `**Epic:** ${epic?.title ?? task.epicId}`,
    `**Priority / Status:** ${task.priority} / ${task.status}`,
    `**Progress:** ${progressLine}`,
    '',
    '**Summary**', task.summary || 'No summary yet.', '',
    '**Notes**', task.notes || 'No notes yet.', '',
    '**Findings**', ...findings, '',
    '**Dependencies**', ...depLines, '',
    '**Blockers**', ...blockerLines, '',
    '**Linked Artifacts**', ...artifactLines, '',
    '**Requested outcome**',
    mode === 'research' ? '- Research the task, reduce uncertainty, and return concrete findings/recommendations.' : mode === 'implement' ? '- Execute the smallest meaningful slice and report what changed / what remains.' : '- Review the current direction, identify gaps, and recommend accept/revise steps.',
  ].join('\n')

  const threadUpdate = [
    `@here task update: **${task.title}**`, '',
    `- mode: ${mode}`,
    `- target: ${target.targetSummary}`,
    `- status: ${task.status}`,
    `- priority: ${task.priority}`,
    `- progress: ${progressLine}`,
    `- summary: ${task.summary || 'No summary yet.'}`,
    '',
    'Need from this thread:',
    mode === 'research' ? '- research findings + recommendation' : mode === 'implement' ? '- implementation progress + changed files/systems + blockers' : '- review verdict + issues + next step recommendation',
  ].join('\n')

  return { generatedAt: new Date().toISOString(), mode, forumTitle, forumBody, threadUpdate, discordTarget: target }
}

async function executeDiscordHandoff(board, task, mode) {
  const packet = buildDiscordHandoff(board, task, mode)
  const target = packet.discordTarget

  if (target.targetKind === 'existing_thread') {
    if (!target.targetId) throw new Error('Task prefers existing thread but no discordThreadId is linked')
    await runOpenClaw(['message', `--action=send`, `--channel=${target.targetId}`, `--message=${JSON.stringify(packet.threadUpdate)}`], 30000)
    task.discordLastMessageId = 'sent-via-openclaw'
  } else {
    if (!target.targetId) throw new Error('Task prefers new forum post but no discordForumId is linked')
    const stdout = await runOpenClaw(['message', 'thread', 'create', '--channel', 'discord', '--target', `channel:${target.targetId}`, `--thread-name=${JSON.stringify(packet.forumTitle)}`, '-m', packet.forumBody, '--json'], 45000)
    let parsed = null
    try { parsed = JSON.parse(stdout) } catch {}
    const threadId = parsed?.id || parsed?.thread?.id || parsed?.channel?.id || parsed?.thread_id || null
    const messageId = parsed?.message?.id || parsed?.message_id || null
    if (threadId) task.discordThreadId = String(threadId)
    if (messageId) task.discordLastMessageId = String(messageId)
    task.handoffPreference = 'existing_thread'
  }

  task.lastHandoffAt = new Date().toISOString()
  task.lastHandoffMode = mode
  await writeBoard(board)
  return { ok: true, executedAt: task.lastHandoffAt, packet, task }
}

function buildExpansion(task) {
  const title = task.title.toLowerCase()
  const steps = []
  if (task.type === 'design') steps.push('Clarify scope, constraints, and acceptance criteria', 'Draft the core model or proposal', 'Review edge cases and dependency impacts', 'Capture decision summary for the board')
  else if (task.type === 'code') steps.push('Locate affected files and integration points', 'Implement the smallest end-to-end slice', 'Validate behavior locally', 'Document follow-up cleanup or refactors')
  else if (task.type === 'infra') steps.push('Confirm runtime/service touchpoints', 'Make the config or service change', 'Verify health and rollback path', 'Record operator notes and validation output')
  else steps.push('Read the relevant docs and current state', 'Draft the updated content', 'Cross-check linked systems and references', 'Finalize the operator-facing version')
  if (title.includes('metrics')) steps.splice(2, 0, 'Validate exposed metric names, labels, and scrape path')
  if (title.includes('theme')) steps.splice(1, 0, 'Capture light/dark/system behavior expectations')
  if (title.includes('model')) steps.splice(1, 0, 'Check downstream consumers of the schema before changing structure')
  return steps.map((step, index) => ({ id: `${task.id}::${index + 1}`, title: step, status: 'pending' }))
}

function validateDependencies(board) {
  const refs = new Set([...board.products.map((item) => item.id), ...board.lanes.map((item) => item.id), ...board.milestones.map((item) => item.id), ...board.epics.map((item) => item.id), ...board.tasks.map((item) => item.id), ...board.blockers.map((item) => item.id), ...board.artifacts.map((item) => item.id)])
  const missingRefs = []
  for (const dependency of board.dependencies) {
    if (!refs.has(dependency.fromRef)) missingRefs.push({ dependencyId: dependency.id, side: 'fromRef', ref: dependency.fromRef })
    if (!refs.has(dependency.toRef)) missingRefs.push({ dependencyId: dependency.id, side: 'toRef', ref: dependency.toRef })
  }
  const taskIds = new Set(board.tasks.map((task) => task.id))
  const graph = new Map(board.tasks.map((task) => [task.id, []]))
  for (const dependency of board.dependencies) if (taskIds.has(dependency.fromRef) && taskIds.has(dependency.toRef)) graph.get(dependency.fromRef).push(dependency.toRef)
  const visited = new Set(); const visiting = new Set(); const cycles = []
  function dfs(node, trail = []) {
    if (visiting.has(node)) { const loopStart = trail.indexOf(node); cycles.push([...trail.slice(loopStart), node]); return }
    if (visited.has(node)) return
    visiting.add(node)
    for (const next of graph.get(node) ?? []) dfs(next, [...trail, node])
    visiting.delete(node); visited.add(node)
  }
  for (const taskId of graph.keys()) dfs(taskId)
  return { checkedAt: new Date().toISOString(), ok: missingRefs.length === 0 && cycles.length === 0, missingRefs, cycles }
}

async function listMemoryFiles() {
  const files = []
  try {
    const entries = await fs.readdir(memoryDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue
      const relPath = path.join('memory', entry.name)
      const stat = await fs.stat(path.join(memoryDir, entry.name))
      files.push({ id: relPath, path: relPath, title: entry.name, kind: 'daily', updatedAt: stat.mtime.toISOString() })
    }
  } catch {}
  try {
    const stat = await fs.stat(longTermMemoryPath)
    files.unshift({ id: 'MEMORY.md', path: 'MEMORY.md', title: 'MEMORY.md', kind: 'memory', updatedAt: stat.mtime.toISOString() })
  } catch {}
  return files.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}
async function getMemoryFile(id) { return (await listMemoryFiles()).find((file) => file.id === id) ?? null }

async function serveStatic(reqPath, res) {
  let filePath = path.join(distDir, reqPath === '/' ? 'index.html' : reqPath)
  try {
    const stat = await fs.stat(filePath)
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html')
    const body = await fs.readFile(filePath)
    const ext = path.extname(filePath)
    send(res, 200, body, contentTypes[ext] || 'application/octet-stream')
  } catch {
    send(res, 200, await fs.readFile(path.join(distDir, 'index.html')), 'text/html; charset=utf-8')
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`)
    if (url.pathname === '/api/docs' && req.method === 'GET') return send(res, 200, await readCatalog())
    if (url.pathname.startsWith('/api/docs/')) {
      const id = decodeURIComponent(url.pathname.replace('/api/docs/', ''))
      const doc = await getDocById(id)
      if (!doc) return send(res, 404, { error: 'Doc not found' })
      const fullPath = resolveWorkspacePath(doc.path)
      if (req.method === 'GET') return send(res, 200, { ...doc, content: await fs.readFile(fullPath, 'utf8') })
      if (req.method === 'PUT') {
        const json = JSON.parse((await readBody(req)) || '{}')
        if (typeof json.content !== 'string') return send(res, 400, { error: 'content must be a string' })
        await fs.writeFile(fullPath, json.content, 'utf8')
        return send(res, 200, { ok: true, path: doc.path, savedAt: new Date().toISOString() })
      }
    }
    if (url.pathname === '/api/board') {
      if (req.method === 'GET') return send(res, 200, await readBoard())
      if (req.method === 'PUT') { await writeBoard(JSON.parse((await readBody(req)) || '{}')); return send(res, 200, { ok: true, savedAt: new Date().toISOString() }) }
    }
    if (url.pathname === '/api/board/validate' && req.method === 'POST') return send(res, 200, validateDependencies(await readBoard()))
    if (url.pathname.startsWith('/api/board/task/')) {
      const suffix = decodeURIComponent(url.pathname.replace('/api/board/task/', ''))
      const [taskId, action] = suffix.split('/')
      const board = await readBoard(); const task = board.tasks.find((item) => item.id === taskId)
      if (!task) return send(res, 404, { error: 'Task not found' })
      if (action === 'expand' && req.method === 'POST') {
        const subtasks = buildExpansion(task); task.subtasks = subtasks; if (!task.notes) task.notes = 'Expanded from board action.'; await writeBoard(board); return send(res, 200, { ok: true, subtasks, savedAt: new Date().toISOString() })
      }
      if (action === 'research-brief' && req.method === 'POST') return send(res, 200, buildTaskResearchBrief(board, task))
      if (action === 'agent-action' && req.method === 'POST') {
        const mode = JSON.parse((await readBody(req)) || '{}').mode
        if (!['research', 'implement', 'review'].includes(mode)) return send(res, 400, { error: 'mode must be research, implement, or review' })
        return send(res, 200, buildAgentActionPacket(board, task, mode))
      }
      if (action === 'discord-handoff' && req.method === 'POST') {
        const mode = JSON.parse((await readBody(req)) || '{}').mode
        if (!['research', 'implement', 'review'].includes(mode)) return send(res, 400, { error: 'mode must be research, implement, or review' })
        return send(res, 200, buildDiscordHandoff(board, task, mode))
      }
      if (action === 'discord-execute' && req.method === 'POST') {
        const mode = JSON.parse((await readBody(req)) || '{}').mode
        if (!['research', 'implement', 'review'].includes(mode)) return send(res, 400, { error: 'mode must be research, implement, or review' })
        return send(res, 200, await executeDiscordHandoff(board, task, mode))
      }
    }
    if (url.pathname === '/api/memory/files' && req.method === 'GET') return send(res, 200, await listMemoryFiles())
    if (url.pathname.startsWith('/api/memory/file/')) {
      const id = decodeURIComponent(url.pathname.replace('/api/memory/file/', ''))
      const file = await getMemoryFile(id)
      if (!file) return send(res, 404, { error: 'Memory file not found' })
      const fullPath = resolveWorkspacePath(file.path)
      if (req.method === 'GET') return send(res, 200, { ...file, content: await fs.readFile(fullPath, 'utf8') })
      if (req.method === 'PUT') {
        const json = JSON.parse((await readBody(req)) || '{}')
        if (typeof json.content !== 'string') return send(res, 400, { error: 'content must be a string' })
        await fs.writeFile(fullPath, json.content, 'utf8')
        return send(res, 200, { ok: true, path: file.path, savedAt: new Date().toISOString() })
      }
    }
    return serveStatic(url.pathname, res)
  } catch (error) {
    return send(res, 500, { error: error instanceof Error ? error.message : 'unknown error' })
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`ClawDash server listening on :${port}`)
})
