import type { LevelUpResult, ExpBonus } from '../types/growth'

/** 1トレード完了ごとに付与する基礎経験値 */
const BASE_EXP_PER_TRADE = 10

/** 日次ボーナスの取引回数逓減しきい値（これを超えると1回あたりのボーナスが減少） */
const DIMINISHING_THRESHOLD = 10

/** 日次ボーナスの1取引あたり基本経験値 */
const BONUS_EXP_PER_TRADE = 5

/** レベルごとの必要累計経験値 */
const EXP_TABLE: Record<number, number> = {
  2: 100,
  3: 300,
  4: 600,
  5: 1000,
  6: 1500,
  7: 2200,
  8: 3000,
}

/** 最大レベル */
const MAX_LEVEL = 8

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

/** レベルごとの最大信用倍率（UNLOCK_TABLEから算出済み） */
const LEVERAGE_BY_LEVEL: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 3.3, 6: 3.3, 7: 3.3, 8: 3.3 }

interface GrowthState {
  level: number
  exp: number
  unlockedFeatures: string[]
}

/**
 * プレイヤーの成長（経験値・レベル・機能解放）を管理するクラス。
 * トレード完了時の基礎経験値付与、日次ボーナス経験値、
 * レベルアップ判定・機能解放・レバレッジ段階解放を担う。
 */
export class GrowthSystem {
  #level: number
  #exp: number
  #unlockedFeatures: Set<string>
  #dailyBaseExp: number

  constructor(state: GrowthState | null = null) {
    if (state) {
      this.#level = state.level
      this.#exp = state.exp
      this.#unlockedFeatures = new Set(state.unlockedFeatures || [])
    } else {
      this.#level = 1
      this.#exp = 0
      this.#unlockedFeatures = new Set()
    }
    this.#dailyBaseExp = 0
  }

  /** トレード完了時に基礎経験値を付与する（勝敗問わず）。 */
  addTradeExp(): number {
    this.#exp += BASE_EXP_PER_TRADE
    this.#dailyBaseExp += BASE_EXP_PER_TRADE
    return BASE_EXP_PER_TRADE
  }

  /**
   * 日次ボーナス経験値を計算・付与する。
   * 勝率 × 取引回数から算出し、回数逓減を適用する。
   */
  addDailyBonus(trades: number, wins: number): ExpBonus {
    const winRate = trades > 0 ? wins / trades : 0

    let effectiveTrades: number
    if (trades <= DIMINISHING_THRESHOLD) {
      effectiveTrades = trades
    } else {
      // しきい値超過分は平方根で逓減
      const excess = trades - DIMINISHING_THRESHOLD
      effectiveTrades = DIMINISHING_THRESHOLD + Math.sqrt(excess)
    }

    const bonusExp = Math.floor(winRate * effectiveTrades * BONUS_EXP_PER_TRADE)
    this.#exp += bonusExp

    const result: ExpBonus = {
      baseExp: this.#dailyBaseExp,
      bonusExp,
      totalExp: this.#dailyBaseExp + bonusExp,
      winRate,
      trades,
      wins,
    }

    // 日次カウンタをリセット
    this.#dailyBaseExp = 0

    return result
  }

  /**
   * レベルアップ判定を行い、条件を満たしていればレベルを上げて機能を解放する。
   * 複数レベル同時に上がる場合は最終レベルの結果を返す。
   */
  checkLevelUp(): LevelUpResult | null {
    if (this.#level >= MAX_LEVEL) {
      return null
    }

    let result: LevelUpResult | null = null

    while (this.#level < MAX_LEVEL) {
      const nextLevel = this.#level + 1
      const requiredExp = EXP_TABLE[nextLevel]

      if (this.#exp < requiredExp) {
        break
      }

      this.#level = nextLevel
      const unlock = UNLOCK_TABLE[nextLevel]

      if (unlock) {
        for (const feature of unlock.features) {
          this.#unlockedFeatures.add(feature)
        }

        result = {
          newLevel: nextLevel,
          newFeatures: [...unlock.features],
          newLeverage: unlock.leverage,
          label: unlock.label,
        }
      }
    }

    return result
  }

  /** 現在のレベルを返す。 */
  getLevel(): number {
    return this.#level
  }

  /** 現在の累計経験値を返す。 */
  getExp(): number {
    return this.#exp
  }

  /** 次のレベルに必要な経験値を返す。最大レベルの場合はnull。 */
  getExpToNextLevel(): number | null {
    if (this.#level >= MAX_LEVEL) {
      return null
    }
    return EXP_TABLE[this.#level + 1]
  }

  /** 現在のレベルに応じた最大レバレッジ倍率を返す。 */
  getMaxLeverage(): number {
    return LEVERAGE_BY_LEVEL[this.#level] || 1
  }

  /** 解放済み機能ID一覧を返す。 */
  getUnlockedFeatures(): string[] {
    return [...this.#unlockedFeatures]
  }

  /** 指定機能が解放済みかチェックする。 */
  isUnlocked(featureId: string): boolean {
    return this.#unlockedFeatures.has(featureId)
  }

  /** 状態をシリアライズして返す。復元用。 */
  serialize(): GrowthState {
    return {
      level: this.#level,
      exp: this.#exp,
      unlockedFeatures: [...this.#unlockedFeatures],
    }
  }
}
