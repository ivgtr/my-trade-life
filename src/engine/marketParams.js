/**
 * @file 相場エンジン定数テーブル
 * MarketEngine / MacroRegimeManager が参照する全パラメータを一括定義する。
 * 値は仕様書 §4, §4.4, §4.6, §12.4 および design.md から抽出。
 */

/**
 * ボラティリティフェーズごとのティック間隔 (ms)
 * @type {Readonly<{high: {mean: number, sd: number}, normal: {mean: number, sd: number}, low: {mean: number, sd: number}}>}
 */
export const TICK_INTERVAL = Object.freeze({
  high:   Object.freeze({ mean: 80,  sd: 40  }),
  normal: Object.freeze({ mean: 200, sd: 80  }),
  low:    Object.freeze({ mean: 480, sd: 150 }),
})

/**
 * 価格変動パラメータ
 * @type {Readonly<{sd: number, kurtosis: number, fatTailP: number}>}
 */
export const PRICE_MOVE = Object.freeze({
  sd:       12.5,
  kurtosis: 4.2,
  fatTailP: 0.021,
})

/**
 * モメンタムパラメータ
 * @type {Readonly<{decay: number, maxAbs: number}>}
 */
export const MOMENTUM = Object.freeze({
  decay:  0.72,
  maxAbs: 16,
})

/**
 * ボラティリティフェーズ間の遷移確率 (6方向)
 * @type {Readonly<{highToNormal: number, highToLow: number, normalToHigh: number, normalToLow: number, lowToNormal: number, lowToHigh: number}>}
 */
export const VOL_TRANSITION = Object.freeze({
  highToNormal: 0.18,
  highToLow:    0.02,
  normalToHigh: 0.12,
  normalToLow:  0.08,
  lowToNormal:  0.06,
  lowToHigh:    0.01,
})

/**
 * 時間帯ごとのボラティリティ倍率・フェーズバイアス
 * @type {Readonly<Record<string, Readonly<{volMult: number, volPhBias: string}>>>}
 */
export const TIME_OF_DAY = Object.freeze({
  open:      Object.freeze({ volMult: 2.2, volPhBias: 'high'   }),
  morning:   Object.freeze({ volMult: 1.0, volPhBias: 'normal' }),
  lunch:     Object.freeze({ volMult: 0.2, volPhBias: 'low'    }),
  afternoon: Object.freeze({ volMult: 1.1, volPhBias: 'normal' }),
  close:     Object.freeze({ volMult: 1.8, volPhBias: 'high'   }),
})

/**
 * マクロレジームごとのドリフト・ボラティリティ倍率 (§4.4)
 * @type {Readonly<Record<string, Readonly<{drift: number, volMult: number}>>>}
 */
export const REGIME_PARAMS = Object.freeze({
  bullish:   Object.freeze({ drift:  0.0004, volMult: 1.0 }),
  bearish:   Object.freeze({ drift: -0.0003, volMult: 1.2 }),
  range:     Object.freeze({ drift:  0.0,    volMult: 0.7 }),
  turbulent: Object.freeze({ drift:  0.0,    volMult: 1.8 }),
  bubble:    Object.freeze({ drift:  0.0008, volMult: 1.5 }),
  crash:     Object.freeze({ drift: -0.0010, volMult: 2.5 }),
})

/**
 * レジーム名の順序定義 (MARKOV_MATRIX 配列インデックスとの対応)
 * @type {Readonly<string[]>}
 */
export const REGIME_ORDER = Object.freeze([
  'bullish', 'bearish', 'range', 'turbulent', 'bubble', 'crash',
])

/**
 * マルコフ遷移確率行列 (design.md から転記)
 * 配列順序: [bullish, bearish, range, turbulent, bubble, crash]
 * @type {Readonly<Record<string, Readonly<number[]>>>}
 */
export const MARKOV_MATRIX = Object.freeze({
  bullish:   Object.freeze([0.40, 0.10, 0.25, 0.15, 0.08, 0.02]),
  bearish:   Object.freeze([0.10, 0.40, 0.25, 0.15, 0.02, 0.08]),
  range:     Object.freeze([0.20, 0.20, 0.30, 0.20, 0.05, 0.05]),
  turbulent: Object.freeze([0.15, 0.15, 0.20, 0.30, 0.10, 0.10]),
  bubble:    Object.freeze([0.25, 0.05, 0.15, 0.20, 0.25, 0.10]),
  crash:     Object.freeze([0.05, 0.25, 0.15, 0.20, 0.10, 0.25]),
})

/**
 * 月別アノマリー (§4.6)
 * 記載のない月は中立値 (driftBias: 0, volBias: 1.0)
 * @type {Readonly<Record<number, Readonly<{driftBias: number, volBias: number, tendency: string}>>>}
 */
export const MONTHLY_ANOMALY = Object.freeze({
  1:  Object.freeze({ driftBias:  0.0002, volBias: 1.0, tendency: '年初ラリー期待' }),
  2:  Object.freeze({ driftBias:  0.0,    volBias: 1.0, tendency: '' }),
  3:  Object.freeze({ driftBias:  0.0,    volBias: 1.3, tendency: '期末リバランス' }),
  4:  Object.freeze({ driftBias:  0.0,    volBias: 1.0, tendency: '' }),
  5:  Object.freeze({ driftBias: -0.0002, volBias: 1.0, tendency: 'Sell in May' }),
  6:  Object.freeze({ driftBias:  0.0,    volBias: 1.0, tendency: '' }),
  7:  Object.freeze({ driftBias:  0.0,    volBias: 1.0, tendency: '' }),
  8:  Object.freeze({ driftBias:  0.0,    volBias: 0.7, tendency: '閑散・薄商い' }),
  9:  Object.freeze({ driftBias:  0.0,    volBias: 1.3, tendency: 'SQ・先物清算' }),
  10: Object.freeze({ driftBias:  0.0,    volBias: 1.0, tendency: '' }),
  11: Object.freeze({ driftBias:  0.0,    volBias: 1.0, tendency: '' }),
  12: Object.freeze({ driftBias:  0.0002, volBias: 1.0, tendency: 'クリスマスラリー' }),
})
