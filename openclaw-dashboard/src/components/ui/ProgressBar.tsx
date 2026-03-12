export function ProgressBar({ value, colorClass = 'bg-primary' }: { value: number; colorClass?: string }) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}
