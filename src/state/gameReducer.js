import { ACTIONS } from './actions'

/**
 * ゲーム状態の初期値。
 * @type {Object}
 */
export const initialState = {
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

/** dailyHistory の上限件数 */
const MAX_HISTORY = 366

/**
 * ゲーム状態を管理するリデューサー。
 * @param {Object} state - 現在のゲーム状態
 * @param {{ type: string, payload?: any }} action - ディスパッチされたアクション
 * @returns {Object} 新しいゲーム状態
 */
export function gameReducer(state, action) {
  const { type, payload } = action

  switch (type) {
    case ACTIONS.SET_PHASE:
      return { ...state, phase: payload.phase }

    case ACTIONS.INIT_NEW_GAME:
      return {
        ...initialState,
        balance: 1_000_000,
        peakBalance: 1_000_000,
      }

    case ACTIONS.LOAD_GAME:
      return { ...state, ...payload.gameState }

    case ACTIONS.START_SESSION:
      return {
        ...state,
        sessionActive: true,
        sessionPnL: 0,
        sessionTrades: 0,
        sessionWins: 0,
      }

    case ACTIONS.TICK_UPDATE:
      return {
        ...state,
        currentPrice: payload.currentPrice,
        unrealizedPnL: payload.unrealizedPnL,
      }

    case ACTIONS.END_SESSION: {
      return {
        ...state,
        sessionActive: false,
        positions: [],
        totalPnL: state.totalPnL + state.sessionPnL,
      }
    }

    case ACTIONS.OPEN_POSITION:
      return {
        ...state,
        positions: [...state.positions, payload.position],
      }

    case ACTIONS.CLOSE_POSITION: {
      const { positionId, pnl } = payload
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
      const totalPnl = payload.totalPnl
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
      return { ...state, unrealizedPnL: payload.unrealizedPnL }

    case ACTIONS.ADVANCE_DAY:
      return {
        ...state,
        day: state.day + 1,
        currentDate: payload.date,
      }

    case ACTIONS.RECORD_DAY: {
      const entry = payload.entry
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
      return { ...state, exp: state.exp + payload.amount }

    case ACTIONS.LEVEL_UP:
      return {
        ...state,
        level: payload.level,
        unlockedFeatures: payload.unlockedFeatures,
        maxLeverage: payload.maxLeverage,
      }

    case ACTIONS.SET_SPEED:
      return { ...state, speed: payload.speed === 2 ? 2 : 1 }

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
