import { useEffect, useRef, useState } from 'react'
import { formatCurrency, formatPnlPercent } from '../utils/formatUtils'
import { SLTPForm } from './TradePanel'
import type { Position, SetSLTPFn } from '../types'

function getPnlClass(value: number) {
  if (value > 0) return 'text-profit'
  if (value < 0) return 'text-loss'
  return 'text-text-secondary'
}

function CloseButton({ onClose }: { onClose: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const handleClick = () => {
    if (confirming) {
      if (timerRef.current) clearTimeout(timerRef.current)
      onClose()
      return
    }
    setConfirming(true)
    timerRef.current = setTimeout(() => setConfirming(false), 2000)
  }

  return (
    <button
      className={`py-1.5 px-3 border-none rounded text-xs font-bold cursor-pointer min-h-[32px] transition-colors ${
        confirming
          ? 'bg-loss text-white'
          : 'bg-text-muted text-white'
      }`}
      onClick={handleClick}
    >
      {confirming ? '確定?' : '決済'}
    </button>
  )
}

function CloseAllButton({ onCloseAll }: { onCloseAll: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const handleClick = () => {
    if (confirming) {
      if (timerRef.current) clearTimeout(timerRef.current)
      onCloseAll()
      return
    }
    setConfirming(true)
    timerRef.current = setTimeout(() => setConfirming(false), 2000)
  }

  return (
    <button
      className={`w-full py-3 border-none rounded-lg text-base font-bold cursor-pointer min-h-[44px] transition-colors ${
        confirming
          ? 'bg-loss text-white'
          : 'bg-bg-danger text-loss border border-border-danger'
      }`}
      onClick={handleClick}
    >
      {confirming ? '全決済 確定?' : '全ポジション決済'}
    </button>
  )
}

interface PositionSheetProps {
  positions: Position[]
  currentPrice: number
  onClose: (positionId: string) => void
  onCloseAll: () => void
  onSetSLTP: SetSLTPFn
  onDismiss: () => void
}

export default function PositionSheet({
  positions,
  currentPrice,
  onClose,
  onCloseAll,
  onSetSLTP,
  onDismiss,
}: PositionSheetProps) {
  const prevLengthRef = useRef(positions.length)

  useEffect(() => {
    if (prevLengthRef.current > 0 && positions.length === 0) {
      onDismiss()
    }
    prevLengthRef.current = positions.length
  }, [positions.length, onDismiss])

  const totalPnl = positions.reduce((sum, p) => sum + (p.unrealizedPnL ?? 0), 0)

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[var(--z-overlay)] flex items-end"
      onClick={onDismiss}
    >
      <div
        className="w-full bg-bg-panel rounded-t-2xl py-5 px-4 font-mono text-text-primary max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ドラッグハンドル */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 bg-bg-elevated rounded-full" />
        </div>

        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-bg-elevated">
          <span className="text-sm font-bold">
            保有ポジション ({positions.length})
          </span>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold ${getPnlClass(totalPnl)}`}>
              計 {formatCurrency(totalPnl)}
            </span>
            <span className="text-xs text-text-secondary">
              現在値 {formatCurrency(currentPrice)}
            </span>
          </div>
        </div>

        {/* ポジション一覧 */}
        <div className="overflow-y-auto min-h-0 flex-1 -mx-4 px-4">
          {positions.map((pos) => {
            const cost = pos.entryPrice * pos.shares
            return (
              <div key={pos.id} className="py-3 border-b border-bg-elevated">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${pos.direction === 'LONG' ? 'text-profit' : 'text-loss'}`}>
                      {pos.direction}
                    </span>
                    <span className="text-sm">{pos.shares}株</span>
                    <span className="text-xs text-text-secondary">@{formatCurrency(pos.entryPrice)}</span>
                  </div>
                  <CloseButton onClose={() => onClose(pos.id)} />
                </div>
                <div className="flex justify-between items-center mt-1.5">
                  <span className={`text-sm font-bold ${getPnlClass(pos.unrealizedPnL)}`}>
                    {formatCurrency(pos.unrealizedPnL)} ({formatPnlPercent(pos.unrealizedPnL, cost)})
                  </span>
                  <span className="text-xs text-text-secondary">
                    証拠金 {formatCurrency(pos.margin)}
                  </span>
                </div>
                <SLTPForm position={pos} onSetSLTP={onSetSLTP} />
              </div>
            )
          })}
        </div>

        {/* 全決済ボタン */}
        {positions.length >= 2 && (
          <div className="mt-3 pt-3 border-t border-bg-elevated">
            <CloseAllButton onCloseAll={onCloseAll} />
          </div>
        )}
      </div>
    </div>
  )
}
