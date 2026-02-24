import { useRef, useCallback, useEffect } from 'react'
import { useGameContext } from './useGameContext'
import { ACTIONS } from '../state/actions'
import { CalendarSystem } from '../engine/CalendarSystem'
import { MacroRegimeManager } from '../engine/MacroRegimeManager'
import { GrowthSystem } from '../engine/GrowthSystem'
import { NewsSystem } from '../engine/NewsSystem'
import { SaveSystem } from '../systems/SaveSystem'
import type { GameState } from '../types/game'
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

  const calendarRef = useRef<CalendarSystem | null>(null)
  const regimeRef = useRef<MacroRegimeManager | null>(null)
  const growthRef = useRef<GrowthSystem | null>(null)
  const newsRef = useRef<NewsSystem | null>(null)

  const startNewGame = useCallback(() => {
    const calendar = new CalendarSystem()
    calendar.initializeStartDate()
    calendarRef.current = calendar

    const regime = new MacroRegimeManager()
    regime.initializeFirstQuarter()
    regimeRef.current = regime

    const growth = new GrowthSystem()
    growthRef.current = growth

    const newsSystem = new NewsSystem({
      currentRegime: regime.getRegimeParams().regime,
      onNewsTriggered: () => {},
    })
    newsRef.current = newsSystem

    dispatch({ type: ACTIONS.INIT_NEW_GAME })
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

    const growth = new GrowthSystem((data._growthState as any) ?? null)
    growthRef.current = growth

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
      const growth = growthRef.current
      const level = growth?.getLevel?.() ?? gameState.level ?? 1

      const dailyCondition = regime?.generateDailyCondition(level)
      const regimeParams = regime?.getRegimeParams()
      const month = d.getMonth() + 1
      const anomalyParams = regime?.getAnomalyParams(month)
      const anomalyInfo = regime?.getVisibleAnomalyInfo(month, level)

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
          currentPrice: gameState.currentPrice || 30000,
          unrealizedPnL: 0,
          dailyCondition,
          regimeParams,
          anomalyParams,
          anomalyInfo,
          previewEvent,
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
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'report' } })
  }, [dispatch])

  const closeReport = useCallback(() => {
    const cal = calendarRef.current

    recordDailyResult()
    if (checkTerminalConditions()) return
    if (handleEndOfMonth(cal)) return

    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'calendar' } })

    function recordDailyResult() {
      dispatch({
        type: ACTIONS.RECORD_DAY,
        payload: {
          entry: {
            date: gameState.currentDate,
            pnl: gameState.sessionPnL ?? 0,
            trades: gameState.sessionTrades ?? 0,
            wins: gameState.sessionWins ?? 0,
            balance: gameState.balance,
          },
        },
      })

      const growth = growthRef.current
      if (growth) {
        const bonus = growth.addDailyBonus(
          gameState.sessionTrades ?? 0,
          gameState.sessionWins ?? 0,
        )
        if (bonus.totalExp > 0) {
          dispatch({ type: ACTIONS.ADD_EXP, payload: { amount: bonus.totalExp } })
        }
        const levelResult = growth.checkLevelUp()
        if (levelResult) {
          dispatch({
            type: ACTIONS.LEVEL_UP,
            payload: {
              level: levelResult.newLevel,
              unlockedFeatures: levelResult.newFeatures,
              maxLeverage: levelResult.newLeverage ?? gameState.maxLeverage,
            },
          })
        }
      }
    }

    function checkTerminalConditions(): boolean {
      if (gameState.balance <= 0) {
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
      const month = new Date(gameState.currentDate!).getMonth() + 2
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
      dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'monthlyReport' } })
      return true
    }
  }, [dispatch, gameState])

  const closeWeekend = useCallback(() => {
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'calendar' } })
  }, [dispatch])

  const closeMonthlyReport = useCallback(() => {
    SaveSystem.save(gameState as any)

    const date = gameState.currentDate ? new Date(gameState.currentDate) : null
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
      dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'yearlyReport' } })
    } else {
      dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'calendar' } })
    }
  }, [dispatch, gameState])

  const closeYearlyReport = useCallback(() => {
    SaveSystem.save(gameState as any)
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'calendar' } })
  }, [dispatch, gameState])

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
    totalTrades: data.stats?.totalTrades ?? 0,
    totalWins: data.stats?.totalWins ?? 0,
    totalPnL: data.stats?.lifetimePnl ?? 0,
    dailyHistory: (data.stats?.dailyHistory ?? []) as any,
    speed: data.settings?.speed ?? 1,
    timeframe: (data.settings?.timeframe ?? 1) as GameState['timeframe'],
  }
}
