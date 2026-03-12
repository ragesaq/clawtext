import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function getModelStatusJson() {
  try {
    const { stdout } = await execFileAsync('openclaw', ['models', '--status-json'], {
      maxBuffer: 1024 * 1024 * 10,
    })
    return JSON.parse(stdout)
  } catch {
    return null
  }
}

export function providerStatusFromModelStatus(statusJson, providerName) {
  const provider = statusJson?.auth?.oauth?.providers?.find((p) => p.provider === providerName)
  if (!provider) return null
  if (provider.status === 'ok') return 'healthy'
  if (provider.status === 'missing') return 'down'
  return 'degraded'
}

export function oauthRemainingMs(statusJson, providerName) {
  const provider = statusJson?.auth?.oauth?.providers?.find((p) => p.provider === providerName)
  return provider?.remainingMs ?? null
}
