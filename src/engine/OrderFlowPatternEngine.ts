import { ALGO_PATTERN, BASE_VOLUME, scaleProb } from './marketParams'
import type { Rng } from '../utils/Rng'
import type { VolState, AlgoOverride } from '../types/market'

type PatternType = 'twap' | 'iceberg' | 'hft'

interface ActivePattern {
  type: PatternType
  ticksRemaining: number
  baseVolume: number
}

/**
 * アルゴリズム取引パターンエンジン。
 * TWAP / Iceberg / HFT の3パターンを確率的に発火させ、
 * アクティブ中はAlgoOverrideを返して出来高にスパイクを注入する。
 */
export class OrderFlowPatternEngine {
  #rng: Rng
  #activePattern: ActivePattern | null = null

  constructor(rng: Rng) {
    this.#rng = rng
  }

  update(dt: number, volState: VolState, activityMult: number): AlgoOverride | undefined {
    // アクティブパターンの処理
    if (this.#activePattern !== null) {
      this.#activePattern.ticksRemaining--
      const volume = this.#calcTickVolume(this.#activePattern)
      if (this.#activePattern.ticksRemaining <= 0) {
        this.#activePattern = null
      }
      return { volume }
    }

    const clampProb = (p: number) => Math.min(1, Math.max(0, p))

    // 発火判定（優先順: hft → iceberg → twap）
    if (this.#rng.chance(scaleProb(clampProb(ALGO_PATTERN.hft.triggerProb * activityMult), dt))) {
      const p = ALGO_PATTERN.hft
      this.#activePattern = {
        type: 'hft',
        ticksRemaining: this.#rng.intInclusive(p.ticksMin, p.ticksMax),
        baseVolume: BASE_VOLUME[volState] * this.#rng.range(p.volumeMultMin, p.volumeMultMax),
      }
      return undefined
    }

    if (this.#rng.chance(scaleProb(clampProb(ALGO_PATTERN.iceberg.triggerProb * activityMult), dt))) {
      const p = ALGO_PATTERN.iceberg
      this.#activePattern = {
        type: 'iceberg',
        ticksRemaining: this.#rng.intInclusive(p.ticksMin, p.ticksMax),
        baseVolume: this.#rng.range(p.volumeMin, p.volumeMax),
      }
      return undefined
    }

    if (this.#rng.chance(scaleProb(clampProb(ALGO_PATTERN.twap.triggerProb * activityMult), dt))) {
      const p = ALGO_PATTERN.twap
      this.#activePattern = {
        type: 'twap',
        ticksRemaining: this.#rng.intInclusive(p.ticksMin, p.ticksMax),
        baseVolume: this.#rng.range(p.volumeMin, p.volumeMax),
      }
      return undefined
    }

    return undefined
  }

  #calcTickVolume(pattern: ActivePattern): number {
    const params = ALGO_PATTERN[pattern.type]
    if (pattern.type === 'hft') {
      // HFTはtick変動なし
      return pattern.baseVolume
    }
    // TWAP/Icebergはtick変動あり
    const variation = 'tickVariation' in params ? params.tickVariation : 0
    return pattern.baseVolume * this.#rng.jitter(1.0, variation * 2)
  }
}
