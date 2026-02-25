import type { AutoscaleInfo } from 'lightweight-charts'

/** 最小表示幅: 価格の1% */
const MIN_SCALE_RANGE_PCT = 0.01

/** 最小絶対幅（円）— 極端な低価格時のフォールバック */
const MIN_SCALE_RANGE_ABS = 1

/**
 * autoScale の価格範囲が狭すぎる場合、最小幅まで対称に拡張する。
 * lightweight-charts の autoscaleInfoProvider コールバック内で使う。
 */
export function ensureMinPriceRange(
  base: AutoscaleInfo | null,
): AutoscaleInfo | null {
  if (!base?.priceRange) return base

  const { minValue, maxValue } = base.priceRange
  const mid = (minValue + maxValue) / 2
  const currentHalf = (maxValue - minValue) / 2
  const minHalf = Math.max(
    (Math.abs(mid) * MIN_SCALE_RANGE_PCT) / 2,
    MIN_SCALE_RANGE_ABS / 2,
  )

  if (currentHalf >= minHalf) return base

  return {
    ...base,
    priceRange: {
      minValue: mid - minHalf,
      maxValue: mid + minHalf,
    },
  }
}
