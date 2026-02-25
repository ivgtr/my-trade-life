import { describe, it, expect } from 'vitest'
import { TickMarkType } from 'lightweight-charts'
import type { UTCTimestamp } from 'lightweight-charts'
import {
  asGameMinutes,
  toBarTime,
  formatChartTime,
  normalizeChartTime,
  tickMarkFormatter,
  chartTimeFormatter,
  generateBoundaryTimes,
  toVisibleBarCount,
  computeGridInterval,
  SESSION_START_SECONDS,
  SESSION_END_SECONDS,
} from '../chartTime'

describe('SESSION_START_SECONDS / SESSION_END_SECONDS', () => {
  it('SESSION_START_SECONDS === 32400', () => {
    expect(SESSION_START_SECONDS).toBe(32400)
  })

  it('SESSION_END_SECONDS === 55800', () => {
    expect(SESSION_END_SECONDS).toBe(55800)
  })
})

describe('toBarTime', () => {
  it('540分(09:00) tf=1 → 32400秒', () => {
    expect(toBarTime(asGameMinutes(540), 1)).toBe(32400)
  })

  it('540.5分 tf=1 → 32400秒（分内は同一バー）', () => {
    expect(toBarTime(asGameMinutes(540.5), 1)).toBe(32400)
  })

  it('541分(09:01) tf=1 → 32460秒', () => {
    expect(toBarTime(asGameMinutes(541), 1)).toBe(32460)
  })

  it('544.9分 tf=5 → 32400秒（09:00バー）', () => {
    expect(toBarTime(asGameMinutes(544.9), 5)).toBe(32400)
  })

  it('545分(09:05) tf=5 → 32700秒', () => {
    expect(toBarTime(asGameMinutes(545), 5)).toBe(32700)
  })

  it('554.9分 tf=15 → 32400秒（09:00バー）', () => {
    expect(toBarTime(asGameMinutes(554.9), 15)).toBe(32400)
  })

  it('555分(09:15) tf=15 → 33300秒', () => {
    expect(toBarTime(asGameMinutes(555), 15)).toBe(33300)
  })

  it('930分(15:30) tf=1 → 55800秒（終端）', () => {
    expect(toBarTime(asGameMinutes(930), 1)).toBe(55800)
  })
})

describe('formatChartTime', () => {
  it('32400秒 → "09:00"', () => {
    expect(formatChartTime(32400)).toBe('09:00')
  })

  it('55800秒 → "15:30"', () => {
    expect(formatChartTime(55800)).toBe('15:30')
  })

  it('45000秒 → "12:30"', () => {
    expect(formatChartTime(45000)).toBe('12:30')
  })

  it('32460秒 → "09:01"', () => {
    expect(formatChartTime(32460)).toBe('09:01')
  })
})

describe('normalizeChartTime', () => {
  it('number(32400) → 32400', () => {
    expect(normalizeChartTime(32400 as UTCTimestamp)).toBe(32400)
  })

  it('BusinessDayオブジェクト → null', () => {
    expect(normalizeChartTime({ year: 2026, month: 1, day: 1 })).toBeNull()
  })

  it('文字列 → null', () => {
    expect(normalizeChartTime('2026-01-01' as unknown as import('lightweight-charts').Time)).toBeNull()
  })
})

describe('toVisibleBarCount', () => {
  it('{ from: 0, to: 79 } → 80（整数境界で正確計上）', () => {
    expect(toVisibleBarCount({ from: 0, to: 79 })).toBe(80)
  })

  it('{ from: -0.5, to: 78.5 } → 80（端数境界で安全側）', () => {
    expect(toVisibleBarCount({ from: -0.5, to: 78.5 })).toBe(80)
  })

  it('{ from: 0.5, to: 79.5 } → 80', () => {
    expect(toVisibleBarCount({ from: 0.5, to: 79.5 })).toBe(80)
  })

  it('{ from: 0, to: 0 } → 1（最小値保証）', () => {
    expect(toVisibleBarCount({ from: 0, to: 0 })).toBe(1)
  })

  it('{ from: 10, to: 50 } → 41', () => {
    expect(toVisibleBarCount({ from: 10, to: 50 })).toBe(41)
  })

  it('{ from: 0, to: 0.5 } → 2（ceil(0.5)+1=2）', () => {
    expect(toVisibleBarCount({ from: 0, to: 0.5 })).toBe(2)
  })
})

describe('組み合わせ閾値テスト（toVisibleBarCount × computeGridInterval）', () => {
  it('tf=1, range {0, 73}: bars=74 → interval=5', () => {
    const bars = toVisibleBarCount({ from: 0, to: 73 })
    expect(bars).toBe(74)
    expect(computeGridInterval(1, bars)).toBe(5)
  })

  it('tf=1, range {0, 74}: bars=75 → interval=10（5→10の切替境界）', () => {
    const bars = toVisibleBarCount({ from: 0, to: 74 })
    expect(bars).toBe(75)
    expect(computeGridInterval(1, bars)).toBe(10)
  })

  it('tf=1, range {0, 149}: bars=150 → interval=15（10→15の切替境界）', () => {
    const bars = toVisibleBarCount({ from: 0, to: 149 })
    expect(bars).toBe(150)
    expect(computeGridInterval(1, bars)).toBe(15)
  })
})

describe('computeGridInterval', () => {
  it('tf=1, 51 bars → 5', () => {
    expect(computeGridInterval(1, 51)).toBe(5)
  })

  it('tf=1, 75 bars → 10（5→10の切替境界）', () => {
    expect(computeGridInterval(1, 75)).toBe(10)
  })

  it('tf=1, 150 bars → 15（10→15の切替境界）', () => {
    expect(computeGridInterval(1, 150)).toBe(15)
  })

  it('tf=1, 392 bars → 30（全体表示相当）', () => {
    expect(computeGridInterval(1, 392)).toBe(30)
  })

  it('tf=5, 21 bars → 10', () => {
    expect(computeGridInterval(5, 21)).toBe(10)
  })

  it('tf=5, 41 bars → 15', () => {
    expect(computeGridInterval(5, 41)).toBe(15)
  })

  it('tf=5, 80 bars → 30', () => {
    expect(computeGridInterval(5, 80)).toBe(30)
  })

  it('tf=15, 11 bars → 15', () => {
    expect(computeGridInterval(15, 11)).toBe(15)
  })

  it('tf=15, 28 bars → 30（旧60→30に改善）', () => {
    expect(computeGridInterval(15, 28)).toBe(30)
  })

  it('tf=15, 1 bar → 15（最小interval=tf）', () => {
    expect(computeGridInterval(15, 1)).toBe(15)
  })

  it('tf=1, 1000 bars → 60（候補上限）', () => {
    expect(computeGridInterval(1, 1000)).toBe(60)
  })

  it('tf=15 → 返り値は常に15以上', () => {
    for (const bars of [1, 10, 20, 50, 100]) {
      expect(computeGridInterval(15, bars)).toBeGreaterThanOrEqual(15)
    }
  })
})


describe('generateBoundaryTimes', () => {
  it('interval=15 → 24個（09:00〜15:30の15分刻み、昼休み除外）', () => {
    const times = generateBoundaryTimes(15)
    expect(times).toHaveLength(24)
    expect(times[0]).toBe(32400)   // 09:00
    expect(times[times.length - 1]).toBe(55800)  // 15:30
  })

  it('interval=30 → 13個（09:00〜15:30の30分刻み、昼休み除外）', () => {
    const times = generateBoundaryTimes(30)
    expect(times).toHaveLength(13)
  })

  it('interval=60 → 6個（09:00〜15:00の60分刻み、昼休み除外）', () => {
    const times = generateBoundaryTimes(60)
    expect(times).toHaveLength(6)
  })

  it('昼休み帯の時刻が含まれない', () => {
    const times15 = generateBoundaryTimes(15)
    const lunchTimes = [41700, 42600, 43500, 44400] // 11:35, 11:50, 12:05, 12:20 (秒)
    for (const lt of lunchTimes) {
      expect(times15).not.toContain(lt)
    }
  })
})

describe('tickMarkFormatter', () => {
  it('32400(09:00) → "09:00"', () => {
    expect(tickMarkFormatter(32400 as UTCTimestamp, TickMarkType.Time, 'ja')).toBe('09:00')
  })

  it('32700(09:05) → "09:05"', () => {
    expect(tickMarkFormatter(32700 as UTCTimestamp, TickMarkType.Time, 'ja')).toBe('09:05')
  })

  it('36000(10:00) → "10:00"', () => {
    expect(tickMarkFormatter(36000 as UTCTimestamp, TickMarkType.Time, 'ja')).toBe('10:00')
  })

  it('BusinessDay → null（非数値入力）', () => {
    expect(tickMarkFormatter({ year: 2026, month: 1, day: 1 }, TickMarkType.Time, 'ja')).toBeNull()
  })
})

describe('chartTimeFormatter', () => {
  it('number(32400) → "09:00"', () => {
    expect(chartTimeFormatter(32400 as UTCTimestamp)).toBe('09:00')
  })

  it('BusinessDayオブジェクト → "--:--"', () => {
    expect(chartTimeFormatter({ year: 2026, month: 1, day: 1 })).toBe('--:--')
  })
})
