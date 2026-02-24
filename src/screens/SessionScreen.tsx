import { useRef, useState, useEffect, useCallback } from 'react'
import { useGameContext } from '../state/GameContext'
import { ACTIONS } from '../state/actions'
import { MarketEngine } from '../engine/MarketEngine'
import { TradingEngine } from '../engine/TradingEngine'
import { NewsSystem } from '../engine/NewsSystem'
import { AudioSystem } from '../systems/AudioSystem'
import { useResponsive } from '../hooks/useMediaQuery'
import Chart from '../components/Chart'
import TradePanel from '../components/TradePanel'
import TickerTape from '../components/TickerTape'
import NewsOverlay from '../components/NewsOverlay'
import { formatCurrency } from '../utils/formatUtils'
import type { NewsEvent } from '../types/news'

interface SessionScreenProps {
  onEndSession?: (data: { results: unknown; summary: unknown }) => void
}

export default function SessionScreen({ onEndSession }: SessionScreenProps) {
  const { gameState, dispatch } = useGameContext()
  const { isMobile } = useResponsive()
  const chartRef = useRef<any>(null)
  const marketEngineRef = useRef<any>(null)
  const tradingEngineRef = useRef<any>(null)
  const newsSystemRef = useRef<any>(null)
  const [ticks, setTicks] = useState<any[]>([])
  const [gameTime, setGameTime] = useState('09:00')
  const [activeNews, setActiveNews] = useState<NewsEvent | null>(null)
  const [speed, setSpeed] = useState(gameState.speed ?? 1)
  const [mobileTab, setMobileTab] = useState('chart')

  useEffect(() => {
    const regimeParams = gameState.regimeParams ?? { drift: 0, volMult: 1.0, regime: 'range' as const }
    const anomalyParams = gameState.anomalyParams ?? { driftBias: 0, volBias: 1.0, tendency: '' }
    const openPrice = gameState.currentPrice ?? 30000

    const newsSystem = new NewsSystem({
      currentRegime: regimeParams.regime ?? 'range',
      onNewsTriggered: (event) => {
        setActiveNews(event)
        const force = newsSystem.getExternalForce(event)
        if (marketEngineRef.current) {
          marketEngineRef.current.injectExternalForce(force)
        }
      },
    })
    newsSystem.scheduleSessionEvents(180000)
    newsSystemRef.current = newsSystem

    const tradingEngine = new TradingEngine({
      balance: gameState.balance,
      maxLeverage: gameState.maxLeverage ?? 1,
    })
    tradingEngineRef.current = tradingEngine

    const marketEngine = new MarketEngine({
      openPrice,
      regimeParams,
      anomalyParams,
      speed,
      onTick: (tickData) => {
        chartRef.current?.updateTick(tickData)
        setTicks((prev) => [...prev.slice(-99), tickData])

        const time = marketEngineRef.current?.getCurrentTime()
        if (time) setGameTime(time.formatted)

        const { total: unrealizedPnL } = tradingEngine.recalculateUnrealized(tickData.price)

        dispatch({
          type: ACTIONS.TICK_UPDATE,
          payload: {
            currentPrice: tickData.price,
            unrealizedPnL,
            positions: tradingEngine.getPositions(),
          },
        })

        newsSystem.checkTriggers(tickData.timestamp)
      },
      onSessionEnd: () => {
        const results = tradingEngine.forceCloseAll(marketEngine.getCurrentTime().totalMinutes)
        const summary = tradingEngine.getDailySummary()

        if (onEndSession) {
          onEndSession({ results, summary })
        } else {
          dispatch({
            type: ACTIONS.END_SESSION,
            payload: { results, summary },
          })
          dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'report' } })
        }
      },
    })
    marketEngineRef.current = marketEngine
    marketEngine.start()

    dispatch({ type: ACTIONS.START_SESSION })

    return () => {
      marketEngine.stop()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBuy = useCallback((shares: number, leverage: number) => {
    const te = tradingEngineRef.current
    if (!te) return
    const pos = te.openPosition('LONG', shares, gameState.currentPrice, leverage)
    if (pos) {
      dispatch({ type: ACTIONS.OPEN_POSITION, payload: { position: pos } })
      AudioSystem.playSE('entry')
    }
  }, [gameState.currentPrice, dispatch])

  const handleSell = useCallback((shares: number, leverage: number) => {
    const te = tradingEngineRef.current
    if (!te) return
    const pos = te.openPosition('SHORT', shares, gameState.currentPrice, leverage)
    if (pos) {
      dispatch({ type: ACTIONS.OPEN_POSITION, payload: { position: pos } })
      AudioSystem.playSE('entry')
    }
  }, [gameState.currentPrice, dispatch])

  const handleClose = useCallback((positionId: string) => {
    const te = tradingEngineRef.current
    if (!te) return
    const result = te.closePosition(positionId, gameState.currentPrice)
    if (result) {
      dispatch({ type: ACTIONS.CLOSE_POSITION, payload: result })
      AudioSystem.playSE(result.pnl >= 0 ? 'profit' : 'loss')
    }
  }, [gameState.currentPrice, dispatch])

  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed)
    marketEngineRef.current?.setSpeed(newSpeed)
    dispatch({ type: ACTIONS.SET_SPEED, payload: { speed: newSpeed } })
  }

  const handleNewsComplete = useCallback(() => {
    setActiveNews(null)
  }, [])

  const unrealizedPnL = gameState.unrealizedPnL ?? 0
  const positions = gameState.positions ?? []
  const leverageOptions = [1, 2, 3, 3.3].filter((l) => l <= (gameState.maxLeverage ?? 1))

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

  if (isMobile) {
    return (
      <div className="flex flex-col h-dvh overflow-hidden bg-bg-deepest text-text-primary font-mono">
        <div className="flex justify-between items-center px-2.5 py-1.5 bg-bg-panel border-b border-bg-elevated text-xs shrink-0 flex-wrap gap-1">
          <div className="flex justify-between items-center w-full">
            <span className="text-base font-bold">{gameTime}</span>
            {speedButtons}
          </div>
          <div className="flex justify-between items-center w-full text-xs">
            <span>残高: {formatCurrency(gameState.balance)}</span>
            <span className={unrealizedPnL >= 0 ? 'text-profit' : 'text-loss'}>
              含み: {formatCurrency(unrealizedPnL)}
            </span>
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
          balance={gameState.balance}
          unrealizedPnL={unrealizedPnL}
          positions={positions}
          maxLeverage={gameState.maxLeverage ?? 1}
          unlockedLeverages={leverageOptions}
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
        <span>残高: {formatCurrency(gameState.balance)}</span>
        <span className={unrealizedPnL >= 0 ? 'text-profit' : 'text-loss'}>
          含み: {formatCurrency(unrealizedPnL)}
        </span>
        {speedButtons}
      </div>

      <div className="flex flex-row flex-1 overflow-hidden min-h-0">
        <div className="w-[180px] shrink-0 overflow-y-auto overflow-x-hidden border-r border-bg-elevated">
          <TickerTape ticks={ticks} maxDisplay={50} />
        </div>

        <div className="flex-1 min-w-0 min-h-0 overflow-hidden">
          <Chart ref={chartRef} autoSize />
        </div>

        <div className="w-[300px] shrink-0 overflow-y-auto overflow-x-hidden border-l border-bg-elevated">
          <TradePanel
            balance={gameState.balance}
            unrealizedPnL={unrealizedPnL}
            positions={positions}
            maxLeverage={gameState.maxLeverage ?? 1}
            unlockedLeverages={leverageOptions}
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
