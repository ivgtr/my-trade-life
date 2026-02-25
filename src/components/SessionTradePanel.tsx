import { useStore } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import TradePanel from './TradePanel'
import type { SessionStore } from '../stores/sessionStore'
import type { Direction, SetSLTPFn } from '../types'

interface SessionTradePanelProps {
  sessionStore: SessionStore
  maxLeverage: number
  onEntry: (direction: Direction, shares: number) => void
  onClose: (positionId: string) => void
  onCloseAll: () => void
  onSetSLTP: SetSLTPFn
  compact?: boolean
}

export default function SessionTradePanel({
  sessionStore,
  maxLeverage,
  onEntry,
  onClose,
  onCloseAll,
  onSetSLTP,
  compact,
}: SessionTradePanelProps) {
  const { currentPrice, availableCash, creditMargin, buyingPower, positions } = useStore(
    sessionStore,
    useShallow((s) => ({
      currentPrice: s.currentPrice,
      availableCash: s.availableCash,
      creditMargin: s.creditMargin,
      buyingPower: s.buyingPower,
      positions: s.positions,
    })),
  )

  return (
    <TradePanel
      currentPrice={currentPrice}
      availableCash={availableCash}
      creditMargin={creditMargin}
      buyingPower={buyingPower}
      maxLeverage={maxLeverage}
      positions={positions}
      onEntry={onEntry}
      onClose={onClose}
      onCloseAll={onCloseAll}
      onSetSLTP={onSetSLTP}
      compact={compact}
    />
  )
}
