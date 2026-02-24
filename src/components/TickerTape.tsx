import { useEffect, useRef } from 'react'
import { formatCurrency } from '../utils/formatUtils'

interface TickerTapeProps {
  ticks: Array<{ price: number; timestamp: number; volume: number }>
  maxDisplay?: number
  compact?: boolean
}

function formatTime(timestamp: number) {
  const hours = Math.floor(timestamp / 60)
  const minutes = Math.floor(timestamp % 60)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getPriceClass(current: number, prev: number) {
  if (current > prev) return 'text-profit'
  if (current < prev) return 'text-loss'
  return 'text-text-secondary'
}

export default function TickerTape({ ticks, maxDisplay = 50, compact = false }: TickerTapeProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [ticks])

  if (!ticks || ticks.length === 0) return null

  const displayTicks = ticks.slice(-maxDisplay)

  return (
    <div
      ref={scrollRef}
      className={`bg-bg-panel text-text-primary font-mono h-full overflow-y-auto overflow-x-hidden ${
        compact ? 'p-0.5 text-[11px]' : 'p-2 text-xs'
      }`}
    >
      <div className={`text-text-secondary mb-1 border-b border-bg-elevated pb-1 ${compact ? 'text-[11px]' : 'text-xs'}`}>
        歩み値
      </div>
      {displayTicks.map((tick, i) => {
        const prevPrice = i > 0 ? displayTicks[i - 1].price : tick.price
        const priceClass = getPriceClass(tick.price, prevPrice)

        return (
          <div
            key={i}
            className={`flex justify-between border-b border-border-ticker ${
              compact ? 'py-px px-0.5' : 'py-0.5 px-1'
            }`}
          >
            <span className={`text-text-secondary ${compact ? 'min-w-9' : 'min-w-[42px]'}`}>
              {formatTime(tick.timestamp)}
            </span>
            <span className={priceClass}>{formatCurrency(tick.price)}</span>
            <span className={`text-text-secondary text-right ${compact ? 'min-w-10' : 'min-w-[50px]'}`}>
              {tick.volume.toLocaleString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
