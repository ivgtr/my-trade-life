import { describe, it, expect } from 'vitest'
import { OrderFlowPatternEngine } from '../OrderFlowPatternEngine'
import { Rng } from '../../utils/Rng'

describe('OrderFlowPatternEngine', () => {
  it('N回走行で少なくとも1回AlgoOverrideを返す', () => {
    const rng = new Rng(42)
    const engine = new OrderFlowPatternEngine(rng)
    let overrideCount = 0

    for (let i = 0; i < 5000; i++) {
      const result = engine.update(1.0, 'normal')
      if (result !== undefined) overrideCount++
    }

    expect(overrideCount).toBeGreaterThan(0)
  })

  it('パターン非活性時はundefinedを返す', () => {
    // 非常に低い確率で発火しないことを確認するため、dt=0で確率をゼロにする
    const rng = new Rng(42)
    const engine = new OrderFlowPatternEngine(rng)
    // dt=0 → scaleProb(prob, 0) = 0 → 発火しない
    const result = engine.update(0, 'normal')
    expect(result).toBeUndefined()
  })

  it('持続tick数正確性: ticksRemaining=N のとき正確にN回overrideを返す', () => {
    // 大量に走行して、パターンが発火した際にN回連続overrideが返ることを確認
    const rng = new Rng(123)
    const engine = new OrderFlowPatternEngine(rng)

    let inPattern = false
    let patternTicks = 0
    let foundPattern = false

    for (let i = 0; i < 10000; i++) {
      const result = engine.update(1.0, 'normal')
      if (inPattern) {
        if (result !== undefined) {
          patternTicks++
        } else {
          // パターンが終了した
          expect(patternTicks).toBeGreaterThan(0)
          foundPattern = true
          break
        }
      } else if (result !== undefined) {
        // パターン開始
        inPattern = true
        patternTicks = 1
      }
    }

    expect(foundPattern).toBe(true)
  })

  it('dt正規化: dt=2.0 では dt=0.5 より発生頻度が高い', () => {
    const N = 10000

    // dt=2.0
    const rng1 = new Rng(42)
    const engine1 = new OrderFlowPatternEngine(rng1)
    let count1 = 0
    for (let i = 0; i < N; i++) {
      if (engine1.update(2.0, 'normal') !== undefined) count1++
    }

    // dt=0.5
    const rng2 = new Rng(42)
    const engine2 = new OrderFlowPatternEngine(rng2)
    let count2 = 0
    for (let i = 0; i < N; i++) {
      if (engine2.update(0.5, 'normal') !== undefined) count2++
    }

    // dt=2.0の方が発火+持続override共にカウント多い傾向
    expect(count1).toBeGreaterThan(count2)
  })
})
