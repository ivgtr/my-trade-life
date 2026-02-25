import { describe, it, expect } from 'vitest'
import { parseLocalDate, formatDateShort } from '../formatUtils'

describe('parseLocalDate', () => {
  it('YYYY-MM-DD文字列をローカルタイムゾーンのDateに変換する', () => {
    const date = parseLocalDate('2025-04-01')
    expect(date.getFullYear()).toBe(2025)
    expect(date.getMonth()).toBe(3) // 0-indexed
    expect(date.getDate()).toBe(1)
  })

  it('年末の境界ケースを正しく処理する', () => {
    const date = parseLocalDate('2025-12-31')
    expect(date.getFullYear()).toBe(2025)
    expect(date.getMonth()).toBe(11)
    expect(date.getDate()).toBe(31)
  })

  it('年始の境界ケースを正しく処理する', () => {
    const date = parseLocalDate('2026-01-01')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(0)
    expect(date.getDate()).toBe(1)
  })
})

describe('formatDateShort', () => {
  it('「M/D(曜日)」形式でフォーマットする', () => {
    // 2025-04-01 は火曜日
    const date = new Date(2025, 3, 1)
    expect(formatDateShort(date)).toBe('4/1(火)')
  })

  it('日曜日を正しくフォーマットする', () => {
    // 2025-04-06 は日曜日
    const date = new Date(2025, 3, 6)
    expect(formatDateShort(date)).toBe('4/6(日)')
  })

  it('12月の日付をフォーマットする', () => {
    // 2025-12-31 は水曜日
    const date = new Date(2025, 11, 31)
    expect(formatDateShort(date)).toBe('12/31(水)')
  })
})
