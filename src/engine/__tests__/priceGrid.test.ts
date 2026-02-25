import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { tickUnit, roundToTick, floorToTick, ceilToTick, roundPrice, MIN_PRICE } from '../priceGrid'
import { MarketEngine } from '../MarketEngine'
import { TradingEngine } from '../TradingEngine'
import { calcGap } from '../marketParams'
import type { MarketEngineConfig, TickData } from '../../types/market'

// ─── priceGrid 単体テスト ───

describe('tickUnit', () => {
  it('≤ 3,000 → 1円', () => {
    expect(tickUnit(1)).toBe(1)
    expect(tickUnit(100)).toBe(1)
    expect(tickUnit(3000)).toBe(1)
  })

  it('≤ 5,000 → 5円', () => {
    expect(tickUnit(3001)).toBe(5)
    expect(tickUnit(5000)).toBe(5)
  })

  it('≤ 30,000 → 10円', () => {
    expect(tickUnit(5001)).toBe(10)
    expect(tickUnit(30000)).toBe(10)
  })

  it('≤ 50,000 → 50円', () => {
    expect(tickUnit(30001)).toBe(50)
    expect(tickUnit(50000)).toBe(50)
  })

  it('≤ 100,000 → 100円', () => {
    expect(tickUnit(50001)).toBe(100)
    expect(tickUnit(100000)).toBe(100)
  })

  it('≤ 300,000 → 500円', () => {
    expect(tickUnit(100001)).toBe(500)
    expect(tickUnit(300000)).toBe(500)
  })

  it('> 300,000 → 1,000円', () => {
    expect(tickUnit(300001)).toBe(1000)
    expect(tickUnit(500000)).toBe(1000)
  })
})

describe('roundToTick', () => {
  it('正値を最寄りのtick倍数に丸める', () => {
    expect(roundToTick(7, 5)).toBe(5)
    expect(roundToTick(8, 5)).toBe(10)
    expect(roundToTick(10, 5)).toBe(10)
    expect(roundToTick(12, 5)).toBe(10)
    expect(roundToTick(13, 5)).toBe(15)
  })

  it('負値を対称に丸める', () => {
    expect(roundToTick(-7, 5)).toBe(-5)
    expect(roundToTick(-8, 5)).toBe(-10)
    expect(roundToTick(-10, 5)).toBe(-10)
  })

  it('境界値（±2.5）を正しく丸める', () => {
    expect(roundToTick(2.5, 5)).toBe(5)
    expect(roundToTick(-2.5, 5)).toBe(-5)
  })

  it('ゼロはゼロのまま', () => {
    expect(roundToTick(0, 5)).toBe(0)
  })

  it('tick=10で丸める', () => {
    expect(roundToTick(24, 10)).toBe(20)
    expect(roundToTick(25, 10)).toBe(30)
    expect(roundToTick(30, 10)).toBe(30)
  })

  it('tick=50で丸める', () => {
    expect(roundToTick(120, 50)).toBe(100)
    expect(roundToTick(125, 50)).toBe(150)
  })
})

describe('floorToTick', () => {
  it('≤3000帯（tick=1）で切り下げ', () => {
    expect(floorToTick(2999.7)).toBe(2999)
    expect(floorToTick(3000)).toBe(3000)
  })

  it('≤30000帯（tick=10）で切り下げ', () => {
    expect(floorToTick(10007)).toBe(10000)
    expect(floorToTick(10010)).toBe(10010)
    expect(floorToTick(10011)).toBe(10010)
  })

  it('≤50000帯（tick=50）で切り下げ', () => {
    expect(floorToTick(30020)).toBe(30000)
    expect(floorToTick(30050)).toBe(30050)
  })
})

describe('ceilToTick', () => {
  it('≤3000帯（tick=1）で切り上げ', () => {
    expect(ceilToTick(2999.3)).toBe(3000)
    expect(ceilToTick(3000)).toBe(3000)
  })

  it('≤30000帯（tick=10）で切り上げ', () => {
    expect(ceilToTick(10001)).toBe(10010)
    expect(ceilToTick(10010)).toBe(10010)
    expect(ceilToTick(10011)).toBe(10020)
  })

  it('≤50000帯（tick=50）で切り上げ', () => {
    expect(ceilToTick(30001)).toBe(30050)
    expect(ceilToTick(30050)).toBe(30050)
  })
})

describe('roundPrice', () => {
  it('最小10円を保証する', () => {
    expect(roundPrice(3)).toBe(MIN_PRICE)
    expect(roundPrice(-100)).toBe(MIN_PRICE)
    expect(roundPrice(0)).toBe(MIN_PRICE)
  })

  it('≤3000帯（tick=1）で丸める', () => {
    expect(roundPrice(2999.4)).toBe(2999)
    expect(roundPrice(2999.6)).toBe(3000)
  })

  it('≤30000帯（tick=10）で丸める', () => {
    expect(roundPrice(10004)).toBe(10000)
    expect(roundPrice(10005)).toBe(10010)
    expect(roundPrice(10008)).toBe(10010)
  })

  it('≤50000帯（tick=50）で丸める', () => {
    expect(roundPrice(30020)).toBe(30000)
    expect(roundPrice(30025)).toBe(30050)
    expect(roundPrice(30040)).toBe(30050)
  })
})

// ─── MarketEngine 統合テスト ───

describe('MarketEngine 呼値整合', () => {
  const collectedTicks: TickData[] = []

  beforeAll(() => {
    vi.useFakeTimers()
    let seed = 42
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 0x100000000
    })

    const config: MarketEngineConfig = {
      openPrice: 30000,
      regimeParams: { drift: 0, volMult: 1.0, regime: 'range' },
      anomalyParams: { driftBias: 0, volBias: 1.0, tendency: '' },
      speed: 100,
      onTick: (tick) => collectedTicks.push(tick),
      onSessionEnd: vi.fn(),
    }

    const engine = new MarketEngine(config)
    engine.start()
    for (let i = 0; i < 200; i++) vi.advanceTimersByTime(10)
    engine.stop()
  })

  afterAll(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('全tickのprice/high/lowがそれぞれ自身の呼値の倍数である', () => {
    expect(collectedTicks.length).toBeGreaterThan(0)

    for (const tick of collectedTicks) {
      expect(tick.price % tickUnit(tick.price)).toBe(0)
      expect(tick.high % tickUnit(tick.high)).toBe(0)
      expect(tick.low % tickUnit(tick.low)).toBe(0)
      expect(tick.price).toBeGreaterThanOrEqual(MIN_PRICE)
      expect(tick.low).toBeGreaterThanOrEqual(MIN_PRICE)
    }
  })

  it('tickのhigh/lowがprice中心に概ね対称であること', () => {
    for (const tick of collectedTicks) {
      const upperWick = tick.high - tick.price
      const lowerWick = tick.price - tick.low
      // 境界跨ぎ: overshootが上位の呼値ゾーンに入り引き戻される非対称性を許容
      // high+1で次ゾーンのtickを確認（例: high=30000 → tickUnit(30001)=50）
      const tolerance = Math.max(tickUnit(tick.high + 1), tickUnit(tick.low))
      expect(Math.abs(upperWick - lowerWick)).toBeLessThanOrEqual(tolerance)
    }
  })
})

// ─── calcGap テスト ───

describe('calcGap 呼値整合', () => {
  it('openPriceが自身の呼値の倍数かつ10以上である', () => {
    for (let i = 0; i < 100; i++) {
      const result = calcGap(30000, 'range', null)
      expect(result.openPrice % tickUnit(result.openPrice)).toBe(0)
      expect(result.openPrice).toBeGreaterThanOrEqual(MIN_PRICE)
    }
  })

  it('ギャップアップの方向が維持される', () => {
    let gapUpCount = 0
    let gapDownCount = 0
    for (let i = 0; i < 200; i++) {
      const result = calcGap(30000, 'bullish', null)
      if (result.isGapUp) gapUpCount++
      else gapDownCount++
      expect(result.openPrice % tickUnit(result.openPrice)).toBe(0)
    }
    expect(gapUpCount).toBeGreaterThan(gapDownCount)
  })

  it('ギャップダウンの方向が維持される', () => {
    let gapUpCount = 0
    let gapDownCount = 0
    for (let i = 0; i < 200; i++) {
      const result = calcGap(30000, 'bearish', null)
      if (result.isGapUp) gapUpCount++
      else gapDownCount++
      expect(result.openPrice % tickUnit(result.openPrice)).toBe(0)
    }
    expect(gapDownCount).toBeGreaterThan(gapUpCount)
  })
})

// ─── TradingEngine SL/TP テスト ───

describe('TradingEngine setSLTP 呼値丸め', () => {
  function createEngine() {
    return new TradingEngine({ balance: 1_000_000, maxLeverage: 3 })
  }

  it('LONG: SLがfloor、TPがceilで丸められる（entryPrice=30000、境界値）', () => {
    const engine = createEngine()
    const pos = engine.openPosition('LONG', 10, 30000)!
    expect(pos).not.toBeNull()

    const ok = engine.setSLTP(pos.id, 29993, 30008)
    expect(ok).toBe(true)

    const positions = engine.getPositions()
    const updated = positions.find(p => p.id === pos.id)!
    // LONG SL: 29993 → tickUnit(29993)=10 → floor(29993/10)*10 = 29990
    expect(updated.stopLoss).toBe(29990)
    // LONG TP: 30008 → tickUnit(30008)=50 → ceil(30008/50)*50 = 30050
    expect(updated.takeProfit).toBe(30050)
  })

  it('SHORT: SLがceil、TPがfloorで丸められる（entryPrice=30000、境界値）', () => {
    const engine = createEngine()
    const pos = engine.openPosition('SHORT', 10, 30000)!
    expect(pos).not.toBeNull()

    const ok = engine.setSLTP(pos.id, 30008, 29993)
    expect(ok).toBe(true)

    const positions = engine.getPositions()
    const updated = positions.find(p => p.id === pos.id)!
    // SHORT SL: 30008 → tickUnit(30008)=50 → ceil(30008/50)*50 = 30050
    expect(updated.stopLoss).toBe(30050)
    // SHORT TP: 29993 → tickUnit(29993)=10 → floor(29993/10)*10 = 29990
    expect(updated.takeProfit).toBe(29990)
  })

  it('丸め後にエントリー価格を跨ぐ場合は拒否される（原子性確認）', () => {
    const engine = createEngine()
    const pos = engine.openPosition('LONG', 10, 30000)!

    // SL=30001 → tickUnit(30001)=50 → floor(30001/50)*50 = 30000 → >= entryPrice なので拒否
    const ok = engine.setSLTP(pos.id, 30001, 30008)
    expect(ok).toBe(false)

    const positions = engine.getPositions()
    const updated = positions.find(p => p.id === pos.id)!
    expect(updated.stopLoss).toBeUndefined()
    expect(updated.takeProfit).toBeUndefined()
  })

  it('TP丸め後にエントリー価格を跨ぐ場合もSLが巻き添えにならない', () => {
    const engine = createEngine()
    const pos = engine.openPosition('LONG', 10, 30000)!

    // SL=29990 (OK), TP=29999 → tickUnit(29999)=10 → ceil(29999/10)*10 = 30000 → <= entryPrice なので拒否
    const ok = engine.setSLTP(pos.id, 29990, 29999)
    expect(ok).toBe(false)

    const positions = engine.getPositions()
    const updated = positions.find(p => p.id === pos.id)!
    expect(updated.stopLoss).toBeUndefined()
    expect(updated.takeProfit).toBeUndefined()
  })

  it('stopLoss < MIN_PRICE は拒否される', () => {
    const engine = createEngine()
    const pos = engine.openPosition('LONG', 10, 30000)!
    expect(engine.setSLTP(pos.id, 0)).toBe(false)
    expect(engine.setSLTP(pos.id, -100)).toBe(false)
    expect(engine.setSLTP(pos.id, 5)).toBe(false)
  })

  it('takeProfit < MIN_PRICE は拒否される', () => {
    const engine = createEngine()
    const pos = engine.openPosition('LONG', 10, 30000)!
    expect(engine.setSLTP(pos.id, undefined, 0)).toBe(false)
    expect(engine.setSLTP(pos.id, undefined, -50)).toBe(false)
    expect(engine.setSLTP(pos.id, undefined, 5)).toBe(false)
  })

  it('undefinedを渡すとSL/TPが解除される', () => {
    const engine = createEngine()
    const pos = engine.openPosition('LONG', 10, 30000)!

    engine.setSLTP(pos.id, 29900, 30100)
    let updated = engine.getPositions().find(p => p.id === pos.id)!
    expect(updated.stopLoss).toBeDefined()
    expect(updated.takeProfit).toBeDefined()

    engine.setSLTP(pos.id, undefined, undefined)
    updated = engine.getPositions().find(p => p.id === pos.id)!
    expect(updated.stopLoss).toBeUndefined()
    expect(updated.takeProfit).toBeUndefined()
  })
})
