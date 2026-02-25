import type { LineData, WhitespaceData } from 'lightweight-charts'
import type { BarEntry } from './chartBarBuilder'

export type MALineEntry = LineData | WhitespaceData

/**
 * バー配列からSMA（単純移動平均）を計算する。
 * 入力と出力は1:1対応:
 * - bars[i]がWhitespaceData → 出力[i]もWhitespaceData
 * - bars[i]がCandlestickDataだが期間不足 → WhitespaceData
 * - bars[i]がCandlestickDataで期間充足 → LineData { time, value }
 */
export function computeMA(bars: BarEntry[], period: number): MALineEntry[] {
  const result: MALineEntry[] = []
  const closes: number[] = []

  let runningSum = 0

  for (const bar of bars) {
    if (!('close' in bar)) {
      // WhitespaceData: そのまま伝搬
      result.push({ time: bar.time })
      continue
    }

    closes.push(bar.close)
    runningSum += bar.close

    if (closes.length < period) {
      result.push({ time: bar.time })
    } else {
      if (closes.length > period) {
        runningSum -= closes[closes.length - period - 1]
      }
      result.push({ time: bar.time, value: runningSum / period })
    }
  }

  return result
}
