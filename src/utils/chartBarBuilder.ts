import type { CandlestickData, WhitespaceData, UTCTimestamp } from 'lightweight-charts'
import type { TickData, Timeframe } from '../types'
import { asGameMinutes, toBarTime, SESSION_START_SECONDS, SESSION_END_SECONDS } from './chartTime'
import { SESSION_START_MINUTES, SESSION_END_MINUTES, isDuringLunch, isDuringLunchSeconds } from '../constants/sessionTime'

export type BarEntry = CandlestickData | WhitespaceData

/** セッション全体のWhitespaceDataタイムラインを生成 */
export function generateSessionTimeline(tf: Timeframe): WhitespaceData[] {
  const step = tf * 60
  const entries: WhitespaceData[] = []
  for (let t = SESSION_START_SECONDS; t <= SESSION_END_SECONDS; t += step) {
    if (isDuringLunchSeconds(t)) continue
    entries.push({ time: t as UTCTimestamp })
  }
  return entries
}

/** 単一tickをバーにマージ */
export function mergeTickIntoBar(
  existing: CandlestickData | null, tick: TickData, barTime: UTCTimestamp,
): CandlestickData {
  if (existing) {
    return {
      ...existing,
      high: Math.max(existing.high, tick.high),
      low: Math.min(existing.low, tick.low),
      close: tick.price,
    }
  }
  return { time: barTime, open: tick.price, high: tick.high, low: tick.low, close: tick.price }
}

/** tick履歴からタイムラインベースのバー配列を構築 */
export function buildBars(history: TickData[], tf: Timeframe): BarEntry[] {
  const timeline = generateSessionTimeline(tf)
  const barMap = new Map<number, CandlestickData>()
  for (const tick of history) {
    if (tick.timestamp < SESSION_START_MINUTES || tick.timestamp > SESSION_END_MINUTES) continue
    if (isDuringLunch(tick.timestamp)) continue
    const barTime = toBarTime(asGameMinutes(tick.timestamp), tf)
    barMap.set(barTime, mergeTickIntoBar(barMap.get(barTime) ?? null, tick, barTime))
  }
  return timeline.map(entry => barMap.get(entry.time as number) ?? entry)
}
