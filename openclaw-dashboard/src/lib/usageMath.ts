export function estimateHoursRemainingFromPct(usedPct: number, hoursElapsed: number) {
  if (usedPct <= 0 || hoursElapsed <= 0) return null
  const pctPerHour = usedPct / hoursElapsed
  if (pctPerHour <= 0) return null
  return (100 - usedPct) / pctPerHour
}

export function estimateDaysRemainingFromPct(usedPct: number, daysElapsed: number) {
  if (usedPct <= 0 || daysElapsed <= 0) return null
  const pctPerDay = usedPct / daysElapsed
  if (pctPerDay <= 0) return null
  return (100 - usedPct) / pctPerDay
}

export function estimateDaysUntilCap(used: number, limit: number, dayOfMonth: number) {
  if (used <= 0 || limit <= 0 || dayOfMonth <= 0) return null
  const usedPerDay = used / dayOfMonth
  if (usedPerDay <= 0) return null
  return (limit - used) / usedPerDay
}

export function formatRemaining(hoursOrDays: number | null, unit: 'hours' | 'days') {
  if (hoursOrDays === null || !isFinite(hoursOrDays)) return 'n/a'
  if (unit === 'hours') return `${hoursOrDays.toFixed(1)}h left`
  return `${hoursOrDays.toFixed(1)}d left`
}
