import { useState } from 'react'
import { formatCurrency, formatPnlPercent } from '../utils/formatUtils'
import { MIN_PRICE } from '../engine/priceGrid'
import type { Direction, Position, SetSLTPFn } from '../types'

interface TradePanelProps {
  currentPrice: number
  availableCash: number
  creditMargin: number
  buyingPower: number
  maxLeverage: number
  positions: Position[]
  onEntry: (direction: Direction, shares: number) => void
  onClose: (positionId: string) => void
  onCloseAll: () => void
  onSetSLTP: SetSLTPFn
  compact?: boolean
}

function getPnlClass(value: number) {
  if (value > 0) return 'text-profit'
  if (value < 0) return 'text-loss'
  return 'text-text-secondary'
}

interface SLTPFormProps {
  position: Position
  onSetSLTP: SetSLTPFn
}

function SLTPForm({ position, onSetSLTP }: SLTPFormProps) {
  const [expanded, setExpanded] = useState(false)
  const [slInput, setSlInput] = useState(position.stopLoss?.toString() ?? '')
  const [tpInput, setTpInput] = useState(position.takeProfit?.toString() ?? '')

  const [engineError, setEngineError] = useState('')

  const hasSLTP = position.stopLoss != null || position.takeProfit != null

  const validate = (): { sl?: number; tp?: number; error?: string } => {
    const sl = slInput.trim() ? Number(slInput) : undefined
    const tp = tpInput.trim() ? Number(tpInput) : undefined

    if (sl != null && (isNaN(sl) || sl < MIN_PRICE)) return { error: 'SL値が不正です' }
    if (tp != null && (isNaN(tp) || tp < MIN_PRICE)) return { error: 'TP値が不正です' }

    if (position.direction === 'LONG') {
      if (sl != null && sl >= position.entryPrice) return { error: 'SLはエントリー価格より下' }
      if (tp != null && tp <= position.entryPrice) return { error: 'TPはエントリー価格より上' }
    } else {
      if (sl != null && sl <= position.entryPrice) return { error: 'SLはエントリー価格より上' }
      if (tp != null && tp <= 0) return { error: 'TP値が不正です' }
      if (tp != null && tp >= position.entryPrice) return { error: 'TPはエントリー価格より下' }
    }

    return { sl, tp }
  }

  const handleSet = () => {
    setEngineError('')
    const { sl, tp, error } = validate()
    if (error) return
    if (sl == null && tp == null) return
    const ok = onSetSLTP(position.id, sl, tp)
    if (!ok) {
      setEngineError('呼値に丸めた結果、設定できません')
      return
    }
    setExpanded(false)
  }

  const handleClear = () => {
    onSetSLTP(position.id, undefined, undefined)
    setSlInput('')
    setTpInput('')
    setExpanded(false)
  }

  const { error } = validate()
  const canSet = !error && (slInput.trim() || tpInput.trim())

  if (!expanded) {
    return (
      <div className="flex items-center gap-1.5 mt-0.5">
        {hasSLTP ? (
          <>
            {position.stopLoss != null && (
              <span className="text-[10px] text-loss">SL:{formatCurrency(position.stopLoss)}</span>
            )}
            {position.takeProfit != null && (
              <span className="text-[10px] text-profit">TP:{formatCurrency(position.takeProfit)}</span>
            )}
            <button
              className="ml-auto py-0.5 px-1.5 bg-bg-elevated text-text-secondary border border-bg-button rounded text-[10px] cursor-pointer"
              onClick={() => setExpanded(true)}
            >
              編集
            </button>
          </>
        ) : (
          <button
            className="py-0.5 px-1.5 bg-bg-elevated text-text-secondary border border-bg-button rounded text-[10px] cursor-pointer"
            onClick={() => setExpanded(true)}
          >
            SL/TP設定
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="mt-1 p-1.5 bg-bg-elevated rounded space-y-1">
      <div className="flex gap-1 items-center">
        <span className="text-[10px] text-loss min-w-[18px]">SL</span>
        <input
          type="number"
          value={slInput}
          onChange={(e) => setSlInput(e.target.value)}
          placeholder={position.direction === 'LONG' ? `< ${position.entryPrice}` : `> ${position.entryPrice}`}
          className="bg-bg-deepest text-text-primary border border-bg-button rounded py-0.5 px-1.5 text-[11px] w-24 text-right"
        />
        <span className="text-[10px] text-profit min-w-[18px]">TP</span>
        <input
          type="number"
          value={tpInput}
          onChange={(e) => setTpInput(e.target.value)}
          placeholder={position.direction === 'LONG' ? `> ${position.entryPrice}` : `< ${position.entryPrice}`}
          className="bg-bg-deepest text-text-primary border border-bg-button rounded py-0.5 px-1.5 text-[11px] w-24 text-right"
        />
      </div>
      {error && <div className="text-[10px] text-loss">{error}</div>}
      {engineError && <div className="text-[10px] text-loss">{engineError}</div>}
      <div className="flex gap-1">
        <button
          className="py-0.5 px-2 bg-accent text-white border-none rounded text-[10px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleSet}
          disabled={!canSet}
        >
          設定
        </button>
        {hasSLTP && (
          <button
            className="py-0.5 px-2 bg-bg-danger text-loss border border-border-danger rounded text-[10px] cursor-pointer"
            onClick={handleClear}
          >
            解除
          </button>
        )}
        <button
          className="py-0.5 px-2 bg-bg-elevated text-text-secondary border border-bg-button rounded text-[10px] cursor-pointer"
          onClick={() => setExpanded(false)}
        >
          閉じる
        </button>
      </div>
    </div>
  )
}

interface DesktopTradePanelProps {
  currentPrice: number
  availableCash: number
  creditMargin: number
  buyingPower: number
  maxLeverage: number
  positions: Position[]
  shares: number
  setShares: React.Dispatch<React.SetStateAction<number>>
  onEntry: (direction: Direction, shares: number) => void
  onClose: (positionId: string) => void
  onCloseAll: () => void
  onSetSLTP: SetSLTPFn
}

function DesktopTradePanel({
  currentPrice,
  availableCash,
  creditMargin,
  buyingPower,
  maxLeverage,
  positions,
  shares,
  setShares,
  onEntry,
  onClose,
  onCloseAll,
  onSetSLTP,
}: DesktopTradePanelProps) {
  const addShares = (amount: number) => setShares((prev) => Math.max(1, prev + amount))
  const maxShares = currentPrice > 0 ? Math.floor(buyingPower / currentPrice) : 0

  const orderAmount = shares * currentPrice
  const requiredMargin = maxLeverage > 0 ? shares * currentPrice / maxLeverage : orderAmount
  const remainingCash = availableCash - requiredMargin
  const isInsufficient = requiredMargin > availableCash

  const totalPositionPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnL ?? 0), 0)

  return (
    <div className="bg-bg-panel text-text-primary p-3 font-mono h-full flex flex-col overflow-hidden">
      {/* 現在価格 */}
      <div className="mb-1.5 pb-1.5 border-b border-bg-elevated">
        <div className="text-[11px] text-text-secondary">現在値</div>
        <div className="text-base font-bold">{formatCurrency(currentPrice)}</div>
      </div>

      {/* 余力 */}
      <div className="mb-1 text-sm">
        <span>余力: {formatCurrency(buyingPower)}</span>
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

      {/* LONG/SHORT ボタン */}
      <div className="flex gap-2 mb-3">
        <button
          className="flex-1 p-2.5 bg-profit text-white border-none rounded-md text-base font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onEntry('LONG', shares)}
          disabled={isInsufficient}
        >
          LONG
        </button>
        <button
          className="flex-1 p-2.5 bg-loss text-white border-none rounded-md text-base font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={() => onEntry('SHORT', shares)}
          disabled={isInsufficient}
        >
          SHORT
        </button>
      </div>

      {/* ポジション一覧 */}
      {positions && positions.length > 0 && (
        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex justify-between items-center text-xs text-text-secondary mb-1.5 border-b border-bg-elevated pb-1 shrink-0">
            <span>保有ポジション({positions.length})</span>
            <div className="flex items-center gap-2">
              <span className={getPnlClass(totalPositionPnl)}>計 {formatCurrency(totalPositionPnl)}</span>
              {positions.length > 1 && (
                <button
                  className="py-0.5 px-2 bg-bg-danger text-loss border border-border-danger rounded text-[11px] cursor-pointer"
                  onClick={onCloseAll}
                >
                  全決済
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto min-h-0">
            {positions.map((pos) => {
              const cost = pos.entryPrice * pos.shares
              return (
                <div key={pos.id} className="py-1.5 pr-2 border-b border-bg-elevated text-xs">
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
                  <SLTPForm position={pos} onSetSLTP={onSetSLTP} />
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

  const slCount = positions.filter((p) => p.stopLoss != null).length
  const tpCount = positions.filter((p) => p.takeProfit != null).length

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
        {(slCount > 0 || tpCount > 0) && (
          <span className="ml-1 text-[10px] text-text-secondary">
            {slCount > 0 && <span className="text-loss">SL</span>}
            {slCount > 0 && tpCount > 0 && '/'}
            {tpCount > 0 && <span className="text-profit">TP</span>}
          </span>
        )}
      </span>
    </div>
  )
}

function MobileFooterBar({ onTap }: { onTap: (direction: Direction) => void }) {
  return (
    <div className="flex gap-2 py-2 px-3 bg-bg-panel border-t border-bg-elevated shrink-0 h-14 items-center font-mono">
      <button
        className="flex-1 p-0 text-white border-none rounded-md text-base font-bold cursor-pointer min-h-11 bg-profit"
        onClick={() => onTap('LONG')}
      >
        LONG
      </button>
      <button
        className="flex-1 p-0 text-white border-none rounded-md text-base font-bold cursor-pointer min-h-11 bg-loss"
        onClick={() => onTap('SHORT')}
      >
        SHORT
      </button>
    </div>
  )
}

interface OrderModalProps {
  direction: Direction
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
  direction,
  currentPrice,
  buyingPower,
  availableCash,
  maxLeverage,
  shares,
  setShares,
  onConfirm,
  onCancel,
}: OrderModalProps) {
  const isLong = direction === 'LONG'
  const label = isLong ? 'ロング注文' : 'ショート注文'

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
          <span className={`text-base font-bold ${isLong ? 'text-profit' : 'text-loss'}`}>{label}</span>
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
            isLong ? 'bg-profit' : 'bg-loss'
          }`}
          onClick={() => onConfirm(shares)}
          disabled={isInsufficient}
        >
          注文確定 ({direction})
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
  positions,
  onEntry,
  onClose,
  onCloseAll,
  onSetSLTP,
  compact = false,
}: TradePanelProps) {
  const [shares, setShares] = useState(1)
  const [modalDirection, setModalDirection] = useState<Direction | null>(null)

  if (!compact) {
    return (
      <DesktopTradePanel
        currentPrice={currentPrice}
        availableCash={availableCash}
        creditMargin={creditMargin}
        buyingPower={buyingPower}
        maxLeverage={maxLeverage}
        positions={positions}
        shares={shares}
        setShares={setShares}
        onEntry={onEntry}
        onClose={onClose}
        onCloseAll={onCloseAll}
        onSetSLTP={onSetSLTP}
      />
    )
  }

  const handleConfirm = (s: number) => {
    if (modalDirection) onEntry(modalDirection, s)
    setModalDirection(null)
  }

  return (
    <>
      <MobilePositionSummary currentPrice={currentPrice} positions={positions} />
      <MobileFooterBar onTap={setModalDirection} />
      {modalDirection && (
        <OrderModal
          direction={modalDirection}
          currentPrice={currentPrice}
          buyingPower={buyingPower}
          availableCash={availableCash}
          maxLeverage={maxLeverage}
          shares={shares}
          setShares={setShares}
          onConfirm={handleConfirm}
          onCancel={() => setModalDirection(null)}
        />
      )}
    </>
  )
}
