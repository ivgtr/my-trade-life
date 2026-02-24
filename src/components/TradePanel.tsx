import { useState } from 'react'
import { formatCurrency, formatPnlPercent } from '../utils/formatUtils'
import type { Position } from '../types'

interface TradePanelProps {
  currentPrice: number
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
  currentPrice: number
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
  currentPrice,
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
  const maxShares = currentPrice > 0 ? Math.floor(buyingPower / currentPrice) : 0

  const orderAmount = shares * currentPrice
  const requiredMargin = maxLeverage > 0 ? shares * currentPrice / maxLeverage : orderAmount
  const remainingCash = availableCash - requiredMargin
  const isInsufficient = requiredMargin > availableCash

  const totalPositionPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnL ?? 0), 0)

  return (
    <div className="bg-bg-panel text-text-primary p-3 font-mono h-full overflow-y-auto overflow-x-hidden">
      {/* 現在価格 */}
      <div className="mb-1.5 pb-1.5 border-b border-bg-elevated">
        <div className="text-[11px] text-text-secondary">現在値</div>
        <div className="text-base font-bold">{formatCurrency(currentPrice)}</div>
      </div>

      {/* 余力・含み損益 */}
      <div className="flex justify-between mb-1 text-sm">
        <span>余力: {formatCurrency(buyingPower)}</span>
        <span className={getPnlClass(unrealizedPnL)}>
          含み: {formatCurrency(unrealizedPnL)}
        </span>
      </div>
      {maxLeverage > 1 && (
        <div className="text-[11px] text-text-secondary mb-2">
          現金{formatCurrency(availableCash)} + 信用{formatCurrency(creditMargin)}
        </div>
      )}
      {maxLeverage <= 1 && <div className="mb-1" />}

      <div className="border-b border-bg-elevated mb-2" />

      {/* 株数入力 */}
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

      {/* クイック調整ボタン */}
      <div className="flex gap-1 mb-2">
        <button className="py-1 px-2.5 bg-bg-elevated text-text-primary border border-bg-button rounded text-xs cursor-pointer" onClick={() => addShares(1)}>+1</button>
        <button className="py-1 px-2.5 bg-bg-elevated text-text-primary border border-bg-button rounded text-xs cursor-pointer" onClick={() => addShares(10)}>+10</button>
        <button className="py-1 px-2.5 bg-bg-elevated text-text-primary border border-bg-button rounded text-xs cursor-pointer" onClick={() => addShares(100)}>+100</button>
        <button className="py-1 px-2.5 bg-accent text-white border border-accent rounded text-xs cursor-pointer" onClick={() => setShares(Math.max(1, maxShares))}>MAX</button>
        <button className="py-1 px-2.5 bg-bg-danger text-loss border border-border-danger rounded text-xs cursor-pointer" onClick={() => setShares(1)}>C</button>
      </div>

      <div className="border-b border-bg-elevated mb-2" />

      {/* 注文プレビュー */}
      <div className="text-xs space-y-0.5 mb-2">
        <div className="flex justify-between">
          <span className="text-text-secondary">概算</span>
          <span>{formatCurrency(orderAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">必要証拠金</span>
          <span>{formatCurrency(requiredMargin)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">注文後余力</span>
          <span className={isInsufficient ? 'text-loss' : 'text-profit'}>
            {isInsufficient ? '不足 ' : ''}{formatCurrency(remainingCash)}
          </span>
        </div>
      </div>

      <div className="border-b border-bg-elevated mb-2" />

      {/* BUY/SELL ボタン */}
      <div className="flex gap-2 mb-3">
        <button
          className="flex-1 p-2.5 bg-profit text-white border-none rounded-md text-base font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onBuy(shares)}
          disabled={isInsufficient}
        >
          BUY
        </button>
        <button
          className="flex-1 p-2.5 bg-loss text-white border-none rounded-md text-base font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onSell(shares)}
          disabled={isInsufficient}
        >
          SELL
        </button>
      </div>

      {/* ポジション一覧 */}
      {positions && positions.length > 0 && (
        <div>
          <div className="flex justify-between text-xs text-text-secondary mb-1.5 border-b border-bg-elevated pb-1">
            <span>保有ポジション({positions.length})</span>
            <span className={getPnlClass(totalPositionPnl)}>計 {formatCurrency(totalPositionPnl)}</span>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {positions.map((pos) => {
              const cost = pos.entryPrice * pos.shares
              return (
                <div key={pos.id} className="py-1.5 border-b border-bg-elevated text-xs">
                  <div className="flex justify-between items-center">
                    <span className={pos.direction === 'LONG' ? 'text-profit' : 'text-loss'}>
                      {pos.direction}
                    </span>
                    <span>{pos.shares}株</span>
                    <span>{formatCurrency(pos.entryPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className={getPnlClass(pos.unrealizedPnL)}>
                      {formatCurrency(pos.unrealizedPnL)}({formatPnlPercent(pos.unrealizedPnL, cost)})
                    </span>
                    <span className="text-text-secondary text-[11px]">証拠金{formatCurrency(pos.margin)}</span>
                    <button
                      className="py-1 px-2 bg-text-muted text-white border-none rounded text-[11px] cursor-pointer"
                      onClick={() => onClose(pos.id)}
                    >
                      決済
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface MobilePositionSummaryProps {
  currentPrice: number
  positions: Position[]
}

function MobilePositionSummary({ currentPrice, positions }: MobilePositionSummaryProps) {
  if (!positions || positions.length === 0) {
    return (
      <div className="flex items-center py-1.5 px-3 bg-bg-panel border-t border-bg-elevated text-xs font-mono text-text-primary shrink-0">
        <span className="font-bold">{formatCurrency(currentPrice)}</span>
      </div>
    )
  }

  const totalPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnL ?? 0), 0)
  const totalShares = positions.reduce((sum, p) => sum + p.shares, 0)
  const totalCost = positions.reduce((sum, p) => sum + p.entryPrice * p.shares, 0)
  const direction = positions[0]?.direction ?? ''

  return (
    <div className="flex justify-between items-center py-1.5 px-3 bg-bg-panel border-t border-bg-elevated text-xs font-mono text-text-primary shrink-0">
      <span className="font-bold">{formatCurrency(currentPrice)}</span>
      <span>
        <span className={direction === 'LONG' ? 'text-profit' : 'text-loss'}>
          {direction}
        </span>{' '}
        {totalShares}株{' '}
        <span className={getPnlClass(totalPnl)}>
          {formatCurrency(totalPnl)}({formatPnlPercent(totalPnl, totalCost)})
        </span>
      </span>
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
  currentPrice: number
  buyingPower: number
  availableCash: number
  maxLeverage: number
  shares: number
  setShares: React.Dispatch<React.SetStateAction<number>>
  onConfirm: (shares: number) => void
  onCancel: () => void
}

function OrderModal({
  side,
  currentPrice,
  buyingPower,
  availableCash,
  maxLeverage,
  shares,
  setShares,
  onConfirm,
  onCancel,
}: OrderModalProps) {
  const isBuy = side === 'BUY'
  const label = isBuy ? '買い注文' : '売り注文'

  const addShares = (amount: number) => setShares((prev) => Math.max(1, prev + amount))
  const maxShares = currentPrice > 0 ? Math.floor(buyingPower / currentPrice) : 0

  const orderAmount = shares * currentPrice
  const requiredMargin = maxLeverage > 0 ? shares * currentPrice / maxLeverage : orderAmount
  const remainingCash = availableCash - requiredMargin
  const isInsufficient = requiredMargin > availableCash

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[var(--z-overlay)] flex items-end"
      onClick={onCancel}
    >
      <div
        className="w-full bg-bg-panel rounded-t-2xl py-5 px-4 font-mono text-text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <span className={`text-base font-bold ${isBuy ? 'text-profit' : 'text-loss'}`}>{label}</span>
          <span className="text-sm">現在値 <span className="font-bold">{formatCurrency(currentPrice)}</span></span>
        </div>

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
          <button className="flex-1 py-2.5 bg-accent text-white border border-accent rounded-md text-sm cursor-pointer min-h-11" onClick={() => setShares(Math.max(1, maxShares))}>MAX</button>
          <button className="flex-1 py-2.5 bg-bg-danger text-loss border border-border-danger rounded-md text-sm cursor-pointer min-h-11" onClick={() => setShares(1)}>C</button>
        </div>

        {/* 注文プレビュー */}
        <div className="border-t border-bg-elevated pt-3 mb-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-text-secondary">概算額</span>
            <span>{formatCurrency(orderAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">必要証拠金</span>
            <span>{formatCurrency(requiredMargin)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">注文後余力</span>
            <span className={isInsufficient ? 'text-loss' : 'text-profit'}>
              {isInsufficient ? '不足 ' : ''}{formatCurrency(remainingCash)}
            </span>
          </div>
        </div>

        <button
          className={`w-full py-3.5 text-white border-none rounded-lg text-lg font-bold cursor-pointer min-h-12 mt-2 disabled:opacity-40 disabled:cursor-not-allowed ${
            isBuy ? 'bg-profit' : 'bg-loss'
          }`}
          onClick={() => onConfirm(shares)}
          disabled={isInsufficient}
        >
          注文確定 ({side})
        </button>
      </div>
    </div>
  )
}

export default function TradePanel({
  currentPrice,
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
        currentPrice={currentPrice}
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
      <MobilePositionSummary currentPrice={currentPrice} positions={positions} />
      <MobileFooterBar
        onBuyTap={() => setModalSide('BUY')}
        onSellTap={() => setModalSide('SELL')}
      />
      {modalSide && (
        <OrderModal
          side={modalSide}
          currentPrice={currentPrice}
          buyingPower={buyingPower}
          availableCash={availableCash}
          maxLeverage={maxLeverage}
          shares={shares}
          setShares={setShares}
          onConfirm={handleConfirm}
          onCancel={() => setModalSide(null)}
        />
      )}
    </>
  )
}
