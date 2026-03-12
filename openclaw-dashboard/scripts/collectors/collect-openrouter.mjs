import { envNumber, envString, nowIso, opsPath, readJson, writeJson } from './shared.mjs'
import { getModelStatusJson, providerStatusFromModelStatus } from './model-status.mjs'

const ops = await readJson(opsPath)
const modelStatus = await getModelStatusJson()

ops.source = modelStatus ? 'collector-openclaw' : 'collector-stub'
ops.updatedAt = nowIso()

const provider = ops.providers.find((item) => item.id === 'openrouter')
if (provider) {
  provider.status = providerStatusFromModelStatus(modelStatus, 'openrouter') ?? envString('OPENROUTER_STATUS', provider.status)
  provider.latencyMs = envNumber('OPENROUTER_LATENCY_MS', provider.latencyMs)
  provider.errorRatePct = envNumber('OPENROUTER_ERROR_RATE_PCT', provider.errorRatePct)
}

let fetched = false
const key = process.env.OPENROUTER_MANAGEMENT_KEY
if (key) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    })
    if (response.ok) {
      const json = await response.json()
      const data = json?.data ?? json
      const totalCredits = Number(data?.total_credits ?? data?.totalCredits ?? 0)
      const totalUsage = Number(data?.total_usage ?? data?.totalUsage ?? 0)
      if (Number.isFinite(totalUsage) && totalUsage >= 0) {
        ops.costs.meteredApis.todayUsd = envNumber('OPENROUTER_COST_USD_TODAY', ops.costs.meteredApis.todayUsd)
        ops.costs.meteredApis.weekUsd = envNumber('OPENROUTER_COST_USD_WEEK', Math.max(ops.costs.meteredApis.weekUsd, totalUsage))
        if (provider && Number.isFinite(totalCredits) && totalCredits > 0) {
          provider.throughputLabel = `$${totalUsage.toFixed(2)} used / $${totalCredits.toFixed(2)} credits`
        }
        fetched = true
      }
    }
  } catch {
    fetched = false
  }
}

if (!fetched) {
  ops.costs.meteredApis.todayUsd = envNumber('OPENROUTER_COST_USD_TODAY', ops.costs.meteredApis.todayUsd)
  ops.costs.meteredApis.weekUsd = envNumber('OPENROUTER_COST_USD_WEEK', ops.costs.meteredApis.weekUsd)
}

await writeJson(opsPath, ops)
console.log('Updated OpenRouter usage snapshot')
