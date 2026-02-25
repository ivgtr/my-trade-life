import type { ImportResult, SaveData, SaveProgress, SaveStats, SaveSettings } from '../types/save'
import type { DayHistoryEntry } from '../types/calendar'
import type { Position } from '../types/trading'
import { generateHash, verifyHash } from '../utils/hashUtils'

const SAVE_KEY = 'daytraderlife_save'
const CURRENT_VERSION = '1.0'
const DAILY_HISTORY_LIMIT = 366

export interface GameStateInput {
  balance?: number
  day?: number
  year?: number
  level?: number
  exp?: number
  unlockedFeatures?: string[]
  debt?: number
  debtLimit?: number
  interestRate?: number
  debtCount?: number
  dailyHistory?: DayHistoryEntry[]
  totalTrades?: number
  totalWins?: number
  totalPnL?: number
  lifetimePnl?: number
  speed?: number
  timeframe?: number
  positions?: Position[]
  currentPrice?: number
  maxLeverage?: number
}

const DEFAULT_PROGRESS: SaveProgress = {
  balance: 1000000,
  day: 1,
  year: 1,
  level: 1,
  exp: 0,
  unlockedFeatures: [],
  debt: 0,
  debtLimit: 0,
  interestRate: 0,
  debtCount: 0,
}

const DEFAULT_STATS: SaveStats = {
  totalTrades: 0,
  totalWins: 0,
  lifetimePnl: 0,
  dailyHistory: [],
}

const DEFAULT_SETTINGS: SaveSettings = {
  speed: 1,
  timeframe: 1,
}

/**
 * セーブデータ管理シングルトン。
 * localStorageへの保存/読み込み、ファイルImport/Exportを担う。
 */
export const SaveSystem = {
  save(gameState: GameStateInput): void {
    const data = buildSaveData(gameState)
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch {
      // localStorage書き込み失敗は無視
    }
  },

  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return null
      const data = JSON.parse(raw)
      return migrateSaveData(data)
    } catch {
      return null
    }
  },

  hasSaveData(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null
  },

  exportToFile(gameState: GameStateInput): void {
    const data = buildSaveData(gameState)
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `daytraderlife_save_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  async importFromFile(file: File): Promise<ImportResult> {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      return validateImportData(data)
    } catch {
      return {
        success: false,
        data: null,
        status: 'parseError',
        warning: 'JSONの解析に失敗しました',
      }
    }
  },

  deleteSaveData(): void {
    localStorage.removeItem(SAVE_KEY)
  },
}

function buildSaveData(gameState: GameStateInput): SaveData {
  const progress: SaveProgress = {
    balance:           gameState.balance ?? DEFAULT_PROGRESS.balance,
    day:               gameState.day ?? DEFAULT_PROGRESS.day,
    year:              gameState.year ?? DEFAULT_PROGRESS.year,
    level:             gameState.level ?? DEFAULT_PROGRESS.level,
    exp:               gameState.exp ?? DEFAULT_PROGRESS.exp,
    unlockedFeatures:  gameState.unlockedFeatures ?? [],
    debt:              gameState.debt ?? 0,
    debtLimit:         gameState.debtLimit ?? 0,
    interestRate:      gameState.interestRate ?? 0,
    debtCount:         gameState.debtCount ?? 0,
    positions:         gameState.positions ?? [],
    currentPrice:      gameState.currentPrice ?? 0,
    maxLeverage:       gameState.maxLeverage ?? 1,
  }

  let dailyHistory = gameState.dailyHistory ?? []
  if (dailyHistory.length > DAILY_HISTORY_LIMIT) {
    dailyHistory = dailyHistory.slice(-DAILY_HISTORY_LIMIT)
  }

  const stats: SaveStats = {
    totalTrades: gameState.totalTrades ?? 0,
    totalWins:   gameState.totalWins ?? 0,
    lifetimePnl: gameState.totalPnL ?? gameState.lifetimePnl ?? 0,
    dailyHistory,
  }

  const settings: SaveSettings = {
    speed: gameState.speed ?? 1,
    timeframe: gameState.timeframe ?? 1,
  }

  const hash = generateHash(progress.balance, progress.day)

  return {
    meta: {
      version: CURRENT_VERSION,
      savedAt: new Date().toISOString(),
      hash,
    },
    progress,
    stats,
    settings,
  }
}

function validateImportData(data: Record<string, unknown>): ImportResult {
  if (!data || !(data as { meta?: unknown }).meta) {
    return {
      success: false,
      data: null,
      status: 'parseError',
      warning: 'セーブデータの形式が不正です',
    }
  }

  const meta = (data as unknown as SaveData).meta
  const version = meta.version
  if (version && compareVersions(version, CURRENT_VERSION) > 0) {
    return {
      success: false,
      data: null,
      status: 'unknownVersion',
      warning: `未知のバージョン（${version}）のセーブデータです。このバージョンでは読み込めません。`,
    }
  }

  const progress = ((data as unknown as SaveData).progress ?? {}) as SaveProgress
  const hashValid = verifyHash(
    meta.hash,
    progress.balance ?? 0,
    progress.day ?? 0,
  )

  const migrated = migrateSaveData(data as unknown as SaveData)

  if (!hashValid) {
    return {
      success: true,
      data: migrated,
      status: 'tampered',
      warning: 'セーブデータが改ざんされている可能性があります。続行しますか？',
    }
  }

  return {
    success: true,
    data: migrated,
    status: 'valid',
    warning: null,
  }
}

function migrateSaveData(data: SaveData): SaveData {
  const progress: SaveProgress = {
    ...DEFAULT_PROGRESS,
    ...(data.progress ?? {}),
    positions: data.progress?.positions ?? [],
    currentPrice: data.progress?.currentPrice ?? 0,
    maxLeverage: data.progress?.maxLeverage ?? 1,
  }
  const stats: SaveStats = { ...DEFAULT_STATS, ...(data.stats ?? {}) }
  const settings: SaveSettings = { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) }

  if (stats.dailyHistory.length > DAILY_HISTORY_LIMIT) {
    stats.dailyHistory = stats.dailyHistory.slice(-DAILY_HISTORY_LIMIT)
  }

  return {
    meta: data.meta ?? { version: CURRENT_VERSION, savedAt: new Date().toISOString(), hash: '' },
    progress,
    stats,
    settings,
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na !== nb) return na - nb
  }
  return 0
}
