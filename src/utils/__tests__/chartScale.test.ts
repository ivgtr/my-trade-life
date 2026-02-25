import { describe, it, expect } from 'vitest'
import { ensureMinPriceRange } from '../chartScale'
import type { AutoscaleInfo } from 'lightweight-charts'

function makeBase(min: number, max: number, margins?: AutoscaleInfo['margins']): AutoscaleInfo {
  return {
    priceRange: { minValue: min, maxValue: max },
    ...(margins ? { margins } : {}),
  } as AutoscaleInfo
}

describe('ensureMinPriceRange', () => {
  it('null入力 → null を返す', () => {
    expect(ensureMinPriceRange(null)).toBeNull()
  })

  it('priceRange null → そのまま返す', () => {
    const base = { priceRange: null } as unknown as AutoscaleInfo
    expect(ensureMinPriceRange(base)).toBe(base)
  })

  it('十分広い範囲 → 変更なし', () => {
    const base = makeBase(29700, 30300) // 幅600、mid=30000 → minHalf=150
    const result = ensureMinPriceRange(base)
    expect(result).toBe(base)
  })

  it('狭い範囲を拡張', () => {
    // mid=30000, 幅20 → currentHalf=10 < minHalf=150
    const base = makeBase(29990, 30010)
    const result = ensureMinPriceRange(base)!
    expect(result.priceRange!.minValue).toBe(30000 - 150)
    expect(result.priceRange!.maxValue).toBe(30000 + 150)
  })

  it('単一点データ（min=max） → 対称に拡張', () => {
    const base = makeBase(30000, 30000)
    const result = ensureMinPriceRange(base)!
    expect(result.priceRange!.minValue).toBe(30000 - 150)
    expect(result.priceRange!.maxValue).toBe(30000 + 150)
  })

  it('低価格時 → MIN_SCALE_RANGE_ABS (1円) が効く', () => {
    // mid=10, pct half = 10*0.01/2 = 0.05, abs half = 0.5 → max(0.05, 0.5) = 0.5
    const base = makeBase(10, 10)
    const result = ensureMinPriceRange(base)!
    expect(result.priceRange!.minValue).toBe(9.5)
    expect(result.priceRange!.maxValue).toBe(10.5)
  })

  it('margins が保持される', () => {
    const margins = { above: 0.3, below: 0.2 }
    const base = makeBase(30000, 30000, margins as AutoscaleInfo['margins'])
    const result = ensureMinPriceRange(base)!
    expect(result.margins).toEqual(margins)
  })
})
