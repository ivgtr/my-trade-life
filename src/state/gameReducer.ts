import { ACTIONS } from '../types/game'
import type { GameState, GameAction } from '../types/game'

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
  isEndlessMode: false,
  peakBalance: 0,
  maxDrawdown: 0,
  consecutiveWins: 0,
  consecutiveLosses: 0,
  bestTrade: 0,
  worstTrade: 0,
}

const MAX_HISTORY = 366

export function gameReducer(state: GameState, action: GameAction): GameState {
  const { type } = action
  const payload = 'payload' in action ? action.payload : undefined

  switch (type) {
    case ACTIONS.SET_PHASE:
      return { ...state, phase: (payload as { phase: GameState['phase'] }).phase }

    case ACTIONS.INIT_NEW_GAME:
      return {
        ...initialState,
        balance: 1_000_000,
        peakBalance: 1_000_000,
      }

    case ACTIONS.LOAD_GAME:
      return { ...state, ...(payload as { gameState: Partial<GameState> }).gameState }

    case ACTIONS.START_SESSION:
      return {
        ...state,
        sessionActive: true,
        sessionPnL: 0,
        sessionTrades: 0,
        sessionWins: 0,
      }

    case ACTIONS.TICK_UPDATE: {
      const p = payload as NonNullable<typeof payload> & {
        currentPrice: number
        unrealizedPnL: number
        positions?: GameState['positions']
        dailyCondition?: GameState['dailyCondition']
        regimeParams?: GameState['regimeParams']
        anomalyParams?: GameState['anomalyParams']
        anomalyInfo?: GameState['anomalyInfo']
        previewEvent?: GameState['previewEvent']
        weekendNews?: GameState['weekendNews']
        monthlyStats?: GameState['monthlyStats']
        monthPreview?: GameState['monthPreview']
        yearlyStats?: GameState['yearlyStats']
        yearPreview?: GameState['yearPreview']
      }
      return {
        ...state,
        currentPrice: p.currentPrice,
        unrealizedPnL: p.unrealizedPnL,
        ...(p.positions !== undefined && { positions: p.positions }),
        ...(p.dailyCondition !== undefined && { dailyCondition: p.dailyCondition }),
        ...(p.regimeParams !== undefined && { regimeParams: p.regimeParams }),
        ...(p.anomalyParams !== undefined && { anomalyParams: p.anomalyParams }),
        ...(p.anomalyInfo !== undefined && { anomalyInfo: p.anomalyInfo }),
        ...(p.previewEvent !== undefined && { previewEvent: p.previewEvent }),
        ...(p.weekendNews !== undefined && { weekendNews: p.weekendNews }),
        ...(p.monthlyStats !== undefined && { monthlyStats: p.monthlyStats }),
        ...(p.monthPreview !== undefined && { monthPreview: p.monthPreview }),
        ...(p.yearlyStats !== undefined && { yearlyStats: p.yearlyStats }),
        ...(p.yearPreview !== undefined && { yearPreview: p.yearPreview }),
      }
    }

    case ACTIONS.END_SESSION: {
      return {
        ...state,
        sessionActive: false,
        positions: [],
        totalPnL: state.totalPnL + state.sessionPnL,
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

    case ACTIONS.ADVANCE_DAY:
      return {
        ...state,
        day: state.day + 1,
        currentDate: (payload as { date: string }).date,
      }

    case ACTIONS.RECORD_DAY: {
      const entry = (payload as { entry: GameState['dailyHistory'][number] }).entry
      const updatedHistory = [...state.dailyHistory, entry]
      return {
        ...state,
        dailyHistory:
          updatedHistory.length > MAX_HISTORY
            ? updatedHistory.slice(updatedHistory.length - MAX_HISTORY)
            : updatedHistory,
        sessionPnL: 0,
        sessionTrades: 0,
        sessionWins: 0,
      }
    }

    case ACTIONS.ADD_EXP:
      return { ...state, exp: state.exp + (payload as { amount: number }).amount }

    case ACTIONS.LEVEL_UP: {
      const p = payload as { level: number; unlockedFeatures: string[]; maxLeverage: number }
      return {
        ...state,
        level: p.level,
        unlockedFeatures: p.unlockedFeatures,
        maxLeverage: p.maxLeverage,
      }
    }

    case ACTIONS.SET_SPEED:
      return { ...state, speed: (payload as { speed: number }).speed === 2 ? 2 : 1 }

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
