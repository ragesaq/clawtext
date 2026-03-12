import { envNumber, envString, nowIso, opsPath, readJson, sidebarPath, writeJson } from './shared.mjs'
import { getModelStatusJson, oauthRemainingMs, providerStatusFromModelStatus } from './model-status.mjs'

const ops = await readJson(opsPath)
const sidebar = await readJson(sidebarPath)
const modelStatus = await getModelStatusJson()

ops.source = modelStatus ? 'collector-openclaw' : 'collector-stub'
ops.updatedAt = nowIso()
ops.openaiPlus.plan = envString('OPENAI_PLUS_PLAN', ops.openaiPlus.plan)
ops.openaiPlus.fiveHourWindow.usedPct = envNumber('OPENAI_PLUS_5H_USED_PCT', ops.openaiPlus.fiveHourWindow.usedPct)
ops.openaiPlus.fiveHourWindow.hoursElapsed = envNumber('OPENAI_PLUS_5H_HOURS_ELAPSED', ops.openaiPlus.fiveHourWindow.hoursElapsed)
ops.openaiPlus.weeklyWindow.usedPct = envNumber('OPENAI_PLUS_WEEK_USED_PCT', ops.openaiPlus.weeklyWindow.usedPct)
ops.openaiPlus.weeklyWindow.daysElapsed = envNumber('OPENAI_PLUS_WEEK_DAYS_ELAPSED', ops.openaiPlus.weeklyWindow.daysElapsed)

const openaiProvider = ops.providers.find((provider) => provider.id === 'openai-plus')
if (openaiProvider) {
  openaiProvider.status = providerStatusFromModelStatus(modelStatus, 'openai-codex') ?? envString('OPENAI_PLUS_STATUS', openaiProvider.status)
  openaiProvider.latencyMs = envNumber('OPENAI_PLUS_LATENCY_MS', openaiProvider.latencyMs)
  openaiProvider.errorRatePct = envNumber('OPENAI_PLUS_ERROR_RATE_PCT', openaiProvider.errorRatePct)
  const remainingMs = oauthRemainingMs(modelStatus, 'openai-codex')
  if (remainingMs && remainingMs > 0) {
    openaiProvider.throughputLabel = `oauth ok • ${(remainingMs / 86400000).toFixed(1)}d token life`
  }
}

sidebar.source = ops.source
sidebar.updatedAt = ops.updatedAt
sidebar.openai.requests = envNumber('OPENAI_REQUESTS_TODAY', sidebar.openai.requests)
sidebar.openai.tokens = envNumber('OPENAI_TOKENS_TODAY', sidebar.openai.tokens)
sidebar.openai.costUsd = envNumber('OPENAI_COST_USD_TODAY', sidebar.openai.costUsd)

await writeJson(opsPath, ops)
await writeJson(sidebarPath, sidebar)
console.log('Updated OpenAI Plus usage snapshot')
