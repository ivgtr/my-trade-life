/**
 * @file 相場エンジン定数テーブル
 * MarketEngine / MacroRegimeManager が参照する全パラメータを一括定義する。
 * 値は仕様書 §4, §4.4, §4.6, §12.4 および design.md から抽出。
 */

import type { VolState, TimeZone, RegimeName } from '../types/market'

/** ボラティリティフェーズごとのティック間隔 (ms) */
export const TICK_INTERVAL = {
  high:   { mean: 80,  sd: 40  },
  normal: { mean: 200, sd: 80  },
  low:    { mean: 480, sd: 150 },
} as const satisfies Record<VolState, { mean: number; sd: number }>

/** 価格変動パラメータ */
export const PRICE_MOVE = {
  sd:       12.5,
  kurtosis: 4.2,
  fatTailP: 0.021,
} as const satisfies { sd: number; kurtosis: number; fatTailP: number }

/** モメンタムパラメータ */
export const MOMENTUM = {
  decay:  0.72,
  maxAbs: 16,
} as const satisfies { decay: number; maxAbs: number }

/** ボラティリティフェーズ間の遷移確率 (6方向) */
export const VOL_TRANSITION = {
  highToNormal: 0.18,
  highToLow:    0.02,
  normalToHigh: 0.12,
  normalToLow:  0.08,
  lowToNormal:  0.06,
  lowToHigh:    0.01,
} as const satisfies Record<string, number>

/** 時間帯ごとのボラティリティ倍率・フェーズバイアス */
export const TIME_OF_DAY = {
  open:      { volMult: 2.2, volPhBias: 'high'   },
  morning:   { volMult: 1.0, volPhBias: 'normal' },
  lunch:     { volMult: 0.2, volPhBias: 'low'    },
  afternoon: { volMult: 1.1, volPhBias: 'normal' },
  close:     { volMult: 1.8, volPhBias: 'high'   },
} as const satisfies Record<TimeZone, { volMult: number; volPhBias: VolState }>

/** マクロレジームごとのドリフト・ボラティリティ倍率 (§4.4) */
export const REGIME_PARAMS = {
  bullish:   { drift:  0.0004, volMult: 1.0 },
  bearish:   { drift: -0.0003, volMult: 1.2 },
  range:     { drift:  0.0,    volMult: 0.7 },
  turbulent: { drift:  0.0,    volMult: 1.8 },
  bubble:    { drift:  0.0008, volMult: 1.5 },
  crash:     { drift: -0.0010, volMult: 2.5 },
} as const satisfies Record<RegimeName, { drift: number; volMult: number }>

/** レジーム名の順序定義 (MARKOV_MATRIX 配列インデックスとの対応) */
export const REGIME_ORDER: readonly RegimeName[] = [
  'bullish', 'bearish', 'range', 'turbulent', 'bubble', 'crash',
] as const

/** マルコフ遷移確率行列 (design.md から転記) */
export const MARKOV_MATRIX = {
  bullish:   [0.40, 0.10, 0.25, 0.15, 0.08, 0.02],
  bearish:   [0.10, 0.40, 0.25, 0.15, 0.02, 0.08],
  range:     [0.20, 0.20, 0.30, 0.20, 0.05, 0.05],
  turbulent: [0.15, 0.15, 0.20, 0.30, 0.10, 0.10],
  bubble:    [0.25, 0.05, 0.15, 0.20, 0.25, 0.10],
  crash:     [0.05, 0.25, 0.15, 0.20, 0.10, 0.25],
} as const satisfies Record<RegimeName, readonly number[]>

/**
 * 月別アノマリー (§4.6)
 * 記載のない月は中立値 (driftBias: 0, volBias: 1.0)
 */
export const MONTHLY_ANOMALY = {
  1:  { driftBias:  0.0002, volBias: 1.0, tendency: '年初ラリー期待' },
  2:  { driftBias:  0.0,    volBias: 1.0, tendency: '' },
  3:  { driftBias:  0.0,    volBias: 1.3, tendency: '期末リバランス' },
  4:  { driftBias:  0.0,    volBias: 1.0, tendency: '' },
  5:  { driftBias: -0.0002, volBias: 1.0, tendency: 'Sell in May' },
  6:  { driftBias:  0.0,    volBias: 1.0, tendency: '' },
  7:  { driftBias:  0.0,    volBias: 1.0, tendency: '' },
  8:  { driftBias:  0.0,    volBias: 0.7, tendency: '閑散・薄商い' },
  9:  { driftBias:  0.0,    volBias: 1.3, tendency: 'SQ・先物清算' },
  10: { driftBias:  0.0,    volBias: 1.0, tendency: '' },
  11: { driftBias:  0.0,    volBias: 1.0, tendency: '' },
  12: { driftBias:  0.0002, volBias: 1.0, tendency: 'クリスマスラリー' },
} as const satisfies Record<number, { driftBias: number; volBias: number; tendency: string }>
