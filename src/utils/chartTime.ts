import type { UTCTimestamp, Time, TickMarkType } from 'lightweight-charts'
import type { Timeframe } from '../types'
import { SESSION_START_MINUTES, SESSION_END_MINUTES, isDuringLunchSeconds } from '../constants/sessionTime'

export const SESSION_START_SECONDS = SESSION_START_MINUTES * 60
export const SESSION_END_SECONDS = SESSION_END_MINUTES * 60

/** ブランド型: ゲーム内時刻（分単位, 540=09:00） */
export type GameMinutes = number & { readonly __gameMinutes: never }

/** number → GameMinutes（変換入口を限定する専用生成関数） */
export function asGameMinutes(value: number): GameMinutes {
  return value as GameMinutes
}

/** GameMinutes → バー境界に丸めたチャート用タイムスタンプ（唯一の単位変換境界） */
export function toBarTime(minutes: GameMinutes, tf: Timeframe): UTCTimestamp {
  const tfSeconds = tf * 60
  return (Math.floor((minutes * 60) / tfSeconds) * tfSeconds) as UTCTimestamp
}

/** チャート秒単位 → HH:MM表示（表示責務のみ） */
export function formatChartTime(chartSeconds: number): string {
  const totalMinutes = chartSeconds / 60
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(Math.floor(m)).padStart(2, '0')}`
}

/** Time型から秒値を抽出（入力正規化の単一責務） */
export function normalizeChartTime(time: Time): number | null {
  return typeof time === 'number' ? time : null
}

/** 候補となる「きれいな」間隔（分単位, 昇順） */
export const NICE_INTERVALS = [5, 10, 15, 30, 60] as const

/**
 * LogicalRangeから表示バー数を算出する。
 * ceil(to - from) + 1 で端点のバーも含めて計上する。
 */
export function toVisibleBarCount(range: { from: number; to: number }): number {
  return Math.max(1, Math.ceil(range.to - range.from) + 1)
}

/**
 * 表示中のバー数とTimeframeから最適なグリッド間隔(分)を計算する。
 * ラベル数が MAX_LABELS 以下になる最小の NICE_INTERVAL を返す。
 */
export function computeGridInterval(tf: Timeframe, visibleBars: number): number {
  const MAX_LABELS = 15
  const visibleMinutes = visibleBars * tf
  for (const interval of NICE_INTERVALS) {
    if (interval < tf) continue
    const labelCount = Math.floor(visibleMinutes / interval) + 1
    if (labelCount <= MAX_LABELS) return interval
  }
  return 60
}

/** セッション範囲内の指定間隔境界時刻を全生成（秒単位） */
export function generateBoundaryTimes(intervalMinutes: number): number[] {
  const stepSeconds = intervalMinutes * 60
  const times: number[] = []
  for (let t = SESSION_START_SECONDS; t <= SESSION_END_SECONDS; t += stepSeconds) {
    if (isDuringLunchSeconds(t)) continue
    times.push(t)
  }
  return times
}

/** tickMarkFormatter: 秒値→HH:MM変換のみ（ラベル密度はLW chartsに委任） */
export function tickMarkFormatter(time: Time, _tickMarkType: TickMarkType, _locale: string): string | null {
  const seconds = normalizeChartTime(time)
  if (seconds === null) return null
  return formatChartTime(seconds)
}

/** timeFormatter: クロスヘア表示用アダプタ（TimeFormatterFn<Time>準拠） */
export function chartTimeFormatter(time: Time): string {
  const seconds = normalizeChartTime(time)
  return seconds !== null ? formatChartTime(seconds) : '--:--'
}
