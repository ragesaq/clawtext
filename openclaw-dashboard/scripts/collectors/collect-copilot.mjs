import { envNumber, envString, nowIso, opsPath, readJson, sidebarPath, writeJson } from './shared.mjs'
import { getModelStatusJson, providerStatusFromModelStatus } from './model-status.mjs'

const ops = await readJson(opsPath)
const sidebar = await readJson(sidebarPath)
const modelStatus = await getModelStatusJson()

ops.source = modelStatus ? 'collector-openclaw' : 'collector-stub'
ops.updatedAt = nowIso()
ops.copilot.plan = envString('COPILOT_PLAN', ops.copilot.plan)
ops.copilot.monthlyPremiumMessages.used = envNumber('COPILOT_PREMIUM_USED', ops.copilot.monthlyPremiumMessages.used)
ops.copilot.monthlyPremiumMessages.limit = envNumber('COPILOT_PREMIUM_LIMIT', ops.copilot.monthlyPremiumMessages.limit)
ops.copilot.monthlyPremiumMessages.dayOfMonth = envNumber('COPILOT_DAY_OF_MONTH', ops.copilot.monthlyPremiumMessages.dayOfMonth)
ops.copilot.chatRequestsToday = envNumber('COPILOT_CHAT_REQUESTS_TODAY', ops.copilot.chatRequestsToday)
ops.copilot.acceptRate = envNumber('COPILOT_ACCEPT_RATE', ops.copilot.acceptRate)

const provider = ops.providers.find((item) => item.id === 'github-copilot')
if (provider) {
  provider.status = providerStatusFromModelStatus(modelStatus, 'github-copilot') ?? envString('COPILOT_STATUS', provider.status)
  provider.latencyMs = envNumber('COPILOT_LATENCY_MS', provider.latencyMs)
  provider.errorRatePct = envNumber('COPILOT_ERROR_RATE_PCT', provider.errorRatePct)
}

sidebar.source = ops.source
sidebar.updatedAt = ops.updatedAt
sidebar.copilot.completions = envNumber('COPILOT_COMPLETIONS_TODAY', sidebar.copilot.completions)
sidebar.copilot.acceptRate = envNumber('COPILOT_ACCEPT_RATE', sidebar.copilot.acceptRate)
sidebar.copilot.chatRequests = envNumber('COPILOT_CHAT_REQUESTS_TODAY', sidebar.copilot.chatRequests)

await writeJson(opsPath, ops)
await writeJson(sidebarPath, sidebar)
console.log('Updated GitHub Copilot usage snapshot')
