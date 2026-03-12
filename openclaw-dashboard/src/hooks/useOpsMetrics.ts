import { useEffect, useState } from 'react'

export interface OpsMetricsData {
  source: string
  updatedAt: string
  providers: {
    id: string
    name: string
    status: 'healthy' | 'degraded' | 'down'
    latencyMs: number
    errorRatePct: number
    throughputLabel: string
    trend: number[]
  }[]
  openaiPlus: {
    plan: string
    fiveHourWindow: {
      usedPct: number
      hoursElapsed: number
      historyPct: number[]
    }
    weeklyWindow: {
      usedPct: number
      daysElapsed: number
      historyPct: number[]
    }
  }
  copilot: {
    plan: string
    monthlyPremiumMessages: {
      used: number
      limit: number
      dayOfMonth: number
      historyUsed: number[]
    }
    chatRequestsToday: number
    acceptRate: number
  }
  costs: {
    meteredApis: {
      todayUsd: number
      weekUsd: number
      trendUsd: number[]
    }
    clawsaver: {
      callsSaved: number
      savingsRatio: number
      trendPct: number[]
    }
  }
  notes?: string
}

const fallback: OpsMetricsData = {
  source: 'seed',
  updatedAt: '2026-03-11T07:20:00Z',
  providers: [
    { id: 'openai-plus', name: 'OpenAI / ChatGPT Plus', status: 'healthy', latencyMs: 1180, errorRatePct: 0.4, throughputLabel: 'subscription quota', trend: [38, 44, 48, 52, 57, 61, 64] },
    { id: 'github-copilot', name: 'GitHub Copilot', status: 'healthy', latencyMs: 820, errorRatePct: 0.2, throughputLabel: 'premium messages/month', trend: [210, 238, 267, 289, 318, 347, 371] },
    { id: 'openrouter', name: 'OpenRouter', status: 'degraded', latencyMs: 1540, errorRatePct: 1.6, throughputLabel: 'api metered', trend: [71, 69, 73, 68, 65, 61, 58] },
  ],
  openaiPlus: {
    plan: 'ChatGPT Plus',
    fiveHourWindow: { usedPct: 64, hoursElapsed: 3.2, historyPct: [18, 24, 31, 39, 48, 57, 64] },
    weeklyWindow: { usedPct: 43, daysElapsed: 2.3, historyPct: [12, 16, 21, 28, 34, 39, 43] },
  },
  copilot: {
    plan: 'GitHub Copilot',
    monthlyPremiumMessages: { used: 371, limit: 1500, dayOfMonth: 11, historyUsed: [210, 238, 267, 289, 318, 347, 371] },
    chatRequestsToday: 42,
    acceptRate: 0.37,
  },
  costs: {
    meteredApis: { todayUsd: 9.42, weekUsd: 36.81, trendUsd: [3.9, 4.7, 5.6, 6.1, 7.4, 8.5, 9.42] },
    clawsaver: { callsSaved: 247, savingsRatio: 0.28, trendPct: [19, 21, 22, 24, 25, 27, 28] },
  },
  notes: 'Temporary seed data. Replace with non-LLM cron-fed usage collector and real telemetry sources.',
}

export function useOpsMetrics() {
  const [data, setData] = useState<OpsMetricsData>(fallback)

  useEffect(() => {
    let cancelled = false

    fetch('/data/ops-metrics.json')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load ops metrics')
        return response.json()
      })
      .then((json: OpsMetricsData) => {
        if (!cancelled) setData(json)
      })
      .catch(() => {
        if (!cancelled) setData(fallback)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return data
}
