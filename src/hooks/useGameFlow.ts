import { useRef, useCallback, useEffect } from 'react'
import { useGameContext } from './useGameContext'
import { useAutoSave, computeDailyCloseState } from './useAutoSave'
import { ACTIONS } from '../state/actions'
import { CalendarSystem } from '../engine/CalendarSystem'
import { MacroRegimeManager } from '../engine/MacroRegimeManager'
import { NewsSystem } from '../engine/NewsSystem'
import { TradingEngine } from '../engine/TradingEngine'
import { calcGap } from '../engine/marketParams'
import { SaveSystem } from '../systems/SaveSystem'
import { ConfigManager } from '../systems/ConfigManager'
import { parseLocalDate } from '../utils/formatUtils'
import type { GameState } from '../types/game'
import type { GapResult } from '../types/market'
import type { SaveData } from '../types/save'

const BILLIONAIRE_THRESHOLD = 1_000_000_000

interface UseGameFlowReturn {
  phase: GameState['phase']
  gameState: GameState
  startNewGame: () => void
  loadGame: () => void
  advanceFromCalendar: () => void
  enterSession: () => void
  endSession: (sessionResult?: Record<string, unknown>) => void
  closeAllAtClose: () => void
  carryOver: () => void
  closeReport: () => void
  closeWeekend: () => void
  closeMonthlyReport: () => void
  closeYearlyReport: () => void
  returnToTitle: () => void
  continueEndless: () => void
  restartFromTitle: () => void
}

export function useGameFlow(): UseGameFlowReturn {
  const { gameState, dispatch } = useGameContext()
  const { saveAndTransition } = useAutoSave(dispatch, gameState)

  const calendarRef = useRef<CalendarSystem | null>(null)
  const regimeRef = useRef<MacroRegimeManager | null>(null)
  const newsRef = useRef<NewsSystem | null>(null)

  const startNewGame = useCallback(() => {
    const calendar = new CalendarSystem()
    calendar.initializeStartDate()
    calendarRef.current = calendar

    const regime = new MacroRegimeManager()
    regime.initializeFirstQuarter()
    regimeRef.current = regime

    const newsSystem = new NewsSystem({
      currentRegime: regime.getRegimeParams().regime,
      onNewsTriggered: () => {},
    })
    newsRef.current = newsSystem

    const cfg = ConfigManager.getAll()
    dispatch({ type: ACTIONS.INIT_NEW_GAME, payload: { speed: cfg.defaultSpeed } })
    dispatch({
      type: ACTIONS.SET_PHASE,
      payload: { phase: 'calendar' },
    })
    dispatch({
      type: ACTIONS.ADVANCE_DAY,
      payload: { date: calendar.getCurrentDate() },
    })
  }, [dispatch])

  const loadGame = useCallback(() => {
    const data = SaveSystem.load()
    if (!data) return

    const calendar = new CalendarSystem(data.progress as any)
    calendarRef.current = calendar

    const regime = new MacroRegimeManager((data._regimeState as any) ?? null)
    if (!data._regimeState) regime.initializeFirstQuarter()
    regimeRef.current = regime

    const newsSystem = new NewsSystem({
      currentRegime: regime.getRegimeParams().regime,
      onNewsTriggered: () => {},
    })
    newsRef.current = newsSystem

    dispatch({
      type: ACTIONS.LOAD_GAME,
      payload: { gameState: flattenSaveData(data) },
    })
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'calendar' } })
  }, [dispatch])

  const advanceFromCalendarRef = useRef<() => void>(() => {})

  const advanceFromCalendar = useCallback(() => {
    const cal = calendarRef.current
    if (!cal) return

    cal.advanceDay()
    const dateStr = cal.getCurrentDate()
    const date = new Date(dateStr)
    dispatch({
      type: ACTIONS.ADVANCE_DAY,
      payload: { date: dateStr },
    })

    const dayOfWeek = date.getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      handleWeekday(date)
    } else if (dayOfWeek === 6) {
      handleSaturday()
    } else {
      advanceFromCalendarRef.current()
    }

    function handleWeekday(d: Date) {
      const regime = regimeRef.current
      const level = gameState.level ?? 1

      const dailyCondition = regime?.generateDailyCondition(level)
      const regimeParams = regime?.getRegimeParams()
      const month = d.getMonth() + 1
      const anomalyParams = regime?.getAnomalyParams(month)
      const anomalyInfo = regime?.getVisibleAnomalyInfo(month, level)

      // ギャップ計算
      let openPrice = gameState.currentPrice || 30000
      let gapResult: GapResult | null = null
      const prevPreview = gameState.previewEvent ?? null

      if (gameState.currentPrice > 0 && regimeParams) {
        gapResult = calcGap(gameState.currentPrice, regimeParams.regime, prevPreview)
        openPrice = gapResult.openPrice
      }

      // 持ち越しポジションの寄り付き強制決済
      let overnightSettled = false
      let overnightPnL = 0

      if (gameState.positions.length > 0) {
        const totalMargin = gameState.positions.reduce((s, p) => s + p.margin, 0)
        const tempEngine = new TradingEngine({
          balance: gameState.balance - totalMargin,
          maxLeverage: gameState.maxLeverage ?? 1,
          existingPositions: gameState.positions,
        })
        const results = tempEngine.forceCloseAll(openPrice)
        const totalPnl = results.reduce((sum, r) => sum + r.pnl, 0)
        overnightSettled = true
        overnightPnL = totalPnl
        dispatch({ type: ACTIONS.FORCE_CLOSE_ALL, payload: { totalPnl } })
      }

      const news = newsRef.current
      if (news && regimeParams) news.setRegime(regimeParams.regime)
      const previewEvent = news?.generatePreviewEvent() ?? null

      dispatch({
        type: ACTIONS.SET_PHASE,
        payload: { phase: 'morning' },
      })
      dispatch({
        type: ACTIONS.TICK_UPDATE,
        payload: {
          currentPrice: openPrice,
          unrealizedPnL: 0,
          dailyCondition,
          regimeParams,
          anomalyParams,
          anomalyInfo,
          previewEvent,
          gapResult,
          overnightSettled,
          overnightPnL,
        },
      })
    }

    function handleSaturday() {
      const news = newsRef.current
      const weekendNews = news?.generateWeekendNews() ?? []
      if (news && weekendNews.length > 0) {
        news.getWeekendImpact(weekendNews)
      }
      dispatch({
        type: ACTIONS.SET_PHASE,
        payload: { phase: 'weekend' },
      })
      dispatch({
        type: ACTIONS.TICK_UPDATE,
        payload: {
          currentPrice: gameState.currentPrice || 30000,
          unrealizedPnL: 0,
          weekendNews,
        },
      })
    }
  }, [dispatch, gameState.currentPrice, gameState.level])

  useEffect(() => {
    advanceFromCalendarRef.current = advanceFromCalendar
  }, [advanceFromCalendar])

  const enterSession = useCallback(() => {
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'session' } })
  }, [dispatch])

  const endSession = useCallback((sessionResult?: Record<string, unknown>) => {
    dispatch({
      type: ACTIONS.END_SESSION,
      payload: sessionResult ?? {},
    })
    const phase = gameState.positions.length > 0 ? 'closing' : 'report'
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase } })
  }, [dispatch, gameState.positions.length])

  const closeAllAtClose = useCallback(() => {
    dispatch({ type: ACTIONS.FORCE_CLOSE_ALL, payload: { totalPnl: gameState.unrealizedPnL } })
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'report' } })
  }, [dispatch, gameState.unrealizedPnL])

  const carryOver = useCallback(() => {
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'report' } })
  }, [dispatch])

  const closeReport = useCallback(() => {
    const cal = calendarRef.current

    recordDailyResult()
    if (checkTerminalConditions()) return
    if (handleEndOfMonth(cal)) return

    saveAndTransition('calendar', { commitDailyResult: true })

    function recordDailyResult() {
      const closedState = computeDailyCloseState(gameState)

      dispatch({ type: ACTIONS.RECORD_DAY })

      const bonusExp = closedState.exp - gameState.exp
      if (bonusExp > 0) {
        dispatch({ type: ACTIONS.ADD_EXP, payload: { amount: bonusExp } })
      }

      if (closedState.level !== gameState.level) {
        const newFeatures = closedState.unlockedFeatures.filter(
          f => !gameState.unlockedFeatures.includes(f),
        )
        dispatch({
          type: ACTIONS.LEVEL_UP,
          payload: {
            level: closedState.level,
            newFeatures,
            maxLeverage: closedState.maxLeverage,
            lastLevelUp: closedState.lastLevelUp!,
          },
        })
      }
    }

    function checkTerminalConditions(): boolean {
      if (gameState.balance <= 0 && gameState.positions.length === 0) {
        dispatch({ type: ACTIONS.GAME_OVER })
        return true
      }
      if (!gameState.isEndlessMode && gameState.balance >= BILLIONAIRE_THRESHOLD) {
        dispatch({ type: ACTIONS.BILLIONAIRE })
        return true
      }
      return false
    }

    function handleEndOfMonth(calendar: CalendarSystem | null): boolean {
      if (!calendar?.isLastBusinessDay?.()) return false

      const monthStats = calendar.calcMonthlyStats()
      const monthPreview = regimeRef.current?.getNextMonthPreview()
      const month = parseLocalDate(gameState.currentDate!).getMonth() + 2
      const anomalyInfo = regimeRef.current?.getVisibleAnomalyInfo(
        month > 12 ? month - 12 : month,
        gameState.level,
      )

      dispatch({
        type: ACTIONS.TICK_UPDATE,
        payload: {
          currentPrice: gameState.currentPrice,
          unrealizedPnL: 0,
          monthlyStats: monthStats,
          monthPreview,
          anomalyInfo,
        },
      })
      saveAndTransition('monthlyReport', { commitDailyResult: true })
      return true
    }
  }, [dispatch, gameState, saveAndTransition])

  const closeWeekend = useCallback(() => {
    saveAndTransition('calendar')
  }, [saveAndTransition])

  const closeMonthlyReport = useCallback(() => {
    const date = gameState.currentDate ? parseLocalDate(gameState.currentDate) : null
    if (date && date.getMonth() === 11) {
      const cal = calendarRef.current
      const yearStats = cal?.calcYearlyStats() ?? { totalPnL: 0, totalTrades: 0, winRate: 0, maxDrawdown: 0 }
      const yearPreview = regimeRef.current?.getNextYearPreview() ?? []

      regimeRef.current?.transitionQuarter()

      dispatch({
        type: ACTIONS.TICK_UPDATE,
        payload: {
          currentPrice: gameState.currentPrice,
          unrealizedPnL: 0,
          yearlyStats: yearStats,
          yearPreview,
        },
      })
      saveAndTransition('yearlyReport')
    } else {
      saveAndTransition('calendar')
    }
  }, [dispatch, gameState, saveAndTransition])

  const closeYearlyReport = useCallback(() => {
    saveAndTransition('calendar')
  }, [saveAndTransition])

  const returnToTitle = useCallback(() => {
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'title' } })
  }, [dispatch])

  const continueEndless = useCallback(() => {
    dispatch({ type: ACTIONS.ENTER_ENDLESS })
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'calendar' } })
  }, [dispatch])

  const restartFromTitle = useCallback(() => {
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'title' } })
  }, [dispatch])

  return {
    phase: gameState.phase,
    gameState,
    startNewGame,
    loadGame,
    advanceFromCalendar,
    enterSession,
    endSession,
    closeAllAtClose,
    carryOver,
    closeReport,
    closeWeekend,
    closeMonthlyReport,
    closeYearlyReport,
    returnToTitle,
    continueEndless,
    restartFromTitle,
  }
}

function flattenSaveData(data: SaveData): Partial<GameState> {
  return {
    balance: data.progress?.balance ?? 1000000,
    day: data.progress?.day ?? 1,
    year: data.progress?.year ?? 1,
    level: data.progress?.level ?? 1,
    exp: data.progress?.exp ?? 0,
    unlockedFeatures: data.progress?.unlockedFeatures ?? [],
    debt: data.progress?.debt ?? 0,
    debtLimit: data.progress?.debtLimit ?? 0,
    interestRate: data.progress?.interestRate ?? 0,
    debtCount: data.progress?.debtCount ?? 0,
    positions: data.progress?.positions ?? [],
    currentPrice: data.progress?.currentPrice ?? 0,
    maxLeverage: data.progress?.maxLeverage ?? 1,
    totalTrades: data.stats?.totalTrades ?? 0,
    totalWins: data.stats?.totalWins ?? 0,
    totalPnL: data.stats?.lifetimePnl ?? 0,
    dailyHistory: data.stats?.dailyHistory ?? [],
    speed: data.settings?.speed ?? 1,
    timeframe: (data.settings?.timeframe ?? 1) as GameState['timeframe'],
  }
}
