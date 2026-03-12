export function MiniBars({ values, colorClass = 'bg-primary' }: { values: number[]; colorClass?: string }) {
  const max = Math.max(...values, 1)

  return (
    <div className="flex h-10 items-end gap-1">
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className={`w-full rounded-sm ${colorClass}`}
          style={{ height: `${Math.max((value / max) * 100, 8)}%`, opacity: 0.45 + index / (values.length * 1.5) }}
        />
      ))}
    </div>
  )
}
