import { memo } from 'react'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { formatCurrency, formatDateShort } from '../utils/formatUtils'
import type { SessionStore } from '../stores/sessionStore'

interface SessionHeaderProps {
  sessionStore: SessionStore
  currentDate: Date
  speed: number
  onSpeedChange: (speed: number) => void
  onDateClick: () => void
  isMobile: boolean
}

export default memo(function SessionHeader({
  sessionStore,
  currentDate,
  speed,
  onSpeedChange,
  onDateClick,
  isMobile,
}: SessionHeaderProps) {
  const { gameTime, buyingPower, unrealizedPnL } = useStore(
    sessionStore,
    useShallow((s) => ({
      gameTime: s.gameTime,
      buyingPower: s.buyingPower,
      unrealizedPnL: s.unrealizedPnL,
    })),
  )

  const dateButton = (
    <button
      className="text-text-secondary text-sm border-none bg-transparent cursor-pointer font-mono border-b border-dashed border-text-secondary"
      onClick={onDateClick}
    >
      {formatDateShort(currentDate)}
    </button>
  )

  const speedButtons = (
    <div className="flex gap-1">
      <button
        className={`sm:py-1.5 sm:px-3 py-1 px-2 border-none rounded cursor-pointer font-mono sm:text-[13px] text-xs ${
          speed === 1 ? 'bg-accent text-white' : 'bg-bg-button text-text-primary'
        }`}
        onClick={() => onSpeedChange(1)}
      >
        1x
      </button>
      <button
        className={`sm:py-1.5 sm:px-3 py-1 px-2 border-none rounded cursor-pointer font-mono sm:text-[13px] text-xs ${
          speed === 2 ? 'bg-accent text-white' : 'bg-bg-button text-text-primary'
        }`}
        onClick={() => onSpeedChange(2)}
      >
        2x
      </button>
    </div>
  )

  const pnlDisplay = (
    <span>
      損益:{' '}
      <span className={unrealizedPnL >= 0 ? 'text-profit' : 'text-loss'}>
        {unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(unrealizedPnL)}
      </span>
    </span>
  )

  if (isMobile) {
    return (
      <div className="flex justify-between items-center px-2.5 py-1.5 bg-bg-panel border-b border-bg-elevated text-xs shrink-0 flex-wrap gap-1">
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            {dateButton}
            <span className="text-base font-bold">{gameTime}</span>
          </div>
          <div className="flex gap-2">
            {speedButtons}
          </div>
        </div>
        <div className="flex justify-between items-center w-full text-xs">
          <span>余力: {formatCurrency(buyingPower)}</span>
          {pnlDisplay}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-between items-center px-4 py-2 bg-bg-panel border-b border-bg-elevated text-sm shrink-0">
      <div className="flex items-center gap-2">
        {dateButton}
        <span className="text-lg font-bold">{gameTime}</span>
      </div>
      <span>余力: {formatCurrency(buyingPower)}</span>
      {pnlDisplay}
      {speedButtons}
    </div>
  )
})
