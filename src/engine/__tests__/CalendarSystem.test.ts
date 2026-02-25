import { describe, it, expect } from 'vitest'
import { CalendarSystem } from '../CalendarSystem'

describe('CalendarSystem', () => {
  describe('serialize → constructor ラウンドトリップ', () => {
    it('日付がタイムゾーン安全に保持される', () => {
      const cal = new CalendarSystem()
      cal.initializeStartDate()

      const serialized = cal.serialize()
      const restored = new CalendarSystem(serialized)

      expect(restored.getCurrentDate()).toBe(cal.getCurrentDate())
    })

    it('advanceDay 後もラウンドトリップで一致する', () => {
      const cal = new CalendarSystem()
      cal.initializeStartDate()
      cal.advanceDay()
      cal.advanceDay()
      cal.advanceDay()

      const serialized = cal.serialize()
      const restored = new CalendarSystem(serialized)

      expect(restored.getCurrentDate()).toBe(cal.getCurrentDate())
    })
  })

  describe('getCurrentDate', () => {
    it('YYYY-MM-DD 形式を返す', () => {
      const cal = new CalendarSystem()
      cal.initializeStartDate()
      const dateStr = cal.getCurrentDate()
      expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('serialize', () => {
    it('currentDate と startDate が YYYY-MM-DD 形式', () => {
      const cal = new CalendarSystem()
      cal.initializeStartDate()
      const serialized = cal.serialize()
      expect(serialized.currentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(serialized.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('constructor with YYYY-MM-DD input', () => {
    it('YYYY-MM-DD 形式の入力を正しくパースする', () => {
      const cal = new CalendarSystem({
        currentDate: '2025-06-15',
        startDate: '2025-01-01',
        history: [],
      })
      expect(cal.getCurrentDate()).toBe('2025-06-15')
    })
  })
})
