import { ACTIONS } from '../types/game'
import type { GameState, GameAction } from '../types/game'
import type { LevelUpResult } from '../types/growth'

export const initialState: GameState = {
  phase: 'title',
  day: 1,
  currentDate: null,
  balance: 0,
  positions: [],
  currentPrice: 0,
  unrealizedPnL: 0,
  sessionActive: false,
  sessionPnL: 0,
  sessionTrades: 0,
  sessionWins: 0,
  totalTrades: 0,
  totalWins: 0,
  totalPnL: 0,
  dailyHistory: [],
  level: 1,
  exp: 0,
  unlockedFeatures: [],
  maxLeverage: 1,
  speed: 1,
  timeframe: 1,
  isEndlessMode: false,
  peakBalance: 0,
  maxDrawdown: 0,
  consecutiveWins: 0,
  consecutiveLosses: 0,
  bestTrade: 0,
  worstTrade: 0,
  gapResult: null,
  overnightSettled: false,
  overnightPnL: 0,
  lastLevelUp: null,
}

const MAX_HISTORY = 366

export function gameReducer(state: GameState, action: GameAction): GameState {
  const { type } = action
  const payload = 'payload' in action ? action.payload : undefined

  switch (type) {
    case ACTIONS.SET_PHASE:
      return { ...state, phase: (payload as { phase: GameState['phase'] }).phase }

    case ACTIONS.INIT_NEW_GAME: {
      const initPayload = payload as { speed?: number; currentDate?: string } | undefined
      return {
        ...initialState,
        balance: 1_000_000,
        peakBalance: 1_000_000,
        ...(initPayload?.speed != null && { speed: initPayload.speed }),
        ...(initPayload?.currentDate != null && { currentDate: initPayload.currentDate }),
      }
    }

    case ACTIONS.LOAD_GAME:
      return { ...state, ...(payload as { gameState: Partial<GameState> }).gameState, lastLevelUp: null }

    case ACTIONS.START_SESSION:
      return {
        ...state,
        sessionActive: true,
        preSessionSnapshot: {
          balance: state.balance,
          positions: state.positions,
          currentPrice: state.currentPrice,
          unrealizedPnL: state.unrealizedPnL,
          totalTrades: state.totalTrades,
          totalWins: state.totalWins,
          peakBalance: state.peakBalance,
          maxDrawdown: state.maxDrawdown,
          consecutiveWins: state.consecutiveWins,
          consecutiveLosses: state.consecutiveLosses,
          bestTrade: state.bestTrade,
          worstTrade: state.worstTrade,
        },
      }

    case ACTIONS.SET_DAY_CONTEXT: {
      const p = payload as import('../types/game').SetDayContextPayload
      return {
        ...state,
        currentPrice: p.currentPrice,
        unrealizedPnL: 0,
        ...(p.dailyCondition !== undefined && { dailyCondition: p.dailyCondition }),
        ...(p.regimeParams !== undefined && { regimeParams: p.regimeParams }),
        ...(p.anomalyParams !== undefined && { anomalyParams: p.anomalyParams }),
        ...(p.anomalyInfo !== undefined && { anomalyInfo: p.anomalyInfo }),
        ...(p.previewEvent !== undefined && { previewEvent: p.previewEvent }),
        ...(p.gapResult !== undefined && { gapResult: p.gapResult }),
        ...(p.overnightSettled !== undefined && { overnightSettled: p.overnightSettled }),
        ...(p.overnightPnL !== undefined && { overnightPnL: p.overnightPnL }),
      }
    }

    case ACTIONS.SET_WEEKEND_DATA: {
      const p = payload as import('../types/game').SetWeekendDataPayload
      return {
        ...state,
        currentPrice: p.currentPrice,
        unrealizedPnL: 0,
        weekendNews: p.weekendNews,
      }
    }

    case ACTIONS.SET_REPORT_DATA: {
      const p = payload as import('../types/game').SetReportDataPayload
      return {
        ...state,
        unrealizedPnL: 0,
        ...(p.monthlyStats !== undefined && { monthlyStats: p.monthlyStats }),
        ...(p.monthPreview !== undefined && { monthPreview: p.monthPreview }),
        ...(p.anomalyInfo !== undefined && { anomalyInfo: p.anomalyInfo }),
        ...(p.yearlyStats !== undefined && { yearlyStats: p.yearlyStats }),
        ...(p.yearPreview !== undefined && { yearPreview: p.yearPreview }),
      }
    }

    case ACTIONS.SYNC_SESSION_END: {
      const p = payload as import('../types/game').SyncSessionEndPayload
      return {
        ...state,
        currentPrice: p.currentPrice,
        unrealizedPnL: p.unrealizedPnL,
        positions: p.positions,
        availableCash: p.availableCash,
        creditMargin: p.creditMargin,
        buyingPower: p.buyingPower,
      }
    }

    case ACTIONS.END_SESSION: {
      return {
        ...state,
        sessionActive: false,
        preSessionSnapshot: undefined,
      }
    }

    case ACTIONS.ABORT_SESSION: {
      const snap = state.preSessionSnapshot
      return {
        ...state,
        ...(snap ?? {}),
        phase: 'title',
        sessionActive: false,
        sessionPnL: 0,
        sessionTrades: 0,
        sessionWins: 0,
        preSessionSnapshot: undefined,
      }
    }

    case ACTIONS.OPEN_POSITION: {
      const p = payload as { position: GameState['positions'][number] }
      return {
        ...state,
        positions: [...state.positions, p.position],
      }
    }

    case ACTIONS.CLOSE_POSITION: {
      const { positionId, pnl } = payload as { positionId: string; pnl: number }
      const isWin = pnl > 0
      const newBalance = state.balance + pnl
      return {
        ...state,
        positions: state.positions.filter((p) => p.id !== positionId),
        balance: newBalance,
        peakBalance: Math.max(state.peakBalance, newBalance),
        sessionPnL: state.sessionPnL + pnl,
        sessionTrades: state.sessionTrades + 1,
        sessionWins: state.sessionWins + (isWin ? 1 : 0),
        totalTrades: state.totalTrades + 1,
        totalWins: state.totalWins + (isWin ? 1 : 0),
        consecutiveWins: isWin ? state.consecutiveWins + 1 : 0,
        consecutiveLosses: isWin ? 0 : state.consecutiveLosses + 1,
        bestTrade: Math.max(state.bestTrade, pnl),
        worstTrade: Math.min(state.worstTrade, pnl),
        maxDrawdown: Math.max(
          state.maxDrawdown,
          state.peakBalance - newBalance
        ),
      }
    }

    case ACTIONS.FORCE_CLOSE_ALL: {
      const { totalPnl } = payload as { totalPnl: number }
      const newBalance = state.balance + totalPnl
      return {
        ...state,
        positions: [],
        balance: newBalance,
        peakBalance: Math.max(state.peakBalance, newBalance),
        sessionPnL: state.sessionPnL + totalPnl,
        unrealizedPnL: 0,
        maxDrawdown: Math.max(
          state.maxDrawdown,
          state.peakBalance - newBalance
        ),
      }
    }

    case ACTIONS.UPDATE_UNREALIZED:
      return { ...state, unrealizedPnL: (payload as { unrealizedPnL: number }).unrealizedPnL }

    case ACTIONS.ADVANCE_DAY: {
      const p = payload as { date: string; dayIncrement?: number }
      return {
        ...state,
        day: state.day + (p.dayIncrement ?? 1),
        currentDate: p.date,
      }
    }

    case ACTIONS.RECORD_DAY: {
      const entry: GameState['dailyHistory'][number] = {
        date: state.currentDate,
        pnl: state.sessionPnL,
        trades: state.sessionTrades,
        wins: state.sessionWins,
        balance: state.balance,
      }
      const updatedHistory = [...state.dailyHistory, entry]
      return {
        ...state,
        dailyHistory:
          updatedHistory.length > MAX_HISTORY
            ? updatedHistory.slice(updatedHistory.length - MAX_HISTORY)
            : updatedHistory,
        totalPnL: state.totalPnL + state.sessionPnL,
        sessionPnL: 0,
        sessionTrades: 0,
        sessionWins: 0,
      }
    }

    case ACTIONS.ADD_EXP:
      return { ...state, exp: state.exp + (payload as { amount: number }).amount }

    case ACTIONS.LEVEL_UP: {
      const p = payload as { level: number; newFeatures: string[]; maxLeverage: number; lastLevelUp: LevelUpResult }
      return {
        ...state,
        level: p.level,
        unlockedFeatures: [...new Set([...state.unlockedFeatures, ...p.newFeatures])],
        maxLeverage: p.maxLeverage,
        lastLevelUp: p.lastLevelUp,
      }
    }

    case ACTIONS.CLEAR_LEVEL_UP:
      return { ...state, lastLevelUp: null }

    case ACTIONS.SET_SPEED:
      return { ...state, speed: (payload as { speed: number }).speed === 2 ? 2 : 1 }

    case ACTIONS.SET_TIMEFRAME: {
      const tf = (payload as { timeframe: number }).timeframe
      return { ...state, timeframe: tf === 5 ? 5 : tf === 15 ? 15 : 1 }
    }

    case ACTIONS.GAME_OVER:
      return { ...state, phase: 'gameOver' }

    case ACTIONS.BILLIONAIRE:
      return { ...state, phase: 'billionaire' }

    case ACTIONS.ENTER_ENDLESS:
      return { ...state, isEndlessMode: true }

    default:
      return state
  }
}
