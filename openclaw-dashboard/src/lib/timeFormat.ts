export function formatRelativeFromIso(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  if (!isFinite(ms)) return iso
  const minutes = Math.max(0, Math.floor(ms / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
