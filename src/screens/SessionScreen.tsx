import { useRef, useState, useCallback } from 'react'
import { useGameContext } from '../hooks/useGameContext'
import { useSessionEngine } from '../hooks/useSessionEngine'
import { useResponsive } from '../hooks/useMediaQuery'
import Chart from '../components/Chart'
import TradePanel from '../components/TradePanel'
import TickerTape from '../components/TickerTape'
import NewsOverlay from '../components/NewsOverlay'
import { formatCurrency } from '../utils/formatUtils'
import type { ChartHandle } from '../components/Chart'
import type { Timeframe } from '../types'

interface SessionScreenProps {
  onEndSession?: (data: { results: unknown; summary: unknown }) => void
}

export default function SessionScreen({ onEndSession }: SessionScreenProps) {
  const { gameState, dispatch } = useGameContext()
  const { isMobile } = useResponsive()
  const chartRef = useRef<ChartHandle | null>(null)
  const [mobileTab, setMobileTab] = useState('chart')
  const [timeframe, setTimeframe] = useState<Timeframe>(1)

  const {
    ticks,
    gameTime,
    activeNews,
    speed,
    handleBuy,
    handleSell,
    handleClose,
    handleSpeedChange,
    handleNewsComplete,
    getTickHistory,
  } = useSessionEngine({ gameState, dispatch, chartRef, onEndSession })

  const unrealizedPnL = gameState.unrealizedPnL ?? 0
  const positions = gameState.positions ?? []
  const maxLeverage = gameState.maxLeverage ?? 1
  const availableCash = gameState.availableCash ?? gameState.balance
  const creditMargin = gameState.creditMargin ?? availableCash * (maxLeverage - 1)
  const buyingPower = gameState.buyingPower ?? availableCash * maxLeverage
  const currentPrice = gameState.currentPrice ?? 0

  const totalMargin = positions.reduce((sum, p) => sum + (p.margin ?? 0), 0)
  const effectiveBalance = availableCash + unrealizedPnL + totalMargin

  const handleTimeframeChange = useCallback((tf: Timeframe) => {
    setTimeframe(tf)
    chartRef.current?.setTimeframe(tf, getTickHistory())
  }, [getTickHistory])

  const timeframeButtons = (
    <div className="flex gap-1">
      {([1, 5, 15] as const).map((tf) => (
        <button
          key={tf}
          className={`sm:py-1.5 sm:px-3 py-1 px-2 border-none rounded cursor-pointer font-mono sm:text-[13px] text-xs ${
            timeframe === tf ? 'bg-accent text-white' : 'bg-bg-button text-text-primary'
          }`}
          onClick={() => handleTimeframeChange(tf)}
        >
          {tf}分
        </button>
      ))}
    </div>
  )

  const speedButtons = (
    <div className="flex gap-1">
      <button
        className={`sm:py-1.5 sm:px-3 py-1 px-2 border-none rounded cursor-pointer font-mono sm:text-[13px] text-xs ${
          speed === 1 ? 'bg-accent text-white' : 'bg-bg-button text-text-primary'
        }`}
        onClick={() => handleSpeedChange(1)}
      >
        1x
      </button>
      <button
        className={`sm:py-1.5 sm:px-3 py-1 px-2 border-none rounded cursor-pointer font-mono sm:text-[13px] text-xs ${
          speed === 2 ? 'bg-accent text-white' : 'bg-bg-button text-text-primary'
        }`}
        onClick={() => handleSpeedChange(2)}
      >
        2x
      </button>
    </div>
  )

  const effectiveBalanceDisplay = (
    <span>
      有効{' '}
      {formatCurrency(effectiveBalance)}
      (<span className={unrealizedPnL >= 0 ? 'text-profit' : 'text-loss'}>
        {unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(unrealizedPnL)}
      </span>)
    </span>
  )

  if (isMobile) {
    return (
      <div className="flex flex-col h-dvh overflow-hidden bg-bg-deepest text-text-primary font-mono">
        <div className="flex justify-between items-center px-2.5 py-1.5 bg-bg-panel border-b border-bg-elevated text-xs shrink-0 flex-wrap gap-1">
          <div className="flex justify-between items-center w-full">
            <span className="text-base font-bold">{gameTime}</span>
            <div className="flex gap-2">
              {timeframeButtons}
              {speedButtons}
            </div>
          </div>
          <div className="flex justify-between items-center w-full text-xs">
            <span>余力: {formatCurrency(buyingPower)}</span>
            {effectiveBalanceDisplay}
          </div>
        </div>

        <div className="flex shrink-0 h-9 bg-bg-panel border-b border-bg-elevated">
          <button
            className={`flex-1 flex items-center justify-center text-[13px] cursor-pointer border-none bg-transparent font-mono ${
              mobileTab === 'chart'
                ? 'text-text-primary border-b-2 border-b-accent'
                : 'text-text-secondary'
            }`}
            onClick={() => setMobileTab('chart')}
          >
            チャート
          </button>
          <button
            className={`flex-1 flex items-center justify-center text-[13px] cursor-pointer border-none bg-transparent font-mono ${
              mobileTab === 'ticker'
                ? 'text-text-primary border-b-2 border-b-accent'
                : 'text-text-secondary'
            }`}
            onClick={() => setMobileTab('ticker')}
          >
            歩み値
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {mobileTab === 'chart' ? (
            <Chart ref={chartRef} autoSize />
          ) : (
            <TickerTape ticks={ticks} maxDisplay={50} compact />
          )}
        </div>

        <TradePanel
          currentPrice={currentPrice}
          availableCash={availableCash}
          creditMargin={creditMargin}
          buyingPower={buyingPower}
          maxLeverage={maxLeverage}
          unrealizedPnL={unrealizedPnL}
          positions={positions}
          onBuy={handleBuy}
          onSell={handleSell}
          onClose={handleClose}
          compact
        />

        <NewsOverlay newsEvent={activeNews} onComplete={handleNewsComplete} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-bg-deepest text-text-primary font-mono">
      <div className="flex justify-between items-center px-4 py-2 bg-bg-panel border-b border-bg-elevated text-sm shrink-0">
        <span className="text-lg font-bold">{gameTime}</span>
        <span>余力: {formatCurrency(buyingPower)}</span>
        {effectiveBalanceDisplay}
        <div className="flex gap-2">
          {timeframeButtons}
          {speedButtons}
        </div>
      </div>

      <div className="flex flex-row flex-1 overflow-hidden min-h-0">
        <div className="w-45 shrink-0 overflow-y-auto overflow-x-hidden border-r border-bg-elevated">
          <TickerTape ticks={ticks} maxDisplay={50} />
        </div>

        <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
          <Chart ref={chartRef} autoSize />
        </div>

        <div className="w-75 shrink-0 overflow-y-auto overflow-x-hidden border-l border-bg-elevated">
          <TradePanel
            currentPrice={currentPrice}
            availableCash={availableCash}
            creditMargin={creditMargin}
            buyingPower={buyingPower}
            maxLeverage={maxLeverage}
            unrealizedPnL={unrealizedPnL}
            positions={positions}
            onBuy={handleBuy}
            onSell={handleSell}
            onClose={handleClose}
          />
        </div>
      </div>

      <NewsOverlay newsEvent={activeNews} onComplete={handleNewsComplete} />
    </div>
  )
}
