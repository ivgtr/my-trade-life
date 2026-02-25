import { describe, it, expect } from 'vitest'
import { TradingEngine } from '../TradingEngine'

function createEngine(balance = 1_000_000, maxLeverage = 1) {
  return new TradingEngine({ balance, maxLeverage })
}

describe('TradingEngine.openPosition', () => {
  it('LONGポジションが正しく生成される', () => {
    const engine = createEngine()
    const pos = engine.openPosition('LONG', 10, 30000)

    expect(pos).not.toBeNull()
    expect(pos!.direction).toBe('LONG')
    expect(pos!.shares).toBe(10)
    expect(pos!.entryPrice).toBe(30000)
  })

  it('SHORTポジションが正しく生成される', () => {
    const engine = createEngine()
    const pos = engine.openPosition('SHORT', 5, 30000)

    expect(pos).not.toBeNull()
    expect(pos!.direction).toBe('SHORT')
    expect(pos!.shares).toBe(5)
    expect(pos!.entryPrice).toBe(30000)
  })

  it('不正なdirectionでnullが返る', () => {
    const engine = createEngine()
    // @ts-expect-error -- 不正な値を意図的に渡す
    const pos = engine.openPosition('INVALID', 10, 30000)

    expect(pos).toBeNull()
  })

  it('残高不足でnullが返る', () => {
    const engine = createEngine(10000)
    const pos = engine.openPosition('LONG', 100, 30000)

    expect(pos).toBeNull()
  })
})
