interface MonthlyPnLChartProps {
  data: { pnl: number }[]
  barHeight?: string
  className?: string
}

export default function MonthlyPnLChart({
  data,
  barHeight = 'h-2',
  className = '',
}: MonthlyPnLChartProps) {
  if (data.length === 0) return null

  const maxAbsPnl = Math.max(1, ...data.map((d) => Math.abs(d.pnl)))

  return (
    <div className={className}>
      {data.map((d, i) => {
        const width = Math.max(2, (Math.abs(d.pnl) / maxAbsPnl) * 100)
        return (
          <div key={i} className="flex items-center mb-0.5 text-[11px]">
            <span className="w-7 text-text-secondary text-right mr-1.5">{i + 1}</span>
            <div
              className={`${barHeight} rounded-sm ${d.pnl >= 0 ? 'bg-profit' : 'bg-loss'}`}
              style={{ width: `${width}%` }}
            />
          </div>
        )
      })}
    </div>
  )
}
