import { describe, it, expect } from 'vitest'
import { buildMonthlySummary } from '../calendarSummary'
import type { DayHistoryEntry } from '../../types/calendar'

function entry(date: string, pnl: number, trades: number, wins: number): DayHistoryEntry {
  return { date, pnl, trades, wins, balance: 1000000 }
}

describe('buildMonthlySummary', () => {
  it('対象月のデータのみを抽出して集計する', () => {
    const history: DayHistoryEntry[] = [
      entry('2025-03-31', 5000, 3, 2),
      entry('2025-04-01', 10000, 5, 3),
      entry('2025-04-02', -3000, 2, 0),
      entry('2025-05-01', 8000, 4, 2),
    ]
    const target = new Date(2025, 3, 3) // 4月

    const result = buildMonthlySummary(history, target)

    expect(result.monthHistory).toHaveLength(2)
    expect(result.totalPnL).toBe(7000)
    expect(result.totalTrades).toBe(7)
    expect(result.totalWins).toBe(3)
    expect(result.winRate).toBeCloseTo(3 / 7)
  })

  it('年跨ぎで前年同月のデータが混入しない', () => {
    const history: DayHistoryEntry[] = [
      entry('2024-04-01', 20000, 10, 8),
      entry('2025-04-01', 5000, 3, 2),
    ]
    const target = new Date(2025, 3, 1)

    const result = buildMonthlySummary(history, target)

    expect(result.monthHistory).toHaveLength(1)
    expect(result.totalPnL).toBe(5000)
  })

  it('当日セッション分を合算する', () => {
    const history: DayHistoryEntry[] = [
      entry('2025-04-01', 10000, 5, 3),
    ]
    const target = new Date(2025, 3, 2)

    const result = buildMonthlySummary(history, target, {
      pnl: 2000,
      trades: 2,
      wins: 1,
    })

    expect(result.totalPnL).toBe(12000)
    expect(result.totalTrades).toBe(7)
    expect(result.totalWins).toBe(4)
    expect(result.winRate).toBeCloseTo(4 / 7)
  })

  it('trades=0のとき勝率が0になる', () => {
    const result = buildMonthlySummary([], new Date(2025, 3, 1))

    expect(result.winRate).toBe(0)
    expect(result.totalTrades).toBe(0)
  })

  it('空のdailyHistoryでエラーにならない', () => {
    const result = buildMonthlySummary([], new Date(2025, 3, 1))

    expect(result.monthHistory).toHaveLength(0)
    expect(result.totalPnL).toBe(0)
    expect(result.totalTrades).toBe(0)
    expect(result.totalWins).toBe(0)
  })

  it('dateがnullのエントリをスキップする', () => {
    const history: DayHistoryEntry[] = [
      { date: null, pnl: 5000, trades: 2, wins: 1, balance: 1000000 },
      entry('2025-04-01', 3000, 1, 1),
    ]
    const target = new Date(2025, 3, 1)

    const result = buildMonthlySummary(history, target)

    expect(result.monthHistory).toHaveLength(1)
    expect(result.totalPnL).toBe(3000)
  })
})
