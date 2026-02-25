import type { DayHistoryEntry } from '../types/calendar'
import { parseLocalDate } from './formatUtils'

export interface MonthlySummary {
  monthHistory: { pnl: number }[]
  totalPnL: number
  totalTrades: number
  totalWins: number
  winRate: number
}

/**
 * dailyHistoryからtargetDateの年月のデータを抽出し、月次統計を算出する。
 * session引数で当日セッション分を合算可能。
 */
export function buildMonthlySummary(
  dailyHistory: DayHistoryEntry[],
  targetDate: Date,
  session?: { pnl: number; trades: number; wins: number },
): MonthlySummary {
  const targetYear = targetDate.getFullYear()
  const targetMonth = targetDate.getMonth()

  const monthHistory = dailyHistory.filter((d) => {
    if (!d.date) return false
    const date = parseLocalDate(d.date)
    return date.getFullYear() === targetYear && date.getMonth() === targetMonth
  })

  let totalPnL = monthHistory.reduce((sum, d) => sum + d.pnl, 0)
  let totalTrades = monthHistory.reduce((sum, d) => sum + d.trades, 0)
  let totalWins = monthHistory.reduce((sum, d) => sum + d.wins, 0)

  if (session) {
    totalPnL += session.pnl
    totalTrades += session.trades
    totalWins += session.wins
  }

  const winRate = totalTrades > 0 ? totalWins / totalTrades : 0

  return {
    monthHistory: monthHistory.map((d) => ({ pnl: d.pnl })),
    totalPnL,
    totalTrades,
    totalWins,
    winRate,
  }
}
