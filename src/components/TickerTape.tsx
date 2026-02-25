import { memo, useEffect, useRef } from 'react'
import { useStore } from 'zustand'
import { formatCurrency } from '../utils/formatUtils'
import type { TickStore } from '../stores/tickStore'

interface TickerTapeProps {
  tickStore: TickStore
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

interface TickRowProps {
  price: number
  timestamp: number
  volume: number
  prevPrice: number
  compact: boolean
}

const TickRow = memo(function TickRow({ price, timestamp, volume, prevPrice, compact }: TickRowProps) {
  const priceClass = getPriceClass(price, prevPrice)
  return (
    <div
      className={`flex justify-between border-b border-border-ticker ${
        compact ? 'py-px px-0.5' : 'py-0.5 px-1'
      }`}
    >
      <span className={`text-text-secondary ${compact ? 'min-w-9' : 'min-w-[42px]'}`}>
        {formatTime(timestamp)}
      </span>
      <span className={priceClass}>{formatCurrency(price)}</span>
      <span className={`text-text-secondary text-right ${compact ? 'min-w-10' : 'min-w-[50px]'}`}>
        {volume.toLocaleString()}
      </span>
    </div>
  )
})

export default memo(function TickerTape({ tickStore, maxDisplay = 50, compact = false }: TickerTapeProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const ticks = useStore(tickStore, (s) => s.ticks)

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
        return (
          <TickRow
            key={tick.timestamp}
            price={tick.price}
            timestamp={tick.timestamp}
            volume={tick.volume}
            prevPrice={prevPrice}
            compact={compact}
          />
        )
      })}
    </div>
  )
})
