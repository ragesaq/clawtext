import { useCallback, useEffect, useState } from 'react'
import { clawtaskSeed as fallbackSeed, type ClawTaskSeed } from '@/data/clawtaskSeed'

export function useClawTaskData() {
  const [data, setData] = useState<ClawTaskSeed>(fallbackSeed)
  const [source, setSource] = useState<'seed' | 'public-json' | 'api-board'>('seed')

  const reload = useCallback(() => {
    fetch('/api/board')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load board API')
        return response.json()
      })
      .then((json: ClawTaskSeed) => {
        setData(json)
        setSource('api-board')
      })
      .catch(() => {
        fetch('/data/clawtask-seed.json')
          .then((response) => {
            if (!response.ok) throw new Error('Failed to load ClawTask seed JSON')
            return response.json()
          })
          .then((json: ClawTaskSeed) => {
            setData(json)
            setSource('public-json')
          })
          .catch(() => {
            setData(fallbackSeed)
            setSource('seed')
          })
      })
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, source, reload, setData }
}
