import { generateHash, verifyHash } from '../utils/hashUtils'

const SAVE_KEY = 'daytraderlife_save'
const CURRENT_VERSION = '1.0'
const DAILY_HISTORY_LIMIT = 366

/**
 * @typedef {Object} ImportResult
 * @property {boolean} success
 * @property {Object|null} data - パース後のゲーム状態
 * @property {'valid'|'tampered'|'unknownVersion'|'parseError'} status
 * @property {string|null} warning - 警告メッセージ
 */

/**
 * セーブデータのデフォルト構造
 */
const DEFAULT_PROGRESS = {
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

const DEFAULT_STATS = {
  totalTrades: 0,
  totalWins: 0,
  lifetimePnl: 0,
  dailyHistory: [],
}

const DEFAULT_SETTINGS = {
  speed: 1,
}

/**
 * セーブデータ管理シングルトン。
 * localStorageへの保存/読み込み、ファイルImport/Exportを担う。
 *
 * Implements Req 1.4, 16.4, 18.4, 19.5, 23.1, 23.2, 23.3, 23.4, 24.1-24.5, 28.4
 */
export const SaveSystem = {
  /**
   * ゲーム状態を保存する。
   * @param {Object} gameState - 全コンポーネントのserialize()結果を統合したオブジェクト
   */
  save(gameState) {
    const data = buildSaveData(gameState)
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch {
      // localStorage書き込み失敗は無視
    }
  },

  /**
   * セーブデータを読み込む。
   * @returns {Object|null} ゲーム状態（存在しない場合null）
   */
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return null
      const data = JSON.parse(raw)
      return migrateSaveData(data)
    } catch {
      return null
    }
  },

  /**
   * セーブデータが存在するか確認する。
   * @returns {boolean}
   */
  hasSaveData() {
    return localStorage.getItem(SAVE_KEY) !== null
  },

  /**
   * JSONファイルをエクスポートする（Blobダウンロード）。
   * @param {Object} gameState
   */
  exportToFile(gameState) {
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

  /**
   * JSONファイルからインポートする。
   * @param {File} file
   * @returns {Promise<ImportResult>}
   */
  async importFromFile(file) {
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

  /**
   * セーブデータを削除する。
   */
  deleteSaveData() {
    localStorage.removeItem(SAVE_KEY)
  },
}

/**
 * ゲーム状態からセーブデータ用JSON構造を組み立てる。
 * @param {Object} gameState
 * @returns {Object}
 */
function buildSaveData(gameState) {
  const progress = {
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
  }

  let dailyHistory = gameState.dailyHistory ?? []
  if (dailyHistory.length > DAILY_HISTORY_LIMIT) {
    dailyHistory = dailyHistory.slice(-DAILY_HISTORY_LIMIT)
  }

  const stats = {
    totalTrades: gameState.totalTrades ?? 0,
    totalWins:   gameState.totalWins ?? 0,
    lifetimePnl: gameState.totalPnL ?? gameState.lifetimePnl ?? 0,
    dailyHistory,
  }

  const settings = {
    speed: gameState.speed ?? 1,
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

/**
 * インポートデータのバリデーションを実行する。
 * @param {Object} data
 * @returns {ImportResult}
 */
function validateImportData(data) {
  if (!data || !data.meta) {
    return {
      success: false,
      data: null,
      status: 'parseError',
      warning: 'セーブデータの形式が不正です',
    }
  }

  // バージョンチェック
  const version = data.meta.version
  if (version && compareVersions(version, CURRENT_VERSION) > 0) {
    return {
      success: false,
      data: null,
      status: 'unknownVersion',
      warning: `未知のバージョン（${version}）のセーブデータです。このバージョンでは読み込めません。`,
    }
  }

  // ハッシュ検証
  const progress = data.progress ?? {}
  const hashValid = verifyHash(
    data.meta.hash,
    progress.balance ?? 0,
    progress.day ?? 0,
  )

  const migrated = migrateSaveData(data)

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

/**
 * バージョンマイグレーションを実行する。
 * 旧バージョンの不足フィールドをデフォルト値で補完する。
 * @param {Object} data - パース済みセーブデータ
 * @returns {Object} マイグレーション後のデータ
 */
function migrateSaveData(data) {
  const progress = { ...DEFAULT_PROGRESS, ...(data.progress ?? {}) }
  const stats = { ...DEFAULT_STATS, ...(data.stats ?? {}) }
  const settings = { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) }

  // dailyHistory上限管理
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

/**
 * セマンティックバージョンを比較する。
 * @param {string} a
 * @param {string} b
 * @returns {number} a > b なら正, a < b なら負, 同じなら0
 */
function compareVersions(a, b) {
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
