import fs from 'node:fs/promises'
import path from 'node:path'

export const rootDir = path.resolve(new URL('../..', import.meta.url).pathname)
export const dataDir = path.join(rootDir, 'public', 'data')
export const opsPath = path.join(dataDir, 'ops-metrics.json')
export const sidebarPath = path.join(dataDir, 'sidebar-usage.json')

export async function ensureDataDir() {
  await fs.mkdir(dataDir, { recursive: true })
}

export async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

export async function writeJson(filePath, data) {
  await ensureDataDir()
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

export function nowIso() {
  return new Date().toISOString()
}

export function envNumber(name, fallback) {
  const value = process.env[name]
  if (value == null || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function envString(name, fallback) {
  return process.env[name] || fallback
}
