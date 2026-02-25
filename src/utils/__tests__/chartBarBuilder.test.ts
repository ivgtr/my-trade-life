import { describe, it, expect } from 'vitest'
import type { CandlestickData, UTCTimestamp } from 'lightweight-charts'
import type { TickData } from '../../types'
import { toBarTime, asGameMinutes } from '../chartTime'
import {
  mergeTickIntoBar,
  generateSessionTimeline,
  buildBars,
} from '../chartBarBuilder'
import { LUNCH_START_MINUTES, LUNCH_END_MINUTES } from '../../constants/sessionTime'

function makeTick(timestamp: number, price: number, high?: number, low?: number): TickData {
  return {
    timestamp,
    price,
    high: high ?? price,
    low: low ?? price,
    volume: 100,
    volState: 'normal',
    timeZone: 'morning',
  } as TickData
}

function makeBar(time: number, open: number, high: number, low: number, close: number): CandlestickData {
  return { time: time as UTCTimestamp, open, high, low, close }
}

describe('mergeTickIntoBar', () => {
  it('existing=null → 新規バー作成', () => {
    const tick = makeTick(540, 100, 105, 95)
    const bar = mergeTickIntoBar(null, tick, 32400 as UTCTimestamp)
    expect(bar).toEqual({ time: 32400, open: 100, high: 105, low: 95, close: 100 })
  })

  it('existing有り → high=max, low=min, close=price, open保持', () => {
    const existing = makeBar(32400, 100, 105, 95, 102)
    const tick = makeTick(540, 110, 115, 90)
    const bar = mergeTickIntoBar(existing, tick, 32400 as UTCTimestamp)
    expect(bar.open).toBe(100)
    expect(bar.high).toBe(115)
    expect(bar.low).toBe(90)
    expect(bar.close).toBe(110)
  })
})

describe('generateSessionTimeline', () => {
  it('tf=1 → 332個、先頭=32400、末尾=55800', () => {
    const timeline = generateSessionTimeline(1)
    expect(timeline).toHaveLength(332)
    expect(timeline[0].time).toBe(32400)
    expect(timeline[timeline.length - 1].time).toBe(55800)
  })

  it('tf=5 → 68個', () => {
    const timeline = generateSessionTimeline(5)
    expect(timeline).toHaveLength(68)
  })

  it('tf=15 → 24個', () => {
    const timeline = generateSessionTimeline(15)
    expect(timeline).toHaveLength(24)
  })

  it('11:30の次エントリが12:30である（昼休み帯スキップ）', () => {
    const timeline = generateSessionTimeline(1)
    const lunchStartSeconds = LUNCH_START_MINUTES * 60 // 41400
    const lunchEndSeconds = LUNCH_END_MINUTES * 60     // 45000
    const lunchStartIdx = timeline.findIndex(e => (e.time as number) === lunchStartSeconds)
    expect(lunchStartIdx).toBeGreaterThan(-1)
    expect(timeline[lunchStartIdx + 1].time).toBe(lunchEndSeconds)
  })

  it('全エントリがWhitespaceData（openプロパティなし）', () => {
    const timeline = generateSessionTimeline(1)
    for (const entry of timeline) {
      expect('open' in entry).toBe(false)
    }
  })
})

describe('session timeline integrity', () => {
  it.each([1, 5, 15] as const)('tf=%i: セッション範囲内tickのbarTimeはタイムラインに存在', (tf) => {
    const timeline = generateSessionTimeline(tf)
    const timelineSet = new Set(timeline.map(e => e.time as number))

    for (const timestamp of [540, 690, 750, 930]) {
      const barTime = toBarTime(asGameMinutes(timestamp), tf)
      expect(timelineSet.has(barTime as number)).toBe(true)
    }
  })

  it.each([1, 5, 15] as const)('tf=%i: 昼休み帯(720=12:00)のbarTimeはタイムラインに含まれない', (tf) => {
    const timeline = generateSessionTimeline(tf)
    const timelineSet = new Set(timeline.map(e => e.time as number))
    const barTime = toBarTime(asGameMinutes(720), tf)
    expect(timelineSet.has(barTime as number)).toBe(false)
  })

  it('範囲外tick(539=08:59)のbarTimeはタイムラインに含まれない', () => {
    const timeline = generateSessionTimeline(1)
    const timelineSet = new Set(timeline.map(e => e.time as number))
    const barTime = toBarTime(asGameMinutes(539), 1)
    expect(timelineSet.has(barTime as number)).toBe(false)
  })

  it('範囲外tick(931=15:31) tf=15 → barTimeは15:30に丸められるが、timestamp判定で除外', () => {
    const barTime = toBarTime(asGameMinutes(931), 15)
    expect(barTime).toBe(55800) // 15:30に丸められる
    // buildBarsではtimestamp判定で除外される（別テストで検証）
  })
})

describe('buildBars', () => {
  it('tick履歴 → セッション全体のBarEntry配列（常にtf依存の固定長）', () => {
    const ticks = [
      makeTick(540, 100, 105, 95),     // 09:00
      makeTick(542, 108, 110, 106),    // 09:02
    ]
    const bars = buildBars(ticks, 1)
    expect(bars).toHaveLength(332) // tf=1のセッション全体（昼休み除外）
    expect((bars[0] as CandlestickData).open).toBe(100)
    expect('open' in bars[1]).toBe(false) // 09:01はWhitespaceData
    expect((bars[2] as CandlestickData).open).toBe(108)
  })

  it('同一バー内の複数tick → 正しくマージ', () => {
    const ticks = [
      makeTick(540, 100, 105, 95),
      makeTick(540.5, 102, 108, 93),
    ]
    const bars = buildBars(ticks, 1)
    expect(bars).toHaveLength(332)
    const bar = bars[0] as CandlestickData
    expect(bar.open).toBe(100)
    expect(bar.high).toBe(108)
    expect(bar.low).toBe(93)
    expect(bar.close).toBe(102)
  })

  it('空の履歴 → generateSessionTimelineと同一', () => {
    const bars = buildBars([], 1)
    const timeline = generateSessionTimeline(1)
    expect(bars).toEqual(timeline)
  })

  it('範囲外tick(539=08:59) → timestamp判定で明示除外、タイムライン長は変化なし', () => {
    const ticks = [makeTick(539, 100)]
    const bars = buildBars(ticks, 1)
    expect(bars).toHaveLength(332)
    // 全エントリがWhitespaceData（範囲外tickは除外されているため）
    for (const entry of bars) {
      expect('open' in entry).toBe(false)
    }
  })

  it('範囲外tick(931=15:31, tf=15) → barTimeは15:30に丸められるがtimestamp判定で除外', () => {
    const ticks = [makeTick(931, 100)]
    const bars = buildBars(ticks, 15)
    expect(bars).toHaveLength(24)
    // 15:30バー（末尾）もWhitespaceDataのまま
    const lastEntry = bars[bars.length - 1]
    expect('open' in lastEntry).toBe(false)
  })

  it('昼休みtick(720=12:00) → isDuringLunch判定で除外', () => {
    const ticks = [makeTick(540, 100), makeTick(720, 200)]
    const bars = buildBars(ticks, 1)
    expect(bars).toHaveLength(332)
    // 09:00バーにはデータあり
    expect('open' in bars[0]).toBe(true)
    // 昼休みtickはバーに反映されない — 全バーの中でprice=200のバーは存在しない
    const hasLunchBar = bars.some(b => 'close' in b && (b as CandlestickData).close === 200)
    expect(hasLunchBar).toBe(false)
  })
})
