import { useEffect, useState } from 'react'

interface SidebarUsageData {
  source: string
  updatedAt: string
  openai: {
    window: string
    requests: number
    tokens: number
    costUsd: number
    trend: number[]
  }
  copilot: {
    window: string
    completions: number
    acceptRate: number
    chatRequests: number
    trend: number[]
  }
  notes?: string
}

const fallback: SidebarUsageData = {
  source: 'seed',
  updatedAt: '2026-03-11T07:30:00Z',
  openai: { window: 'today', requests: 148, tokens: 482000, costUsd: 9.42, trend: [3.9, 4.7, 5.6, 6.1, 7.4, 8.5, 9.42] },
  copilot: { window: 'today', completions: 311, acceptRate: 0.37, chatRequests: 42, trend: [210, 238, 267, 289, 318, 347, 371] },
  notes: 'Temporary seed data. Replace with non-LLM cron-fed usage collector.',
}

export function useSidebarUsage() {
  const [data, setData] = useState<SidebarUsageData>(fallback)

  useEffect(() => {
    let cancelled = false

    fetch('/data/sidebar-usage.json')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load usage data')
        return response.json()
      })
      .then((json: SidebarUsageData) => {
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
