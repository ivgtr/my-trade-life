import { describe, it, expect } from 'vitest'
import { Rng } from '../Rng'

describe('Rng', () => {
  it('next() は [0, 1) の値を返す', () => {
    const rng = new Rng(42)
    for (let i = 0; i < 10000; i++) {
      const v = rng.next()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('intInclusive(min, max) が min と max を含む', () => {
    const rng = new Rng(123)
    const seen = new Set<number>()
    for (let i = 0; i < 10000; i++) {
      seen.add(rng.intInclusive(3, 7))
    }
    expect(seen.has(3)).toBe(true)
    expect(seen.has(7)).toBe(true)
    for (const v of seen) {
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(7)
    }
  })

  it('gaussian() の分布が標準正規に近い（平均≈0, 分散≈1）', () => {
    const rng = new Rng(999)
    const N = 50000
    let sum = 0
    let sumSq = 0
    for (let i = 0; i < N; i++) {
      const v = rng.gaussian()
      sum += v
      sumSq += v * v
    }
    const mean = sum / N
    const variance = sumSq / N - mean * mean
    expect(mean).toBeCloseTo(0, 1)
    expect(variance).toBeCloseTo(1, 1)
  })

  it('同一seed → 同一系列の再現性', () => {
    const rng1 = new Rng(42)
    const rng2 = new Rng(42)
    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next())
    }
  })

  it('chance(0) は常に false、chance(1) は常に true', () => {
    const rng = new Rng(42)
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false)
    }
    const rng2 = new Rng(42)
    for (let i = 0; i < 100; i++) {
      expect(rng2.chance(1)).toBe(true)
    }
  })

  it('jitter(center, spread) が [center - spread/2, center + spread/2) 内', () => {
    const rng = new Rng(42)
    for (let i = 0; i < 10000; i++) {
      const v = rng.jitter(5.0, 2.0)
      expect(v).toBeGreaterThanOrEqual(4.0)
      expect(v).toBeLessThan(6.0)
    }
  })

  it('range(min, max) が [min, max) 内', () => {
    const rng = new Rng(42)
    for (let i = 0; i < 10000; i++) {
      const v = rng.range(3, 7)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThan(7)
    }
  })
})
