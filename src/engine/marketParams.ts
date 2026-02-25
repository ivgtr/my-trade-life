/**
 * @file 相場エンジン定数テーブル
 * MarketEngine / MacroRegimeManager が参照する全パラメータを一括定義する。
 * 値は仕様書 §4, §4.4, §4.6, §12.4 および design.md から抽出。
 */

import type { VolState, TimeZone, RegimeName, GapResult, IntradayScenario } from '../types/market'
import type { PreviewEvent } from '../types/news'
import { gaussRandom } from '../utils/mathUtils'
import { roundPrice } from './priceGrid'

/** ボラティリティフェーズごとのティック間隔 (ms) */
export const TICK_INTERVAL = {
  high:   { mean: 50,  sd: 25  },
  normal: { mean: 130, sd: 70  },
  low:    { mean: 450, sd: 200 },
} as const satisfies Record<VolState, { mean: number; sd: number }>

/** パラメータ定義の基準ティック間隔(ms) — 全dtスケーリングの分母 */
export const REFERENCE_TICK_MEAN = 200

/** 線形パラメータのdt変換（ドリフト・力） */
export const scaleLinear = (value: number, dt: number): number => value * dt

/** 減衰パラメータのdt変換（momentum, force decay） */
export const scaleDecay = (decay: number, dt: number): number => decay ** dt

/** 確率パラメータのdt変換（遷移確率, trigger確率） */
export const scaleProb = (prob: number, dt: number): number => 1 - (1 - prob) ** dt

/** 価格変動パラメータ（比例値: 基準価格30000円に対する比率） */
export const PRICE_MOVE = {
  sdPct:    0.00042,
  kurtosis: 4.2,
  fatTailP: 0.021,
} as const satisfies { sdPct: number; kurtosis: number; fatTailP: number }

/** モメンタムパラメータ（比例値） */
export const MOMENTUM = {
  decay:     0.72,
  maxAbsPct: 0.00053,
} as const satisfies { decay: number; maxAbsPct: number }

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

/** レジームごとのオーバーナイトギャップパラメータ */
export const GAP_PARAMS = {
  range:     { meanPct: 0.0,    sdPct: 0.003  },
  bullish:   { meanPct: 0.002,  sdPct: 0.005  },
  bearish:   { meanPct: -0.002, sdPct: 0.005  },
  turbulent: { meanPct: 0.0,    sdPct: 0.012  },
  bubble:    { meanPct: 0.005,  sdPct: 0.010  },
  crash:     { meanPct: -0.005, sdPct: 0.015  },
} as const satisfies Record<RegimeName, { meanPct: number; sdPct: number }>

/** ニュースによるギャップへの影響倍率 */
export const GAP_NEWS_IMPACT_MULT = 0.005

/** オーバーナイトギャップを計算する */
export function calcGap(
  closePrice: number,
  regime: RegimeName,
  previewEvent: PreviewEvent | null,
): GapResult {
  const params = GAP_PARAMS[regime]
  let gapPct = params.meanPct + gaussRandom() * params.sdPct
  if (previewEvent) {
    gapPct += (Math.random() - 0.5) * 1.2 * GAP_NEWS_IMPACT_MULT
  }
  const openPrice = roundPrice(closePrice * (1 + gapPct))
  return {
    openPrice,
    gapAmount: openPrice - closePrice,
    gapPercent: closePrice > 0 ? (openPrice - closePrice) / closePrice : 0,
    isGapUp: openPrice > closePrice,
  }
}

// ─── セッション内シナリオ ───────────────────────────────────

/** 全36シナリオ定義 */
export const INTRADAY_SCENARIOS: readonly IntradayScenario[] = [
  // ── 基本パターン (4種) ──
  {
    name: 'trend_follow', weight: 15,
    phases: [
      { startMinute: 540, driftOverride: null, volMult: 1.0, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'range_bound', weight: 12,
    phases: [
      { startMinute: 540, driftOverride: 0.0, volMult: 0.8, meanRevStrength: 0.7 },
    ],
  },
  {
    name: 'quiet', weight: 6,
    phases: [
      { startMinute: 540, driftOverride: 0.0, volMult: 0.3, meanRevStrength: 0.5 },
    ],
  },
  {
    name: 'volatile_directionless', weight: 6,
    phases: [
      { startMinute: 540, driftOverride: 0.0, volMult: 2.0, meanRevStrength: 0.3 },
    ],
  },

  // ── 反転パターン — テクニカル分析 (8種) ──
  {
    name: 'v_recovery', weight: 8,
    phases: [
      { startMinute: 540, driftOverride: -0.0012, volMult: 1.8, meanRevStrength: 0.0 },
      { startMinute: 630, driftOverride: -0.0008, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 750, driftOverride:  0.0003, volMult: 1.2, meanRevStrength: 0.3 },
      { startMinute: 810, driftOverride:  0.0015, volMult: 1.8, meanRevStrength: 0.5 },
      { startMinute: 870, driftOverride:  0.0008, volMult: 1.5, meanRevStrength: 0.3 },
    ],
  },
  {
    name: 'inverted_v', weight: 8,
    phases: [
      { startMinute: 540, driftOverride:  0.0012, volMult: 1.8, meanRevStrength: 0.0 },
      { startMinute: 630, driftOverride:  0.0008, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 750, driftOverride: -0.0003, volMult: 1.2, meanRevStrength: 0.3 },
      { startMinute: 810, driftOverride: -0.0015, volMult: 1.8, meanRevStrength: 0.5 },
      { startMinute: 870, driftOverride: -0.0008, volMult: 1.5, meanRevStrength: 0.3 },
    ],
  },
  {
    name: 'double_bottom', weight: 6,
    phases: [
      { startMinute: 540, driftOverride: -0.0010, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 585, driftOverride:  0.0006, volMult: 1.2, meanRevStrength: 0.2 },
      { startMinute: 630, driftOverride: -0.0008, volMult: 1.3, meanRevStrength: 0.0 },
      { startMinute: 690, driftOverride:  0.0002, volMult: 0.8, meanRevStrength: 0.4 },
      { startMinute: 750, driftOverride:  0.0008, volMult: 1.3, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride:  0.0005, volMult: 1.0, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'double_top', weight: 6,
    phases: [
      { startMinute: 540, driftOverride:  0.0010, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 585, driftOverride: -0.0006, volMult: 1.2, meanRevStrength: 0.2 },
      { startMinute: 630, driftOverride:  0.0008, volMult: 1.3, meanRevStrength: 0.0 },
      { startMinute: 690, driftOverride: -0.0002, volMult: 0.8, meanRevStrength: 0.4 },
      { startMinute: 750, driftOverride: -0.0008, volMult: 1.3, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride: -0.0005, volMult: 1.0, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'head_and_shoulders', weight: 4,
    phases: [
      { startMinute: 540, driftOverride:  0.0008, volMult: 1.3, meanRevStrength: 0.0 },
      { startMinute: 580, driftOverride: -0.0005, volMult: 1.0, meanRevStrength: 0.0 },
      { startMinute: 615, driftOverride:  0.0012, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 660, driftOverride: -0.0008, volMult: 1.3, meanRevStrength: 0.0 },
      { startMinute: 705, driftOverride:  0.0005, volMult: 1.0, meanRevStrength: 0.0 },
      { startMinute: 750, driftOverride: -0.0004, volMult: 0.8, meanRevStrength: 0.2 },
      { startMinute: 810, driftOverride: -0.0012, volMult: 1.8, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride: -0.0008, volMult: 1.5, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'inverse_head_and_shoulders', weight: 4,
    phases: [
      { startMinute: 540, driftOverride: -0.0008, volMult: 1.3, meanRevStrength: 0.0 },
      { startMinute: 580, driftOverride:  0.0005, volMult: 1.0, meanRevStrength: 0.0 },
      { startMinute: 615, driftOverride: -0.0012, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 660, driftOverride:  0.0008, volMult: 1.3, meanRevStrength: 0.0 },
      { startMinute: 705, driftOverride: -0.0005, volMult: 1.0, meanRevStrength: 0.0 },
      { startMinute: 750, driftOverride:  0.0004, volMult: 0.8, meanRevStrength: 0.2 },
      { startMinute: 810, driftOverride:  0.0012, volMult: 1.8, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride:  0.0008, volMult: 1.5, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'selling_climax', weight: 5,
    phases: [
      { startMinute: 540, driftOverride: -0.0003, volMult: 0.8, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride: -0.0005, volMult: 1.0, meanRevStrength: 0.0 },
      { startMinute: 660, driftOverride: -0.0008, volMult: 1.3, meanRevStrength: 0.0 },
      { startMinute: 750, driftOverride: -0.0020, volMult: 2.5, meanRevStrength: 0.0 },
      { startMinute: 810, driftOverride:  0.0015, volMult: 2.0, meanRevStrength: 0.4 },
      { startMinute: 870, driftOverride:  0.0008, volMult: 1.5, meanRevStrength: 0.3 },
    ],
  },
  {
    name: 'parabolic_blowoff', weight: 5,
    phases: [
      { startMinute: 540, driftOverride:  0.0003, volMult: 0.8, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride:  0.0005, volMult: 1.0, meanRevStrength: 0.0 },
      { startMinute: 660, driftOverride:  0.0008, volMult: 1.3, meanRevStrength: 0.0 },
      { startMinute: 750, driftOverride:  0.0020, volMult: 2.5, meanRevStrength: 0.0 },
      { startMinute: 810, driftOverride: -0.0015, volMult: 2.0, meanRevStrength: 0.4 },
      { startMinute: 870, driftOverride: -0.0008, volMult: 1.5, meanRevStrength: 0.3 },
    ],
  },

  // ── 継続パターン — テクニカル分析 (4種) ──
  {
    name: 'ascending_staircase', weight: 6,
    phases: [
      { startMinute: 540, driftOverride:  0.0008, volMult: 1.2, meanRevStrength: 0.0 },
      { startMinute: 590, driftOverride:  0.0001, volMult: 0.5, meanRevStrength: 0.5 },
      { startMinute: 640, driftOverride:  0.0008, volMult: 1.2, meanRevStrength: 0.0 },
      { startMinute: 690, driftOverride:  0.0001, volMult: 0.5, meanRevStrength: 0.5 },
      { startMinute: 750, driftOverride:  0.0010, volMult: 1.3, meanRevStrength: 0.0 },
      { startMinute: 810, driftOverride:  0.0001, volMult: 0.5, meanRevStrength: 0.5 },
      { startMinute: 870, driftOverride:  0.0006, volMult: 1.0, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'descending_staircase', weight: 6,
    phases: [
      { startMinute: 540, driftOverride: -0.0008, volMult: 1.2, meanRevStrength: 0.0 },
      { startMinute: 590, driftOverride: -0.0001, volMult: 0.5, meanRevStrength: 0.5 },
      { startMinute: 640, driftOverride: -0.0008, volMult: 1.2, meanRevStrength: 0.0 },
      { startMinute: 690, driftOverride: -0.0001, volMult: 0.5, meanRevStrength: 0.5 },
      { startMinute: 750, driftOverride: -0.0010, volMult: 1.3, meanRevStrength: 0.0 },
      { startMinute: 810, driftOverride: -0.0001, volMult: 0.5, meanRevStrength: 0.5 },
      { startMinute: 870, driftOverride: -0.0006, volMult: 1.0, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'bull_flag', weight: 5,
    phases: [
      { startMinute: 540, driftOverride:  0.0015, volMult: 1.8, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride:  0.0001, volMult: 0.6, meanRevStrength: 0.4 },
      { startMinute: 720, driftOverride:  0.0002, volMult: 0.5, meanRevStrength: 0.5 },
      { startMinute: 810, driftOverride:  0.0012, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride:  0.0006, volMult: 1.2, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'bear_flag', weight: 5,
    phases: [
      { startMinute: 540, driftOverride: -0.0015, volMult: 1.8, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride: -0.0001, volMult: 0.6, meanRevStrength: 0.4 },
      { startMinute: 720, driftOverride: -0.0002, volMult: 0.5, meanRevStrength: 0.5 },
      { startMinute: 810, driftOverride: -0.0012, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride: -0.0006, volMult: 1.2, meanRevStrength: 0.0 },
    ],
  },

  // ── 時間帯パターン (4種) ──
  {
    name: 'morning_rally_afternoon_sell', weight: 6,
    phases: [
      { startMinute: 540, driftOverride:  0.0010, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 630, driftOverride:  0.0005, volMult: 1.0, meanRevStrength: 0.0 },
      { startMinute: 720, driftOverride:  0.0001, volMult: 0.5, meanRevStrength: 0.2 },
      { startMinute: 780, driftOverride: -0.0008, volMult: 1.3, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride: -0.0010, volMult: 1.5, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'opening_spike_fade', weight: 5,
    phases: [
      { startMinute: 540, driftOverride:  0.0020, volMult: 2.0, meanRevStrength: 0.0 },
      { startMinute: 570, driftOverride:  0.0005, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride: -0.0003, volMult: 1.0, meanRevStrength: 0.0 },
      { startMinute: 720, driftOverride: -0.0004, volMult: 0.8, meanRevStrength: 0.2 },
      { startMinute: 810, driftOverride: -0.0005, volMult: 1.0, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride: -0.0003, volMult: 0.8, meanRevStrength: 0.2 },
    ],
  },
  {
    name: 'late_breakout', weight: 5,
    phases: [
      { startMinute: 540, driftOverride:  0.0001, volMult: 0.5, meanRevStrength: 0.6 },
      { startMinute: 630, driftOverride:  0.0000, volMult: 0.4, meanRevStrength: 0.7 },
      { startMinute: 750, driftOverride:  0.0001, volMult: 0.4, meanRevStrength: 0.7 },
      { startMinute: 870, driftOverride: null,     volMult: 2.0, meanRevStrength: 0.0 },
      { startMinute: 900, driftOverride: null,     volMult: 2.5, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'lunch_reversal', weight: 5,
    phases: [
      { startMinute: 540, driftOverride:  0.0010, volMult: 1.3, meanRevStrength: 0.0 },
      { startMinute: 630, driftOverride:  0.0008, volMult: 1.2, meanRevStrength: 0.0 },
      { startMinute: 720, driftOverride:  0.0002, volMult: 0.6, meanRevStrength: 0.3 },
      { startMinute: 780, driftOverride: -0.0010, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride: -0.0008, volMult: 1.3, meanRevStrength: 0.0 },
    ],
  },

  // ── 特殊パターン (2種) ──
  {
    name: 'dead_cat_bounce', weight: 4,
    phases: [
      { startMinute: 540, driftOverride: -0.0015, volMult: 2.0, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride: -0.0010, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 660, driftOverride:  0.0008, volMult: 1.2, meanRevStrength: 0.0 },
      { startMinute: 750, driftOverride:  0.0003, volMult: 0.8, meanRevStrength: 0.3 },
      { startMinute: 810, driftOverride: -0.0010, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride: -0.0006, volMult: 1.2, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'cup_and_handle', weight: 4,
    phases: [
      { startMinute: 540, driftOverride: -0.0006, volMult: 1.0, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride: -0.0003, volMult: 0.8, meanRevStrength: 0.0 },
      { startMinute: 660, driftOverride:  0.0002, volMult: 0.6, meanRevStrength: 0.2 },
      { startMinute: 720, driftOverride:  0.0005, volMult: 0.8, meanRevStrength: 0.0 },
      { startMinute: 780, driftOverride:  0.0003, volMult: 0.6, meanRevStrength: 0.0 },
      { startMinute: 810, driftOverride:  0.0001, volMult: 0.4, meanRevStrength: 0.4 },
      { startMinute: 870, driftOverride:  0.0012, volMult: 1.5, meanRevStrength: 0.0 },
    ],
  },

  // ── 歴史的ショック — 暴落・ショック系 (8種) ──
  {
    name: 'cascade_crash', weight: 2, // ブラックマンデー1987: 波状崩壊
    phases: [
      { startMinute: 540, driftOverride: -0.0025, volMult: 3.0, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride:  0.0008, volMult: 1.5, meanRevStrength: 0.2 },
      { startMinute: 660, driftOverride: -0.0020, volMult: 2.8, meanRevStrength: 0.0 },
      { startMinute: 780, driftOverride:  0.0005, volMult: 1.2, meanRevStrength: 0.0 },
      { startMinute: 810, driftOverride: -0.0025, volMult: 3.5, meanRevStrength: 0.0 },
      { startMinute: 900, driftOverride:  0.0003, volMult: 2.0, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'flash_crash', weight: 2, // フラッシュクラッシュ2010: 瞬間暴落→即全戻し
    phases: [
      { startMinute: 540, driftOverride: -0.0002, volMult: 0.7, meanRevStrength: 0.0 },
      { startMinute: 660, driftOverride: -0.0003, volMult: 1.0, meanRevStrength: 0.0 },
      { startMinute: 780, driftOverride: -0.0040, volMult: 4.0, meanRevStrength: 0.0 },
      { startMinute: 810, driftOverride:  0.0035, volMult: 3.5, meanRevStrength: 0.6 },
      { startMinute: 870, driftOverride: -0.0003, volMult: 1.5, meanRevStrength: 0.3 },
    ],
  },
  {
    name: 'circuit_breaker_crash', weight: 2, // 令和ブラックマンデー2024: CB発動型暴落
    phases: [
      { startMinute: 540, driftOverride: -0.0012, volMult: 2.0, meanRevStrength: 0.0 },
      { startMinute: 630, driftOverride: -0.0005, volMult: 1.5, meanRevStrength: 0.1 },
      { startMinute: 720, driftOverride: -0.0025, volMult: 3.0, meanRevStrength: 0.0 },
      { startMinute: 780, driftOverride: -0.0030, volMult: 3.5, meanRevStrength: 0.0 },
      { startMinute: 840, driftOverride: -0.0020, volMult: 3.0, meanRevStrength: 0.0 },
      { startMinute: 900, driftOverride:  0.0002, volMult: 2.0, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'disaster_panic', weight: 2, // 東日本大震災2011: 段階崩壊
    phases: [
      { startMinute: 540, driftOverride: -0.0015, volMult: 2.5, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride: -0.0003, volMult: 1.2, meanRevStrength: 0.2 },
      { startMinute: 660, driftOverride: -0.0020, volMult: 3.0, meanRevStrength: 0.0 },
      { startMinute: 750, driftOverride: -0.0015, volMult: 2.5, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride:  0.0003, volMult: 1.5, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'lehman_whipsaw', weight: 2, // リーマンショック2008: 超高ボラ乱高下+下落
    phases: [
      { startMinute: 540, driftOverride: -0.0018, volMult: 3.0, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride:  0.0012, volMult: 2.5, meanRevStrength: 0.0 },
      { startMinute: 660, driftOverride: -0.0015, volMult: 2.8, meanRevStrength: 0.0 },
      { startMinute: 750, driftOverride:  0.0006, volMult: 2.0, meanRevStrength: 0.0 },
      { startMinute: 810, driftOverride: -0.0010, volMult: 2.5, meanRevStrength: 0.0 },
      { startMinute: 900, driftOverride: -0.0008, volMult: 2.0, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'pandemic_freefall', weight: 2, // コロナショック2020: 一方的暴落
    phases: [
      { startMinute: 540, driftOverride: -0.0015, volMult: 2.5, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride:  0.0003, volMult: 1.5, meanRevStrength: 0.1 },
      { startMinute: 660, driftOverride: -0.0012, volMult: 2.2, meanRevStrength: 0.0 },
      { startMinute: 780, driftOverride: -0.0018, volMult: 2.8, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride: -0.0005, volMult: 1.8, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'peg_break', weight: 2, // スイスフランショック2015: 場中ギャップ型
    phases: [
      { startMinute: 540, driftOverride:  0.0000, volMult: 0.3, meanRevStrength: 0.7 },
      { startMinute: 660, driftOverride: -0.0050, volMult: 5.0, meanRevStrength: 0.0 },
      { startMinute: 690, driftOverride:  0.0010, volMult: 3.0, meanRevStrength: 0.0 },
      { startMinute: 780, driftOverride:  0.0000, volMult: 1.5, meanRevStrength: 0.4 },
      { startMinute: 870, driftOverride: -0.0003, volMult: 1.2, meanRevStrength: 0.3 },
    ],
  },
  {
    name: 'volatility_explosion', weight: 2, // VIXショック2018: 超高ボラ+下落
    phases: [
      { startMinute: 540, driftOverride: -0.0015, volMult: 3.0, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride: -0.0005, volMult: 3.5, meanRevStrength: 0.2 },
      { startMinute: 720, driftOverride: -0.0008, volMult: 3.0, meanRevStrength: 0.0 },
      { startMinute: 810, driftOverride:  0.0005, volMult: 2.5, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride: -0.0010, volMult: 2.5, meanRevStrength: 0.0 },
    ],
  },

  // ── 歴史的ショック — 急落→反発系 (3種) ──
  {
    name: 'black_thursday', weight: 2, // ウォール街大暴落1929: 介入で急回復
    phases: [
      { startMinute: 540, driftOverride: -0.0035, volMult: 3.5, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride: -0.0015, volMult: 2.5, meanRevStrength: 0.0 },
      { startMinute: 660, driftOverride:  0.0025, volMult: 2.5, meanRevStrength: 0.5 },
      { startMinute: 720, driftOverride:  0.0005, volMult: 1.0, meanRevStrength: 0.5 },
      { startMinute: 810, driftOverride:  0.0000, volMult: 0.8, meanRevStrength: 0.6 },
    ],
  },
  {
    name: 'terror_shock', weight: 2, // 9.11テロ2001: GD回復→再悪化
    phases: [
      { startMinute: 540, driftOverride: -0.0020, volMult: 2.5, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride:  0.0005, volMult: 1.2, meanRevStrength: 0.3 },
      { startMinute: 720, driftOverride:  0.0000, volMult: 0.8, meanRevStrength: 0.4 },
      { startMinute: 810, driftOverride: -0.0012, volMult: 1.8, meanRevStrength: 0.0 },
      { startMinute: 900, driftOverride: -0.0008, volMult: 1.5, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'war_relief_rally', weight: 2, // 湾岸戦争1991: 噂売り→事実買い
    phases: [
      { startMinute: 540, driftOverride: -0.0025, volMult: 3.0, meanRevStrength: 0.0 },
      { startMinute: 570, driftOverride:  0.0015, volMult: 2.5, meanRevStrength: 0.0 },
      { startMinute: 630, driftOverride:  0.0010, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 780, driftOverride: -0.0003, volMult: 1.0, meanRevStrength: 0.3 },
      { startMinute: 870, driftOverride:  0.0005, volMult: 0.8, meanRevStrength: 0.0 },
    ],
  },

  // ── 歴史的ショック — バブル・政策系 (3種) ──
  {
    name: 'bubble_pop', weight: 2, // ITバブル崩壊2000: 天井反転
    phases: [
      { startMinute: 540, driftOverride:  0.0010, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride:  0.0020, volMult: 2.0, meanRevStrength: 0.0 },
      { startMinute: 690, driftOverride:  0.0002, volMult: 1.0, meanRevStrength: 0.3 },
      { startMinute: 750, driftOverride: -0.0010, volMult: 1.8, meanRevStrength: 0.0 },
      { startMinute: 810, driftOverride: -0.0020, volMult: 2.5, meanRevStrength: 0.0 },
      { startMinute: 900, driftOverride: -0.0008, volMult: 2.0, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'tariff_shock', weight: 2, // トランプ関税ショック2025: 政策不確実性
    phases: [
      { startMinute: 540, driftOverride: -0.0018, volMult: 2.5, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride: -0.0010, volMult: 2.0, meanRevStrength: 0.0 },
      { startMinute: 690, driftOverride:  0.0005, volMult: 1.5, meanRevStrength: 0.2 },
      { startMinute: 780, driftOverride: -0.0012, volMult: 2.2, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride: -0.0005, volMult: 1.8, meanRevStrength: 0.0 },
    ],
  },
  {
    name: 'contagion_collapse', weight: 2, // チャイナショック2015: 海外発連鎖安
    phases: [
      { startMinute: 540, driftOverride: -0.0010, volMult: 2.0, meanRevStrength: 0.0 },
      { startMinute: 600, driftOverride:  0.0002, volMult: 1.0, meanRevStrength: 0.3 },
      { startMinute: 720, driftOverride: -0.0005, volMult: 1.5, meanRevStrength: 0.0 },
      { startMinute: 780, driftOverride: -0.0020, volMult: 2.8, meanRevStrength: 0.0 },
      { startMinute: 870, driftOverride: -0.0010, volMult: 2.0, meanRevStrength: 0.0 },
    ],
  },
] as const

/** レジーム別シナリオ出現バイアス（基本weightに乗算） */
export const SCENARIO_REGIME_BIAS: Record<RegimeName, Record<string, number>> = {
  bullish: {
    trend_follow: 2.0, ascending_staircase: 2.0, bull_flag: 2.0,
    war_relief_rally: 3.0, black_thursday: 3.0,
    descending_staircase: 0.3, bear_flag: 0.3, dead_cat_bounce: 0.3,
    cascade_crash: 0.1, pandemic_freefall: 0.1, circuit_breaker_crash: 0.1,
  },
  bearish: {
    trend_follow: 2.0, descending_staircase: 2.0, bear_flag: 2.0,
    contagion_collapse: 3.0, tariff_shock: 3.0, terror_shock: 3.0,
    ascending_staircase: 0.3, bull_flag: 0.3, cup_and_handle: 0.3,
    war_relief_rally: 0.1, bubble_pop: 0.1,
  },
  range: {
    range_bound: 2.5, quiet: 2.0, double_bottom: 2.0, double_top: 2.0,
    trend_follow: 0.3,
    cascade_crash: 0.1, circuit_breaker_crash: 0.1,
  },
  turbulent: {
    volatile_directionless: 2.5, selling_climax: 2.0, head_and_shoulders: 2.0,
    flash_crash: 3.0, volatility_explosion: 3.0, lehman_whipsaw: 3.0, peg_break: 3.0,
    quiet: 0.2, range_bound: 0.3,
  },
  bubble: {
    parabolic_blowoff: 2.5, ascending_staircase: 2.0, bull_flag: 2.0,
    bubble_pop: 3.0, war_relief_rally: 3.0,
    bear_flag: 0.3, dead_cat_bounce: 0.3,
    cascade_crash: 0.1, pandemic_freefall: 0.1,
  },
  crash: {
    selling_climax: 2.5, dead_cat_bounce: 2.0, descending_staircase: 2.0,
    cascade_crash: 3.0, circuit_breaker_crash: 3.0, pandemic_freefall: 3.0,
    lehman_whipsaw: 3.0, disaster_panic: 3.0,
    bull_flag: 0.2, ascending_staircase: 0.3,
    war_relief_rally: 0.1, bubble_pop: 0.1,
  },
}

/** 平均回帰パラメータ（比例値） */
export const MEAN_REVERSION = {
  threshold: 0.005,
  scale: 0.03,
  maxForcePct: 0.00083,
} as const

/** 極端イベントパラメータ（比例値） */
export const EXTREME_EVENT = {
  triggerProb: 0.0003,
  crashForcePct: -0.0027,
  meltUpForcePct: 0.0020,
  activeDurationMin: 8,
  activeDurationMax: 20,
  recoveryDurationMin: 12,
  recoveryDurationMax: 30,
  recoveryRatio: 0.6,
} as const
