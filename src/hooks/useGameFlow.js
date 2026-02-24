import { useRef, useCallback } from 'react'
import { useGameContext } from '../state/GameContext'
import { ACTIONS } from '../state/actions'
import { CalendarSystem } from '../engine/CalendarSystem'
import { MacroRegimeManager } from '../engine/MacroRegimeManager'
import { GrowthSystem } from '../engine/GrowthSystem'
import { NewsSystem } from '../engine/NewsSystem'
import { SaveSystem } from '../systems/SaveSystem'

const BILLIONAIRE_THRESHOLD = 1_000_000_000

/**
 * ゲームフロー制御フック。
 * 全画面遷移とエンジンインスタンスのライフサイクルを管理する。
 */
export function useGameFlow() {
  const { gameState, dispatch } = useGameContext()

  const calendarRef = useRef(null)
  const regimeRef = useRef(null)
  const growthRef = useRef(null)
  const newsRef = useRef(null)

  /**
   * 新規ゲーム開始。全エンジンを初期化しcalendarへ遷移。
   */
  const startNewGame = useCallback(() => {
    // CalendarSystem初期化
    const calendar = new CalendarSystem()
    calendar.initializeStartDate()
    calendarRef.current = calendar

    // MacroRegimeManager初期化
    const regime = new MacroRegimeManager()
    regime.initializeFirstQuarter()
    regimeRef.current = regime

    // GrowthSystem初期化
    const growth = new GrowthSystem()
    growthRef.current = growth

    // NewsSystem初期化
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

  /**
   * セーブデータからロード。
   */
  const loadGame = useCallback(() => {
    const data = SaveSystem.load()
    if (!data) return

    // エンジン復元
    const calendar = new CalendarSystem(data.progress)
    calendarRef.current = calendar

    const regime = new MacroRegimeManager(data._regimeState ?? null)
    if (!data._regimeState) regime.initializeFirstQuarter()
    regimeRef.current = regime

    const growth = new GrowthSystem(data._growthState ?? null)
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

  /**
   * カレンダーから次の画面へ進む。
   */
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
      // 平日 → 朝の地合い確認
      const regime = regimeRef.current
      const growth = growthRef.current
      const level = growth?.getLevel?.() ?? gameState.level ?? 1

      const dailyCondition = regime?.generateDailyCondition(level)
      const regimeParams = regime?.getRegimeParams()
      const month = date.getMonth() + 1
      const anomalyParams = regime?.getAnomalyParams(month)
      const anomalyInfo = regime?.getVisibleAnomalyInfo(month, level)

      // NewsSystem: 前日予告イベント生成
      const news = newsRef.current
      if (news && regimeParams) news.setRegime(regimeParams.regime)
      const previewEvent = news?.generatePreviewEvent() ?? null

      dispatch({
        type: ACTIONS.SET_PHASE,
        payload: { phase: 'morning' },
      })
      // 地合い情報をstateに反映（画面コンポーネント用）
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
    } else if (dayOfWeek === 6) {
      // 土曜 → 週末ニュース
      const news = newsRef.current
      const weekendNews = news?.generateWeekendNews() ?? []
      if (news && weekendNews.length > 0) {
        news.getWeekendImpact(weekendNews)
      }
      dispatch({
        type: ACTIONS.SET_PHASE,
        payload: { phase: 'weekend' },
      })
      // weekendNewsをstateに反映
      dispatch({
        type: ACTIONS.TICK_UPDATE,
        payload: {
          currentPrice: gameState.currentPrice || 30000,
          unrealizedPnL: 0,
          weekendNews,
        },
      })
    } else {
      // 日曜 → そのまま次の日へ
      advanceFromCalendar()
    }
  }, [dispatch, gameState.currentPrice, gameState.level])

  /**
   * 朝の地合い確認からセッション開始。
   */
  const enterSession = useCallback(() => {
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'session' } })
  }, [dispatch])

  /**
   * セッション終了処理。
   */
  const endSession = useCallback((sessionResult) => {
    dispatch({
      type: ACTIONS.END_SESSION,
      payload: sessionResult ?? {},
    })
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'report' } })
  }, [dispatch])

  /**
   * 成果報告画面を閉じる。月末判定・ゲームオーバー・ビリオネア判定。
   */
  const closeReport = useCallback(() => {
    const cal = calendarRef.current
    const growth = growthRef.current

    // 日次記録
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

    // 経験値付与
    if (growth) {
      const bonus = growth.addDailyBonus(
        gameState.sessionWins ?? 0,
        gameState.sessionTrades ?? 0,
        gameState.sessionTrades > 0
          ? (gameState.sessionWins ?? 0) / gameState.sessionTrades
          : 0,
      )
      if (bonus > 0) {
        dispatch({ type: ACTIONS.ADD_EXP, payload: { amount: bonus } })
      }
      const levelResult = growth.checkLevelUp(gameState.exp + bonus)
      if (levelResult) {
        dispatch({ type: ACTIONS.LEVEL_UP, payload: levelResult })
      }
    }

    // ゲームオーバー判定
    if (gameState.balance <= 0) {
      dispatch({ type: ACTIONS.GAME_OVER })
      return
    }

    // ビリオネア判定
    if (!gameState.isEndlessMode && gameState.balance >= BILLIONAIRE_THRESHOLD) {
      dispatch({ type: ACTIONS.BILLIONAIRE })
      return
    }

    // 月末判定
    if (cal?.isLastBusinessDay?.()) {
      const monthStats = cal.calcMonthlyStats?.(gameState.dailyHistory) ?? {}
      const monthPreview = regimeRef.current?.getNextMonthPreview()
      const month = new Date(gameState.currentDate).getMonth() + 2 // 翌月
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
      return
    }

    // 通常: カレンダーへ
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'calendar' } })
  }, [dispatch, gameState])

  /**
   * 週末画面を閉じる。
   */
  const closeWeekend = useCallback(() => {
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'calendar' } })
  }, [dispatch])

  /**
   * 月次レポートを閉じる。12月の場合は年次レポートへ。
   */
  const closeMonthlyReport = useCallback(() => {
    SaveSystem.save(gameState)

    const date = gameState.currentDate ? new Date(gameState.currentDate) : null
    if (date && date.getMonth() === 11) {
      // 12月 → 年次レポート
      const cal = calendarRef.current
      const yearStats = cal?.calcYearlyStats?.(gameState.dailyHistory) ?? {}
      const yearPreview = regimeRef.current?.getNextYearPreview() ?? []

      // 四半期遷移
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

  /**
   * 年次レポートを閉じる。
   */
  const closeYearlyReport = useCallback(() => {
    SaveSystem.save(gameState)
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'calendar' } })
  }, [dispatch, gameState])

  /**
   * タイトル画面へ戻る。
   */
  const returnToTitle = useCallback(() => {
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'title' } })
  }, [dispatch])

  /**
   * エンドレスモードで続ける。
   */
  const continueEndless = useCallback(() => {
    dispatch({ type: ACTIONS.ENTER_ENDLESS })
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'calendar' } })
  }, [dispatch])

  /**
   * 最初からやり直す。
   */
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

/**
 * SaveSystemのデータ構造をgameStateのフラットな構造に変換する。
 */
function flattenSaveData(data) {
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
    dailyHistory: data.stats?.dailyHistory ?? [],
    speed: data.settings?.speed ?? 1,
  }
}
