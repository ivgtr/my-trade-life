import { useRef, useState, useCallback, useMemo } from 'react'
import { useGameContext } from '../hooks/useGameContext'
import { useSessionEngine } from '../hooks/useSessionEngine'
import { useMAOverlay } from '../hooks/useMAOverlay'
import { useResponsive } from '../hooks/useMediaQuery'
import Chart from '../components/Chart'
import ChartControls from '../components/ChartControls'
import TradePanel from '../components/TradePanel'
import TickerTape from '../components/TickerTape'
import NewsOverlay from '../components/NewsOverlay'
import SessionCalendarPopup from '../components/SessionCalendarPopup'
import { ConfigManager } from '../systems/ConfigManager'
import { ACTIONS } from '../state/actions'
import { formatCurrency, parseLocalDate, formatDateShort } from '../utils/formatUtils'
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
  const [timeframe, setTimeframe] = useState<Timeframe>(gameState.timeframe ?? 1)
  const [maVisible, setMAVisible] = useState(() => {
    const config = ConfigManager.getAll()
    return config.maVisible ?? false
  })
  const [showCalendar, setShowCalendar] = useState(false)

  const currentDate = useMemo(
    () => gameState.currentDate ? parseLocalDate(gameState.currentDate) : new Date(),
    [gameState.currentDate],
  )

  const { handleTick } = useMAOverlay({
    chartRef,
    getTickHistory: () => getTickHistory(),
    timeframe,
    maVisible,
  })

  const {
    ticks,
    gameTime,
    activeNews,
    speed,
    isLunchBreak,
    handleEntry,
    handleClose,
    handleCloseAll,
    handleSetSLTP,
    handleSpeedChange,
    handleNewsComplete,
    getTickHistory,
  } = useSessionEngine({ gameState, dispatch, chartRef, onEndSession, onTickCallback: handleTick })

  const unrealizedPnL = gameState.unrealizedPnL ?? 0
  const positions = gameState.positions ?? []
  const maxLeverage = gameState.maxLeverage ?? 1
  const availableCash = gameState.availableCash ?? gameState.balance
  const creditMargin = gameState.creditMargin ?? availableCash * (maxLeverage - 1)
  const buyingPower = gameState.buyingPower ?? availableCash * maxLeverage
  const currentPrice = gameState.currentPrice ?? 0

  const handleTimeframeChange = useCallback((tf: Timeframe) => {
    setTimeframe(tf)
    dispatch({ type: ACTIONS.SET_TIMEFRAME, payload: { timeframe: tf } })
    chartRef.current?.setTimeframe(tf, getTickHistory())
  }, [dispatch, getTickHistory])

  const handleMAToggle = useCallback((visible: boolean) => {
    setMAVisible(visible)
    ConfigManager.set('maVisible', visible)
  }, [])

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

  const pnlDisplay = (
    <span>
      損益:{' '}
      <span className={unrealizedPnL >= 0 ? 'text-profit' : 'text-loss'}>
        {unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(unrealizedPnL)}
      </span>
    </span>
  )

  const dateButton = (
    <button
      className="text-text-secondary text-sm border-none bg-transparent cursor-pointer font-mono border-b border-dashed border-text-secondary"
      onClick={() => setShowCalendar(true)}
    >
      {formatDateShort(currentDate)}
    </button>
  )

  const calendarPopup = showCalendar && (
    <SessionCalendarPopup
      currentDate={currentDate}
      balance={gameState.balance}
      dailyHistory={gameState.dailyHistory}
      sessionPnL={gameState.sessionPnL}
      sessionTrades={gameState.sessionTrades}
      sessionWins={gameState.sessionWins}
      onClose={() => setShowCalendar(false)}
    />
  )

  const lunchOverlay = isLunchBreak && (
    <div className="fixed inset-0 z-[var(--z-news)] flex items-center justify-center bg-black/60 pointer-events-none">
      <div className="bg-bg-panel border border-bg-elevated rounded-lg px-8 py-6 text-center">
        <p className="text-lg font-bold text-text-primary">昼休み</p>
        <p className="text-sm text-text-secondary mt-2">11:30 - 12:30</p>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <div className="flex flex-col h-dvh overflow-hidden bg-bg-deepest text-text-primary font-mono">
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

        <div className="flex-1 min-h-0 overflow-hidden relative">
          {mobileTab === 'chart' ? (
            <>
              <Chart ref={chartRef} autoSize timeframe={timeframe} />
              <ChartControls
                layout="leftMenu"
                timeframe={timeframe}
                onTimeframeChange={handleTimeframeChange}
                maVisible={maVisible}
                onMAToggle={handleMAToggle}
              />
            </>
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
          positions={positions}
          onEntry={handleEntry}
          onClose={handleClose}
          onCloseAll={handleCloseAll}
          onSetSLTP={handleSetSLTP}
          compact
        />

        <NewsOverlay newsEvent={activeNews} onComplete={handleNewsComplete} />
        {lunchOverlay}
        {calendarPopup}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-bg-deepest text-text-primary font-mono">
      <div className="flex justify-between items-center px-4 py-2 bg-bg-panel border-b border-bg-elevated text-sm shrink-0">
        <div className="flex items-center gap-2">
          {dateButton}
          <span className="text-lg font-bold">{gameTime}</span>
        </div>
        <span>余力: {formatCurrency(buyingPower)}</span>
        {pnlDisplay}
        {speedButtons}
      </div>

      <div className="flex flex-row flex-1 overflow-hidden min-h-0">
        <div className="w-45 shrink-0 overflow-y-auto overflow-x-hidden border-r border-bg-elevated">
          <TickerTape ticks={ticks} maxDisplay={50} />
        </div>

        <div className="flex-1 min-w-0 min-h-0 overflow-hidden flex flex-col">
          <div className="flex items-center px-2 py-1 bg-bg-panel border-b border-bg-elevated shrink-0">
            <ChartControls
              layout="header"
              timeframe={timeframe}
              onTimeframeChange={handleTimeframeChange}
              maVisible={maVisible}
              onMAToggle={handleMAToggle}
            />
          </div>
          <div className="flex-1 min-h-0">
            <Chart ref={chartRef} autoSize timeframe={timeframe} />
          </div>
        </div>

        <div className="w-75 shrink-0 overflow-y-auto overflow-x-hidden border-l border-bg-elevated">
          <TradePanel
            currentPrice={currentPrice}
            availableCash={availableCash}
            creditMargin={creditMargin}
            buyingPower={buyingPower}
            maxLeverage={maxLeverage}
            positions={positions}
            onEntry={handleEntry}
            onClose={handleClose}
            onCloseAll={handleCloseAll}
            onSetSLTP={handleSetSLTP}
          />
        </div>
      </div>

      <NewsOverlay newsEvent={activeNews} onComplete={handleNewsComplete} />
      {lunchOverlay}
      {calendarPopup}
    </div>
  )
}
