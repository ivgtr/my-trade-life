import type { LevelUpResult, LevelUpEntry } from '../types/growth'

/** 日次ボーナスの取引回数逓減しきい値（これを超えると1回あたりのボーナスが減少） */
const DIMINISHING_THRESHOLD = 10

/** 日次ボーナスの1取引あたり基本経験値 */
const BONUS_EXP_PER_TRADE = 5

/** レベルごとの必要累計経験値 */
export const EXP_TABLE: Record<number, number> = {
  2: 100,
  3: 300,
  4: 600,
  5: 1000,
  6: 1500,
  7: 2200,
  8: 3000,
}

/** 最大レベル */
export const MAX_LEVEL = 8

interface UnlockEntry {
  features: string[]
  leverage: number | null
  label: string
}

/**
 * レベルごとの機能解放・レバレッジ解放テーブル。
 * features: 解放される機能IDの配列
 * leverage: 解放されるレバレッジ倍率（nullなら変更なし）
 * label: 表示用ラベル
 */
const UNLOCK_TABLE: Record<number, UnlockEntry> = {
  2: {
    features: ['dailySentimentIcon'],
    leverage: null,
    label: '地合いアイコン表示',
  },
  3: {
    features: ['dailySentimentValue'],
    leverage: 2,
    label: '地合い実強度数値',
  },
  4: {
    features: ['anomalyDisplay'],
    leverage: 3,
    label: '月次アノマリー表示',
  },
  5: {
    features: ['newsProbIndicator'],
    leverage: 3.3,
    label: 'ニュース発生確率',
  },
  6: {
    features: ['anomalyEffective'],
    leverage: null,
    label: 'アノマリー実効強度',
  },
  7: {
    features: ['regimeTransition'],
    leverage: null,
    label: 'レジーム遷移予兆',
  },
  8: {
    features: ['largeOrderDetect'],
    leverage: null,
    label: '大口動き検知',
  },
}

/** レベルごとの最大信用倍率（UNLOCK_TABLEから自動導出） */
const DEFAULT_LEVERAGE = 1
const LEVERAGE_BY_LEVEL: Record<number, number> = (() => {
  const map: Record<number, number> = { 1: DEFAULT_LEVERAGE }
  let current = DEFAULT_LEVERAGE
  for (let lv = 2; lv <= MAX_LEVEL; lv++) {
    const entry = UNLOCK_TABLE[lv]
    if (entry?.leverage != null) current = entry.leverage
    map[lv] = current
  }
  return map
})()

/**
 * 日次ボーナス経験値を計算する。
 * 勝率 × 取引回数から算出し、回数逓減を適用する。
 */
export function calculateDailyBonus(trades: number, wins: number): number {
  const winRate = trades > 0 ? wins / trades : 0

  let effectiveTrades: number
  if (trades <= DIMINISHING_THRESHOLD) {
    effectiveTrades = trades
  } else {
    effectiveTrades = DIMINISHING_THRESHOLD + Math.sqrt(trades - DIMINISHING_THRESHOLD)
  }

  return Math.floor(winRate * effectiveTrades * BONUS_EXP_PER_TRADE)
}

/**
 * レベルアップ判定を行う。
 * 複数レベル同時に上がる場合は全てのレベルの解放情報を返す。
 * レベル変化なしの場合は null を返す。
 */
export function checkLevelUp(currentLevel: number, currentExp: number): LevelUpResult | null {
  if (currentLevel >= MAX_LEVEL) return null

  let level = currentLevel
  const unlocks: LevelUpEntry[] = []

  while (level < MAX_LEVEL) {
    const next = level + 1
    if (currentExp < EXP_TABLE[next]) break
    level = next
    const entry = UNLOCK_TABLE[next]
    if (entry) {
      unlocks.push({
        level: next,
        features: [...entry.features],
        leverage: entry.leverage,
        label: entry.label,
      })
    }
  }

  if (level === currentLevel) return null
  return { newLevel: level, unlocks }
}

/** 指定レベルに応じた最大レバレッジ倍率を返す。 */
export function getMaxLeverage(level: number): number {
  return LEVERAGE_BY_LEVEL[level] ?? DEFAULT_LEVERAGE
}

/** 次のレベルに必要な経験値を返す。最大レベルの場合はnull。 */
export function getExpToNextLevel(level: number): number | null {
  if (level >= MAX_LEVEL) return null
  return EXP_TABLE[level + 1]
}
