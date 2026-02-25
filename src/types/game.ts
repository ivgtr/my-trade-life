import type { Position } from './trading'
import type { Timeframe, DailyCondition, RegimeParams, AnomalyParams, MonthPreview, YearPreviewEntry, GapResult } from './market'
import type { DayHistoryEntry, MonthlyStats, YearlyStats } from './calendar'
import type { PreviewEvent, WeekendNews } from './news'
import type { LevelUpResult } from './growth'

export type GamePhase =
  | 'title'
  | 'config'
  | 'importExport'
  | 'calendar'
  | 'morning'
  | 'session'
  | 'closing'
  | 'report'
  | 'weekend'
  | 'monthlyReport'
  | 'yearlyReport'
  | 'gameOver'
  | 'billionaire'
  | 'bgmTheater'

export interface GameState {
  phase: GamePhase
  day: number
  currentDate: string | null
  balance: number
  positions: Position[]
  currentPrice: number
  unrealizedPnL: number
  sessionActive: boolean
  sessionPnL: number
  sessionTrades: number
  sessionWins: number
  totalTrades: number
  totalWins: number
  totalPnL: number
  dailyHistory: DayHistoryEntry[]
  level: number
  exp: number
  unlockedFeatures: string[]
  maxLeverage: number
  speed: number
  timeframe: Timeframe
  isEndlessMode: boolean
  peakBalance: number
  maxDrawdown: number
  consecutiveWins: number
  consecutiveLosses: number
  bestTrade: number
  worstTrade: number
  // useGameFlow の TICK_UPDATE 経由で設定される追加フィールド
  dailyCondition?: DailyCondition
  regimeParams?: RegimeParams
  anomalyParams?: AnomalyParams
  anomalyInfo?: AnomalyParams | null
  previewEvent?: PreviewEvent | null
  weekendNews?: WeekendNews[]
  monthlyStats?: MonthlyStats
  monthPreview?: MonthPreview
  yearlyStats?: YearlyStats
  yearPreview?: YearPreviewEntry[]
  // セッション中の余力情報（TICK_UPDATE経由）
  availableCash?: number
  creditMargin?: number
  buyingPower?: number
  // オーバーナイト・ギャップ関連
  gapResult?: GapResult | null
  overnightSettled?: boolean
  overnightPnL?: number
  // レベルアップ結果（UI表示用、永続化不要）
  lastLevelUp?: LevelUpResult | null
  // LOAD_GAME で復元される追加フィールド
  year?: number
  debt?: number
  debtLimit?: number
  interestRate?: number
  debtCount?: number
}

export const ACTIONS = {
  SET_PHASE: 'SET_PHASE',
  INIT_NEW_GAME: 'INIT_NEW_GAME',
  LOAD_GAME: 'LOAD_GAME',
  START_SESSION: 'START_SESSION',
  TICK_UPDATE: 'TICK_UPDATE',
  END_SESSION: 'END_SESSION',
  OPEN_POSITION: 'OPEN_POSITION',
  CLOSE_POSITION: 'CLOSE_POSITION',
  FORCE_CLOSE_ALL: 'FORCE_CLOSE_ALL',
  UPDATE_UNREALIZED: 'UPDATE_UNREALIZED',
  ADVANCE_DAY: 'ADVANCE_DAY',
  RECORD_DAY: 'RECORD_DAY',
  ADD_EXP: 'ADD_EXP',
  LEVEL_UP: 'LEVEL_UP',
  SET_SPEED: 'SET_SPEED',
  SET_TIMEFRAME: 'SET_TIMEFRAME',
  GAME_OVER: 'GAME_OVER',
  BILLIONAIRE: 'BILLIONAIRE',
  ENTER_ENDLESS: 'ENTER_ENDLESS',
  CLEAR_LEVEL_UP: 'CLEAR_LEVEL_UP',
} as const

export type ActionType = typeof ACTIONS[keyof typeof ACTIONS]

export type GameAction =
  | { type: typeof ACTIONS.SET_PHASE; payload: { phase: GamePhase } }
  | { type: typeof ACTIONS.INIT_NEW_GAME; payload?: { speed?: number } }
  | { type: typeof ACTIONS.LOAD_GAME; payload: { gameState: Partial<GameState> } }
  | { type: typeof ACTIONS.START_SESSION }
  | { type: typeof ACTIONS.TICK_UPDATE; payload: TickUpdatePayload }
  | { type: typeof ACTIONS.END_SESSION; payload?: Record<string, unknown> }
  | { type: typeof ACTIONS.OPEN_POSITION; payload: { position: Position } }
  | { type: typeof ACTIONS.CLOSE_POSITION; payload: { positionId: string; pnl: number } }
  | { type: typeof ACTIONS.FORCE_CLOSE_ALL; payload: { totalPnl: number } }
  | { type: typeof ACTIONS.UPDATE_UNREALIZED; payload: { unrealizedPnL: number } }
  | { type: typeof ACTIONS.ADVANCE_DAY; payload: { date: string } }
  | { type: typeof ACTIONS.RECORD_DAY }
  | { type: typeof ACTIONS.ADD_EXP; payload: { amount: number } }
  | { type: typeof ACTIONS.LEVEL_UP; payload: { level: number; newFeatures: string[]; maxLeverage: number; lastLevelUp: LevelUpResult } }
  | { type: typeof ACTIONS.CLEAR_LEVEL_UP }
  | { type: typeof ACTIONS.SET_SPEED; payload: { speed: number } }
  | { type: typeof ACTIONS.SET_TIMEFRAME; payload: { timeframe: Timeframe } }
  | { type: typeof ACTIONS.GAME_OVER }
  | { type: typeof ACTIONS.BILLIONAIRE }
  | { type: typeof ACTIONS.ENTER_ENDLESS }

export interface TickUpdatePayload {
  currentPrice: number
  unrealizedPnL: number
  availableCash?: number
  creditMargin?: number
  buyingPower?: number
  positions?: Position[]
  dailyCondition?: DailyCondition
  regimeParams?: RegimeParams
  anomalyParams?: AnomalyParams
  anomalyInfo?: AnomalyParams | null
  previewEvent?: PreviewEvent | null
  weekendNews?: WeekendNews[]
  monthlyStats?: MonthlyStats
  monthPreview?: MonthPreview
  yearlyStats?: YearlyStats
  yearPreview?: YearPreviewEntry[]
  gapResult?: GapResult | null
  overnightSettled?: boolean
  overnightPnL?: number
}
