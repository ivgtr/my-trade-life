import { useRef, useState, useEffect, useCallback } from 'react'
import { ACTIONS } from '../state/actions'
import { MarketEngine } from '../engine/MarketEngine'
import { TradingEngine } from '../engine/TradingEngine'
import { NewsSystem } from '../engine/NewsSystem'
import { AudioSystem } from '../systems/AudioSystem'
import type { ChartHandle } from '../components/Chart'
import type { Direction, GameState, GameAction, TickData, RegimeParams, AnomalyParams, SetSLTPFn } from '../types'
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
  isLunchBreak: boolean
  handleEntry: (direction: Direction, shares: number) => void
  handleClose: (positionId: string) => void
  handleCloseAll: () => void
  handleSetSLTP: SetSLTPFn
  handleSpeedChange: (newSpeed: number) => void
  handleNewsComplete: () => void
  getTickHistory: () => TickData[]
}

export function useSessionEngine({
  gameState,
  dispatch,
  chartRef,
  onEndSession,
}: UseSessionEngineConfig): UseSessionEngineReturn {
  const marketEngineRef = useRef<MarketEngine | null>(null)
  const tradingEngineRef = useRef<TradingEngine | null>(null)
  const tickHistoryRef = useRef<TickData[]>([])
  const [ticks, setTicks] = useState<TickData[]>([])
  const [gameTime, setGameTime] = useState('09:00')
  const [activeNews, setActiveNews] = useState<NewsEvent | null>(null)
  const [speed, setSpeed] = useState(gameState.speed ?? 1)
  const [isLunchBreak, setIsLunchBreak] = useState(false)
  const lunchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

    const existingPositions = gameState.positions.length > 0 ? gameState.positions : undefined
    const totalLockedMargin = existingPositions
      ? existingPositions.reduce((sum, p) => sum + p.margin, 0)
      : 0

    const tradingEngine = new TradingEngine({
      balance: gameState.balance - totalLockedMargin,
      maxLeverage: gameState.maxLeverage ?? 1,
      existingPositions,
    })
    tradingEngineRef.current = tradingEngine

    const marketEngine = new MarketEngine({
      openPrice,
      regimeParams,
      anomalyParams,
      speed,
      onLunchStart: () => {
        setIsLunchBreak(true)
        AudioSystem.playBGM('lunch')
        lunchTimerRef.current = setTimeout(() => {
          setIsLunchBreak(false)
          AudioSystem.playBGM('trading')
          marketEngineRef.current?.resumeFromLunch()
          lunchTimerRef.current = null
        }, 5000)
      },
      onTick: (tickData) => {
        tickHistoryRef.current.push(tickData)
        chartRef.current?.updateTick(tickData)
        setTicks((prev) => [...prev.slice(-99), tickData])

        const time = marketEngine.getCurrentTime()
        if (time) setGameTime(time.formatted)

        const triggeredIds = tradingEngine.checkSLTP(tickData.price)
        for (const id of triggeredIds) {
          const result = tradingEngine.closePosition(id, tickData.price)
          if (result) {
            dispatch({ type: ACTIONS.CLOSE_POSITION, payload: result })
            AudioSystem.playSE(result.pnl >= 0 ? 'profit' : 'loss')
          }
        }

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
        const summary = tradingEngine.getDailySummary()

        if (onEndSession) {
          onEndSession({ results: [], summary })
        } else {
          dispatch({
            type: ACTIONS.END_SESSION,
            payload: { summary },
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
      if (lunchTimerRef.current) clearTimeout(lunchTimerRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEntry = useCallback((direction: Direction, shares: number) => {
    const te = tradingEngineRef.current
    if (!te) return
    const pos = te.openPosition(direction, shares, gameState.currentPrice)
    if (pos) {
      dispatch({ type: ACTIONS.OPEN_POSITION, payload: { position: pos } })
      AudioSystem.playSE('entry')
    }
  }, [gameState.currentPrice, dispatch])

  const handleSetSLTP: SetSLTPFn = useCallback((positionId: string, stopLoss?: number, takeProfit?: number): boolean => {
    return tradingEngineRef.current?.setSLTP(positionId, stopLoss, takeProfit) ?? false
  }, [])

  const handleClose = useCallback((positionId: string) => {
    const te = tradingEngineRef.current
    if (!te) return
    const result = te.closePosition(positionId, gameState.currentPrice)
    if (result) {
      dispatch({ type: ACTIONS.CLOSE_POSITION, payload: result })
      AudioSystem.playSE(result.pnl >= 0 ? 'profit' : 'loss')
    }
  }, [gameState.currentPrice, dispatch])

  const handleCloseAll = useCallback(() => {
    const te = tradingEngineRef.current
    if (!te) return
    const results = te.forceCloseAll(gameState.currentPrice)
    if (results.length === 0) return
    let totalPnl = 0
    for (const result of results) {
      dispatch({ type: ACTIONS.CLOSE_POSITION, payload: result })
      totalPnl += result.pnl
    }
    AudioSystem.playSE(totalPnl >= 0 ? 'profit' : 'loss')
  }, [gameState.currentPrice, dispatch])

  const handleSpeedChange = useCallback((newSpeed: number) => {
    setSpeed(newSpeed)
    marketEngineRef.current?.setSpeed(newSpeed)
    dispatch({ type: ACTIONS.SET_SPEED, payload: { speed: newSpeed } })
  }, [dispatch])

  const handleNewsComplete = useCallback(() => {
    setActiveNews(null)
  }, [])

  const getTickHistory = useCallback(() => tickHistoryRef.current, [])

  return {
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
  }
}
