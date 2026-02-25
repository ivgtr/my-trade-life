import { useRef, useState, useEffect, useCallback } from 'react'
import { ACTIONS } from '../state/actions'
import { MarketEngine } from '../engine/MarketEngine'
import { TradingEngine } from '../engine/TradingEngine'
import { NewsSystem } from '../engine/NewsSystem'
import { AudioSystem } from '../systems/AudioSystem'
import { createTickStore } from '../stores/tickStore'
import { createSessionStore } from '../stores/sessionStore'
import type { TickStore } from '../stores/tickStore'
import type { SessionStore } from '../stores/sessionStore'
import type { ChartHandle } from '../components/Chart'
import type { Direction, GameState, GameAction, TickData, RegimeParams, AnomalyParams, SetSLTPFn } from '../types'
import type { NewsEvent } from '../types/news'

interface UseSessionEngineConfig {
  gameState: GameState
  dispatch: React.Dispatch<GameAction>
  chartRef: React.RefObject<ChartHandle | null>
  onTickCallback?: (tick: TickData) => void
}

interface UseSessionEngineReturn {
  tickStore: TickStore
  sessionStore: SessionStore
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
  onTickCallback,
}: UseSessionEngineConfig): UseSessionEngineReturn {
  const marketEngineRef = useRef<MarketEngine | null>(null)
  const tradingEngineRef = useRef<TradingEngine | null>(null)
  const tickHistoryRef = useRef<TickData[]>([])
  const [activeNews, setActiveNews] = useState<NewsEvent | null>(null)
  const [speed, setSpeed] = useState(gameState.speed ?? 1)
  const [isLunchBreak, setIsLunchBreak] = useState(false)
  const lunchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onTickCallbackRef = useRef(onTickCallback)
  useEffect(() => {
    onTickCallbackRef.current = onTickCallback
  })

  const [tickStore] = useState(createTickStore)
  const [sessionStore] = useState(() => {
    const maxLev = gameState.maxLeverage ?? 1
    const availCash = gameState.availableCash ?? gameState.balance
    return createSessionStore({
      currentPrice: gameState.currentPrice ?? 0,
      unrealizedPnL: 0,
      availableCash: availCash,
      creditMargin: gameState.creditMargin ?? availCash * (maxLev - 1),
      buyingPower: gameState.buyingPower ?? availCash * maxLev,
      positions: gameState.positions ?? [],
      gameTime: '09:00',
    })
  })

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
        tickStore.getState().push(tickData)

        const triggeredIds = tradingEngine.checkSLTP(tickData.price)
        for (const id of triggeredIds) {
          const result = tradingEngine.closePosition(id, tickData.price)
          if (result) {
            dispatch({ type: ACTIONS.CLOSE_POSITION, payload: result })
            AudioSystem.playSE(result.pnl >= 0 ? 'profit' : 'loss')
          }
        }

        const { total: unrealizedPnL, availableCash, creditMargin, buyingPower } = tradingEngine.recalculateUnrealized(tickData.price)
        const time = marketEngine.getCurrentTime()

        sessionStore.setState({
          currentPrice: tickData.price,
          unrealizedPnL,
          availableCash,
          creditMargin,
          buyingPower,
          positions: tradingEngine.getPositions(),
          gameTime: time?.formatted ?? sessionStore.getState().gameTime,
        })

        newsSystem.checkTriggers(tickData.timestamp)

        onTickCallbackRef.current?.(tickData)
      },
      onSessionEnd: () => {
        const summary = tradingEngine.getDailySummary()
        const positions = tradingEngine.getPositions()
        const ss = sessionStore.getState()

        dispatch({
          type: ACTIONS.SYNC_SESSION_END,
          payload: {
            currentPrice: ss.currentPrice,
            unrealizedPnL: ss.unrealizedPnL,
            positions,
            availableCash: ss.availableCash,
            creditMargin: ss.creditMargin,
            buyingPower: ss.buyingPower,
          },
        })

        dispatch({ type: ACTIONS.END_SESSION, payload: { summary } })
        const phase = positions.length > 0 ? 'closing' : 'report'
        dispatch({ type: ACTIONS.SET_PHASE, payload: { phase } })
      },
    })
    marketEngineRef.current = marketEngine
    marketEngine.start()

    dispatch({ type: ACTIONS.START_SESSION })

    return () => {
      marketEngine.stop()
      if (lunchTimerRef.current) clearTimeout(lunchTimerRef.current)
      tickStore.getState().clear()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEntry = useCallback((direction: Direction, shares: number) => {
    const te = tradingEngineRef.current
    if (!te) return
    const price = sessionStore.getState().currentPrice
    const pos = te.openPosition(direction, shares, price)
    if (pos) {
      dispatch({ type: ACTIONS.OPEN_POSITION, payload: { position: pos } })
      AudioSystem.playSE('entry')
    }
  }, [dispatch, sessionStore])

  const handleSetSLTP: SetSLTPFn = useCallback((positionId: string, stopLoss?: number, takeProfit?: number): boolean => {
    return tradingEngineRef.current?.setSLTP(positionId, stopLoss, takeProfit) ?? false
  }, [])

  const handleClose = useCallback((positionId: string) => {
    const te = tradingEngineRef.current
    if (!te) return
    const price = sessionStore.getState().currentPrice
    const result = te.closePosition(positionId, price)
    if (result) {
      dispatch({ type: ACTIONS.CLOSE_POSITION, payload: result })
      AudioSystem.playSE(result.pnl >= 0 ? 'profit' : 'loss')
    }
  }, [dispatch, sessionStore])

  const handleCloseAll = useCallback(() => {
    const te = tradingEngineRef.current
    if (!te) return
    const price = sessionStore.getState().currentPrice
    const results = te.forceCloseAll(price)
    if (results.length === 0) return
    let totalPnl = 0
    for (const result of results) {
      dispatch({ type: ACTIONS.CLOSE_POSITION, payload: result })
      totalPnl += result.pnl
    }
    AudioSystem.playSE(totalPnl >= 0 ? 'profit' : 'loss')
  }, [dispatch, sessionStore])

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
    tickStore,
    sessionStore,
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
