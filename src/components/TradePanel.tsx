import { useState } from 'react'
import { formatCurrency } from '../utils/formatUtils'
import type { Position } from '../types'

interface TradePanelProps {
  availableCash: number
  creditMargin: number
  buyingPower: number
  maxLeverage: number
  unrealizedPnL: number
  positions: Position[]
  onBuy: (shares: number) => void
  onSell: (shares: number) => void
  onClose: (positionId: string) => void
  compact?: boolean
}

function getPnlClass(value: number) {
  if (value > 0) return 'text-profit'
  if (value < 0) return 'text-loss'
  return 'text-text-secondary'
}

interface DesktopTradePanelProps {
  availableCash: number
  creditMargin: number
  buyingPower: number
  maxLeverage: number
  unrealizedPnL: number
  positions: Position[]
  shares: number
  setShares: React.Dispatch<React.SetStateAction<number>>
  onBuy: (shares: number) => void
  onSell: (shares: number) => void
  onClose: (positionId: string) => void
}

function DesktopTradePanel({
  availableCash,
  creditMargin,
  buyingPower,
  maxLeverage,
  unrealizedPnL,
  positions,
  shares,
  setShares,
  onBuy,
  onSell,
  onClose,
}: DesktopTradePanelProps) {
  const addShares = (amount: number) => setShares((prev) => Math.max(1, prev + amount))

  return (
    <div className="bg-bg-panel text-text-primary p-3 font-mono h-full overflow-y-auto overflow-x-hidden">
      <div className="flex justify-between mb-1 text-sm">
        <span>余力: {formatCurrency(buyingPower)}</span>
        <span className={getPnlClass(unrealizedPnL)}>
          含み: {formatCurrency(unrealizedPnL)}
        </span>
      </div>
      {maxLeverage > 1 && (
        <div className="text-[11px] text-text-secondary mb-3">
          現金{formatCurrency(availableCash)} + 信用{formatCurrency(creditMargin)}
        </div>
      )}
      {maxLeverage <= 1 && <div className="mb-2" />}

      <div className="flex gap-2 items-center mb-2">
        <span className="text-xs text-text-secondary min-w-[52px]">株数</span>
        <input
          type="number"
          min="1"
          value={shares}
          onChange={(e) => setShares(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="bg-bg-elevated text-text-primary border border-bg-button rounded py-1.5 px-2 text-sm w-20 text-right"
        />
      </div>

      <div className="flex gap-1 mb-2">
        <button className="py-1 px-2.5 bg-bg-elevated text-text-primary border border-bg-button rounded text-xs cursor-pointer" onClick={() => addShares(1)}>+1</button>
        <button className="py-1 px-2.5 bg-bg-elevated text-text-primary border border-bg-button rounded text-xs cursor-pointer" onClick={() => addShares(10)}>+10</button>
        <button className="py-1 px-2.5 bg-bg-elevated text-text-primary border border-bg-button rounded text-xs cursor-pointer" onClick={() => addShares(100)}>+100</button>
        <button className="py-1 px-2.5 bg-bg-danger text-loss border border-border-danger rounded text-xs cursor-pointer" onClick={() => setShares(1)}>C</button>
      </div>

      <div className="flex gap-2 mb-3">
        <button
          className="flex-1 p-2.5 bg-profit text-white border-none rounded-md text-base font-bold cursor-pointer"
          onClick={() => onBuy(shares)}
        >
          BUY
        </button>
        <button
          className="flex-1 p-2.5 bg-loss text-white border-none rounded-md text-base font-bold cursor-pointer"
          onClick={() => onSell(shares)}
        >
          SELL
        </button>
      </div>

      {positions && positions.length > 0 && (
        <div>
          <div className="text-xs text-text-secondary mb-1.5 border-b border-bg-elevated pb-1">保有ポジション</div>
          <div className="max-h-[200px] overflow-y-auto">
            {positions.map((pos) => (
              <div key={pos.id} className="flex justify-between items-center py-1.5 border-b border-bg-elevated text-xs">
                <span className={pos.direction === 'LONG' ? 'text-profit' : 'text-loss'}>
                  {pos.direction}
                </span>
                <span>{pos.shares}株</span>
                <span>{formatCurrency(pos.entryPrice)}</span>
                <span className={getPnlClass(pos.unrealizedPnL)}>
                  {formatCurrency(pos.unrealizedPnL)}
                </span>
                <button
                  className="py-1 px-2 bg-text-muted text-white border-none rounded text-[11px] cursor-pointer"
                  onClick={() => onClose(pos.id)}
                >
                  決済
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MobilePositionSummary({ positions }: { positions: Position[] }) {
  if (!positions || positions.length === 0) return null

  const totalPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnL ?? 0), 0)
  const totalShares = positions.reduce((sum, p) => sum + p.shares, 0)
  const direction = positions[0]?.direction ?? ''

  return (
    <div className="flex justify-between items-center py-1.5 px-3 bg-bg-panel border-t border-bg-elevated text-xs font-mono text-text-primary shrink-0">
      <span>
        ポジション:{' '}
        <span className={direction === 'LONG' ? 'text-profit' : 'text-loss'}>
          {direction}
        </span>{' '}
        {totalShares}株
      </span>
      <span className={getPnlClass(totalPnl)}>{formatCurrency(totalPnl)}</span>
    </div>
  )
}

function MobileFooterBar({ onBuyTap, onSellTap }: { onBuyTap: () => void; onSellTap: () => void }) {
  return (
    <div className="flex gap-2 py-2 px-3 bg-bg-panel border-t border-bg-elevated shrink-0 h-14 items-center font-mono">
      <button
        className="flex-1 p-0 text-white border-none rounded-md text-base font-bold cursor-pointer min-h-11 bg-profit"
        onClick={onBuyTap}
      >
        BUY
      </button>
      <button
        className="flex-1 p-0 text-white border-none rounded-md text-base font-bold cursor-pointer min-h-11 bg-loss"
        onClick={onSellTap}
      >
        SELL
      </button>
    </div>
  )
}

interface OrderModalProps {
  side: 'BUY' | 'SELL'
  shares: number
  setShares: React.Dispatch<React.SetStateAction<number>>
  onConfirm: (shares: number) => void
  onCancel: () => void
}

function OrderModal({
  side,
  shares,
  setShares,
  onConfirm,
  onCancel,
}: OrderModalProps) {
  const isBuy = side === 'BUY'
  const label = isBuy ? '買い注文' : '売り注文'

  const addShares = (amount: number) => setShares((prev) => Math.max(1, prev + amount))

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[var(--z-overlay)] flex items-end"
      onClick={onCancel}
    >
      <div
        className="w-full bg-bg-panel rounded-t-2xl py-5 px-4 font-mono text-text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`text-base font-bold mb-4 ${isBuy ? 'text-profit' : 'text-loss'}`}>{label}</div>

        <div className="flex gap-2 items-center mb-3">
          <span className="text-[13px] text-text-secondary min-w-15">株数</span>
          <input
            type="number"
            min="1"
            value={shares}
            onChange={(e) => setShares(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="bg-bg-elevated text-text-primary border border-bg-button rounded py-2.5 px-3 text-base flex-1 text-right min-h-11"
          />
        </div>

        <div className="flex gap-2 mb-4">
          <button className="flex-1 py-2.5 bg-bg-elevated text-text-primary border border-bg-button rounded-md text-sm cursor-pointer min-h-11" onClick={() => addShares(1)}>+1</button>
          <button className="flex-1 py-2.5 bg-bg-elevated text-text-primary border border-bg-button rounded-md text-sm cursor-pointer min-h-11" onClick={() => addShares(10)}>+10</button>
          <button className="flex-1 py-2.5 bg-bg-elevated text-text-primary border border-bg-button rounded-md text-sm cursor-pointer min-h-11" onClick={() => addShares(100)}>+100</button>
          <button className="flex-1 py-2.5 bg-bg-danger text-loss border border-border-danger rounded-md text-sm cursor-pointer min-h-11" onClick={() => setShares(1)}>C</button>
        </div>

        <button
          className={`w-full py-3.5 text-white border-none rounded-lg text-lg font-bold cursor-pointer min-h-12 mt-2 ${
            isBuy ? 'bg-profit' : 'bg-loss'
          }`}
          onClick={() => onConfirm(shares)}
        >
          注文確定 ({side})
        </button>
      </div>
    </div>
  )
}

export default function TradePanel({
  availableCash,
  creditMargin,
  buyingPower,
  maxLeverage,
  unrealizedPnL,
  positions,
  onBuy,
  onSell,
  onClose,
  compact = false,
}: TradePanelProps) {
  const [shares, setShares] = useState(1)
  const [modalSide, setModalSide] = useState<'BUY' | 'SELL' | null>(null)

  if (!compact) {
    return (
      <DesktopTradePanel
        availableCash={availableCash}
        creditMargin={creditMargin}
        buyingPower={buyingPower}
        maxLeverage={maxLeverage}
        unrealizedPnL={unrealizedPnL}
        positions={positions}
        shares={shares}
        setShares={setShares}
        onBuy={onBuy}
        onSell={onSell}
        onClose={onClose}
      />
    )
  }

  const handleConfirm = (s: number) => {
    if (modalSide === 'BUY') onBuy(s)
    else onSell(s)
    setModalSide(null)
  }

  return (
    <>
      <MobilePositionSummary positions={positions} />
      <MobileFooterBar
        onBuyTap={() => setModalSide('BUY')}
        onSellTap={() => setModalSide('SELL')}
      />
      {modalSide && (
        <OrderModal
          side={modalSide}
          shares={shares}
          setShares={setShares}
          onConfirm={handleConfirm}
          onCancel={() => setModalSide(null)}
        />
      )}
    </>
  )
}
