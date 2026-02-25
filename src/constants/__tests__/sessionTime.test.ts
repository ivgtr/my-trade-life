import { describe, it, expect } from 'vitest'
import { isDuringLunch, isDuringLunchSeconds } from '../sessionTime'

describe('isDuringLunch', () => {
  it('689 → false（11:29、昼休み前）', () => {
    expect(isDuringLunch(689)).toBe(false)
  })

  it('690 → false（11:30ちょうど = 前場最終、含まない）', () => {
    expect(isDuringLunch(690)).toBe(false)
  })

  it('691 → true（11:31、昼休み内）', () => {
    expect(isDuringLunch(691)).toBe(true)
  })

  it('720 → true（12:00、昼休み中央）', () => {
    expect(isDuringLunch(720)).toBe(true)
  })

  it('749 → true（12:29、昼休み内）', () => {
    expect(isDuringLunch(749)).toBe(true)
  })

  it('750 → false（12:30ちょうど = 後場開始、含まない）', () => {
    expect(isDuringLunch(750)).toBe(false)
  })

  it('751 → false（12:31、昼休み後）', () => {
    expect(isDuringLunch(751)).toBe(false)
  })
})

describe('isDuringLunchSeconds', () => {
  it('41400 (690*60) → false', () => {
    expect(isDuringLunchSeconds(41400)).toBe(false)
  })

  it('41460 (691*60) → true', () => {
    expect(isDuringLunchSeconds(41460)).toBe(true)
  })

  it('44940 (749*60) → true', () => {
    expect(isDuringLunchSeconds(44940)).toBe(true)
  })

  it('45000 (750*60) → false', () => {
    expect(isDuringLunchSeconds(45000)).toBe(false)
  })
})
