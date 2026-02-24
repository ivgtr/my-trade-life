import type { Position } from './trading'

export interface ImportResult {
  success: boolean
  data: SaveData | null
  status: 'valid' | 'tampered' | 'unknownVersion' | 'parseError'
  warning: string | null
}

export interface SaveMeta {
  version: string
  savedAt: string
  hash: string
}

export interface SaveProgress {
  balance: number
  day: number
  year: number
  level: number
  exp: number
  unlockedFeatures: string[]
  debt: number
  debtLimit: number
  interestRate: number
  debtCount: number
  // CalendarSystem serialized fields
  currentDate?: string
  startDate?: string
  history?: Array<Record<string, unknown>>
  // オーバーナイト持ち越し用
  positions?: Position[]
  currentPrice?: number
  maxLeverage?: number
}

export interface SaveStats {
  totalTrades: number
  totalWins: number
  lifetimePnl: number
  dailyHistory: Array<Record<string, unknown>>
}

export interface SaveSettings {
  speed: number
  timeframe: number
}

export interface SaveData {
  meta: SaveMeta
  progress: SaveProgress
  stats: SaveStats
  settings: SaveSettings
  _regimeState?: Record<string, unknown> | null
  _growthState?: { level: number; exp: number; unlockedFeatures: string[] } | null
}
