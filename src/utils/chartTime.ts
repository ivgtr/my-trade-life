import type { UTCTimestamp } from 'lightweight-charts'
import type { Timeframe } from '../types'

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
