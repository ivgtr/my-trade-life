import { useRef, useState, useEffect, useCallback } from 'react'
import { ACTIONS } from '../state/actions'
import { MarketEngine } from '../engine/MarketEngine'
import { TradingEngine } from '../engine/TradingEngine'
import { NewsSystem } from '../engine/NewsSystem'
import { AudioSystem } from '../systems/AudioSystem'
import type { ChartHandle } from '../components/Chart'
import type { GameState, GameAction, TickData, RegimeParams, AnomalyParams } from '../types'
import type { NewsEvent } from '../types/news'

interface UseSessionEngineConfig {
  gameState: GameState
  dispatch: React.Dispatch<GameAction>
  chartRef: React.RefObject<ChartHandle | null>
  onEndSession?: (data: { results: unknown; summary: unknown }) => void
}

interface UseSessionEngineReturn {
  ticks: TickData[]
  gameTime: string
  activeNews: NewsEvent | null
  speed: number
  handleBuy: (shares: number) => void
  handleSell: (shares: number) => void
  handleClose: (positionId: string) => void
  handleSpeedChange: (newSpeed: number) => void
  handleNewsComplete: () => void
}

export function useSessionEngine({
  gameState,
  dispatch,
  chartRef,
  onEndSession,
}: UseSessionEngineConfig): UseSessionEngineReturn {
  const marketEngineRef = useRef<MarketEngine | null>(null)
  const tradingEngineRef = useRef<TradingEngine | null>(null)
  const [ticks, setTicks] = useState<TickData[]>([])
  const [gameTime, setGameTime] = useState('09:00')
  const [activeNews, setActiveNews] = useState<NewsEvent | null>(null)
  const [speed, setSpeed] = useState(gameState.speed ?? 1)

  useEffect(() => {
    const regimeParams: RegimeParams = gameState.regimeParams ?? { drift: 0, volMult: 1.0, regime: 'range' as const }
    const anomalyParams: AnomalyParams = gameState.anomalyParams ?? { driftBias: 0, volBias: 1.0, tendency: '' }
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

        const time = marketEngine.getCurrentTime()
        if (time) setGameTime(time.formatted)

        const { total: unrealizedPnL, availableCash, creditMargin, buyingPower } = tradingEngine.recalculateUnrealized(tickData.price)

        dispatch({
          type: ACTIONS.TICK_UPDATE,
          payload: {
            currentPrice: tickData.price,
            unrealizedPnL,
            availableCash,
            creditMargin,
            buyingPower,
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

  const handleBuy = useCallback((shares: number) => {
    const te = tradingEngineRef.current
    if (!te) return
    const pos = te.openPosition('LONG', shares, gameState.currentPrice)
    if (pos) {
      dispatch({ type: ACTIONS.OPEN_POSITION, payload: { position: pos } })
      AudioSystem.playSE('entry')
    }
  }, [gameState.currentPrice, dispatch])

  const handleSell = useCallback((shares: number) => {
    const te = tradingEngineRef.current
    if (!te) return
    const pos = te.openPosition('SHORT', shares, gameState.currentPrice)
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

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed)
    marketEngineRef.current?.setSpeed(newSpeed)
    dispatch({ type: ACTIONS.SET_SPEED, payload: { speed: newSpeed } })
  }, [dispatch])

  const handleNewsComplete = useCallback(() => {
    setActiveNews(null)
  }, [])

  return {
    ticks,
    gameTime,
    activeNews,
    speed,
    handleBuy,
    handleSell,
    handleClose,
    handleSpeedChange,
    handleNewsComplete,
  }
}
