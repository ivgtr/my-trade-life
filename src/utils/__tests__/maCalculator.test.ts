import { describe, it, expect } from 'vitest'
import type { CandlestickData, WhitespaceData, UTCTimestamp } from 'lightweight-charts'
import { computeMA } from '../maCalculator'
import type { BarEntry } from '../chartBarBuilder'

function bar(time: number, close: number): CandlestickData {
  return { time: time as UTCTimestamp, open: close, high: close + 1, low: close - 1, close }
}

function ws(time: number): WhitespaceData {
  return { time: time as UTCTimestamp }
}

describe('computeMA', () => {
  it('空バー配列 → 空配列を返す', () => {
    expect(computeMA([], 5)).toEqual([])
  })

  it('全WhitespaceData → 全てWhitespaceDataを返す', () => {
    const bars: BarEntry[] = [ws(1), ws(2), ws(3)]
    const result = computeMA(bars, 3)
    expect(result).toHaveLength(3)
    for (const entry of result) {
      expect('value' in entry).toBe(false)
    }
  })

  it('バー数 < period → 全てWhitespaceDataを返す', () => {
    const bars: BarEntry[] = [bar(1, 100), bar(2, 200)]
    const result = computeMA(bars, 5)
    expect(result).toHaveLength(2)
    for (const entry of result) {
      expect('value' in entry).toBe(false)
    }
  })

  it('バー数 = period → 最後の1点のみLineData', () => {
    const bars: BarEntry[] = [bar(1, 10), bar(2, 20), bar(3, 30)]
    const result = computeMA(bars, 3)
    expect(result).toHaveLength(3)
    expect('value' in result[0]).toBe(false)
    expect('value' in result[1]).toBe(false)
    expect('value' in result[2]).toBe(true)
    expect((result[2] as { value: number }).value).toBe(20) // (10+20+30)/3
  })

  it('通常ケース: SMA値の正確性', () => {
    const bars: BarEntry[] = [
      bar(1, 10),
      bar(2, 20),
      bar(3, 30),
      bar(4, 40),
      bar(5, 50),
    ]
    const result = computeMA(bars, 3)

    // 期間不足
    expect('value' in result[0]).toBe(false)
    expect('value' in result[1]).toBe(false)

    // bar[2]: (10+20+30)/3 = 20
    expect((result[2] as { value: number }).value).toBe(20)
    // bar[3]: (20+30+40)/3 = 30
    expect((result[3] as { value: number }).value).toBe(30)
    // bar[4]: (30+40+50)/3 = 40
    expect((result[4] as { value: number }).value).toBe(40)
  })

  it('入出力長一致: 入力と出力の配列長が常に同一', () => {
    const bars: BarEntry[] = [bar(1, 100), bar(2, 200), ws(3), bar(4, 300), bar(5, 400)]
    const result = computeMA(bars, 2)
    expect(result).toHaveLength(bars.length)
  })

  it('WhitespaceData散在: WhitespaceData位置が入力と一致', () => {
    const bars: BarEntry[] = [
      bar(1, 100),
      ws(2),       // WhitespaceData
      bar(3, 200),
      bar(4, 300),
      ws(5),       // WhitespaceData
      bar(6, 400),
    ]
    const result = computeMA(bars, 2)
    expect(result).toHaveLength(6)

    // ws位置はWhitespaceDataのまま
    expect('value' in result[1]).toBe(false)
    expect('value' in result[4]).toBe(false)

    // CandlestickDataの計算はCandlestickDataのみ対象
    // bar[0]: close=100, count=1 < period=2 → WhitespaceData
    expect('value' in result[0]).toBe(false)
    // bar[2]: close=200, count=2 ≥ period=2 → (100+200)/2 = 150
    expect((result[2] as { value: number }).value).toBe(150)
    // bar[3]: close=300, count=3 → (200+300)/2 = 250
    expect((result[3] as { value: number }).value).toBe(250)
    // bar[5]: close=400, count=4 → (300+400)/2 = 350
    expect((result[5] as { value: number }).value).toBe(350)
  })
})
