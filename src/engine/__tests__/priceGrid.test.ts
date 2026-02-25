import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { TICK_UNIT, roundToTick, floorToTick, ceilToTick, roundPrice } from '../priceGrid'
import { MarketEngine } from '../MarketEngine'
import { TradingEngine } from '../TradingEngine'
import { calcGap } from '../marketParams'
import type { MarketEngineConfig, TickData } from '../../types/market'

// ─── priceGrid 単体テスト ───

describe('roundToTick', () => {
  it('正値を最寄りのTICK_UNIT倍数に丸める', () => {
    expect(roundToTick(7)).toBe(5)
    expect(roundToTick(8)).toBe(10)
    expect(roundToTick(10)).toBe(10)
    expect(roundToTick(12)).toBe(10)
    expect(roundToTick(13)).toBe(15)
  })

  it('負値を対称に丸める', () => {
    expect(roundToTick(-7)).toBe(-5)
    expect(roundToTick(-8)).toBe(-10)
    expect(roundToTick(-10)).toBe(-10)
  })

  it('境界値（±2.5）を正しく丸める', () => {
    expect(roundToTick(2.5)).toBe(5)
    expect(roundToTick(-2.5)).toBe(-5)
  })

  it('ゼロはゼロのまま', () => {
    expect(roundToTick(0)).toBe(0)
  })
})

describe('floorToTick', () => {
  it('正値を切り下げる', () => {
    expect(floorToTick(7)).toBe(5)
    expect(floorToTick(10)).toBe(10)
    expect(floorToTick(11)).toBe(10)
  })

  it('負値を切り下げる', () => {
    expect(floorToTick(-3)).toBe(-5)
    expect(floorToTick(-5)).toBe(-5)
    expect(floorToTick(-10)).toBe(-10)
  })
})

describe('ceilToTick', () => {
  it('正値を切り上げる', () => {
    expect(ceilToTick(3)).toBe(5)
    expect(ceilToTick(5)).toBe(5)
    expect(ceilToTick(6)).toBe(10)
  })

  it('負値を切り上げる', () => {
    expect(ceilToTick(-7)).toBe(-5)
    expect(ceilToTick(-5)).toBe(-5)
    expect(ceilToTick(-11)).toBe(-10)
  })
})

describe('roundPrice', () => {
  it('最小10円を保証する', () => {
    expect(roundPrice(3)).toBe(10)
    expect(roundPrice(-100)).toBe(10)
    expect(roundPrice(0)).toBe(10)
  })

  it('通常の丸めを行う', () => {
    expect(roundPrice(30002)).toBe(30000)
    expect(roundPrice(30003)).toBe(30005)
    expect(roundPrice(30007)).toBe(30005)
    expect(roundPrice(30008)).toBe(30010)
  })
})

describe('TICK_UNIT', () => {
  it('5であること', () => {
    expect(TICK_UNIT).toBe(5)
  })
})

// ─── MarketEngine 統合テスト ───

describe('MarketEngine 5円刻み', () => {
  const collectedTicks: TickData[] = []

  beforeAll(() => {
    vi.useFakeTimers()
    // 決定論的乱数（線形合同法）
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

  it('全tickのprice/high/lowが5の倍数である', () => {
    expect(collectedTicks.length).toBeGreaterThan(0)

    for (const tick of collectedTicks) {
      expect(tick.price % TICK_UNIT).toBe(0)
      expect(tick.high % TICK_UNIT).toBe(0)
      expect(tick.low % TICK_UNIT).toBe(0)
      expect(tick.price).toBeGreaterThanOrEqual(10)
      expect(tick.low).toBeGreaterThanOrEqual(10)
    }
  })

  it('tickのhigh/lowがprice中心に対称であること（前tick依存がないことの検証）', () => {
    for (const tick of collectedTicks) {
      const upperWick = tick.high - tick.price
      const lowerWick = tick.price - tick.low
      expect(Math.abs(upperWick - lowerWick)).toBeLessThanOrEqual(TICK_UNIT)
    }
  })
})

// ─── calcGap テスト ───

describe('calcGap 5円刻み', () => {
  it('openPriceが5の倍数かつ10以上である', () => {
    for (let i = 0; i < 100; i++) {
      const result = calcGap(30000, 'range', null)
      expect(result.openPrice % TICK_UNIT).toBe(0)
      expect(result.openPrice).toBeGreaterThanOrEqual(10)
    }
  })

  it('ギャップアップの方向が維持される', () => {
    let gapUpCount = 0
    let gapDownCount = 0
    for (let i = 0; i < 200; i++) {
      const result = calcGap(30000, 'bullish', null)
      if (result.isGapUp) gapUpCount++
      else gapDownCount++
      expect(result.openPrice % TICK_UNIT).toBe(0)
    }
    // bullishレジームではギャップアップの方が多い（確率的）
    expect(gapUpCount).toBeGreaterThan(gapDownCount)
  })

  it('ギャップダウンの方向が維持される', () => {
    let gapUpCount = 0
    let gapDownCount = 0
    for (let i = 0; i < 200; i++) {
      const result = calcGap(30000, 'bearish', null)
      if (result.isGapUp) gapUpCount++
      else gapDownCount++
      expect(result.openPrice % TICK_UNIT).toBe(0)
    }
    // bearishレジームではギャップダウンの方が多い（確率的）
    expect(gapDownCount).toBeGreaterThan(gapUpCount)
  })
})

// ─── TradingEngine SL/TP テスト ───

describe('TradingEngine setSLTP 5円刻み', () => {
  function createEngine() {
    return new TradingEngine({ balance: 1_000_000, maxLeverage: 3 })
  }

  it('LONG: SLがfloor、TPがceilで丸められる', () => {
    const engine = createEngine()
    const pos = engine.openPosition('LONG', 10, 30000)!
    expect(pos).not.toBeNull()

    const ok = engine.setSLTP(pos.id, 29993, 30008)
    expect(ok).toBe(true)

    const positions = engine.getPositions()
    const updated = positions.find(p => p.id === pos.id)!
    // LONG SL: floor(29993) = 29990
    expect(updated.stopLoss).toBe(29990)
    // LONG TP: ceil(30008) = 30010
    expect(updated.takeProfit).toBe(30010)
  })

  it('SHORT: SLがceil、TPがfloorで丸められる', () => {
    const engine = createEngine()
    const pos = engine.openPosition('SHORT', 10, 30000)!
    expect(pos).not.toBeNull()

    const ok = engine.setSLTP(pos.id, 30008, 29993)
    expect(ok).toBe(true)

    const positions = engine.getPositions()
    const updated = positions.find(p => p.id === pos.id)!
    // SHORT SL: ceil(30008) = 30010
    expect(updated.stopLoss).toBe(30010)
    // SHORT TP: floor(29993) = 29990
    expect(updated.takeProfit).toBe(29990)
  })

  it('丸め後にエントリー価格を跨ぐ場合は拒否される（原子性確認）', () => {
    const engine = createEngine()
    const pos = engine.openPosition('LONG', 10, 30000)!

    // SL=29998 → floor → 29995 (OK), TP=30002 → ceil → 30005 (OK) のはず
    // でもSL=30001 → floor → 30000 → >= entryPrice なので拒否
    const ok = engine.setSLTP(pos.id, 30001, 30008)
    expect(ok).toBe(false)

    // 原子性確認: SL/TPいずれも変更されていない
    const positions = engine.getPositions()
    const updated = positions.find(p => p.id === pos.id)!
    expect(updated.stopLoss).toBeUndefined()
    expect(updated.takeProfit).toBeUndefined()
  })

  it('TP丸め後にエントリー価格を跨ぐ場合もSLが巻き添えにならない', () => {
    const engine = createEngine()
    const pos = engine.openPosition('LONG', 10, 30000)!

    // SL=29990 (OK), TP=29999 → ceil → 30000 → <= entryPrice なので拒否
    const ok = engine.setSLTP(pos.id, 29990, 29999)
    expect(ok).toBe(false)

    const positions = engine.getPositions()
    const updated = positions.find(p => p.id === pos.id)!
    expect(updated.stopLoss).toBeUndefined()
    expect(updated.takeProfit).toBeUndefined()
  })

  it('stopLoss <= 0 は拒否される', () => {
    const engine = createEngine()
    const pos = engine.openPosition('LONG', 10, 30000)!
    expect(engine.setSLTP(pos.id, 0)).toBe(false)
    expect(engine.setSLTP(pos.id, -100)).toBe(false)
  })

  it('takeProfit <= 0 は拒否される', () => {
    const engine = createEngine()
    const pos = engine.openPosition('LONG', 10, 30000)!
    expect(engine.setSLTP(pos.id, undefined, 0)).toBe(false)
    expect(engine.setSLTP(pos.id, undefined, -50)).toBe(false)
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
