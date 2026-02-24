import { describe, it, expect } from 'vitest'
import { asGameMinutes, toBarTime, formatChartTime } from '../chartTime'

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
