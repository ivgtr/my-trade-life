import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MarketEngine } from '../MarketEngine'
import { TICK_UNIT } from '../priceGrid'
import type { TickData, MarketEngineConfig } from '../../types/market'

function createConfig(overrides?: Partial<MarketEngineConfig>): MarketEngineConfig {
  return {
    openPrice: 30000,
    regimeParams: { drift: 0, volMult: 1.0, regime: 'range' },
    anomalyParams: { driftBias: 0, volBias: 1.0, tendency: '' },
    speed: 1,
    onTick: vi.fn(),
    onSessionEnd: vi.fn(),
    ...overrides,
  }
}

describe('MarketEngine 昼休み停止', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('gameTimeが690に達した時点でonLunchStartコールバックが呼ばれる', () => {
    const onLunchStart = vi.fn()
    const onTick = vi.fn()
    const config = createConfig({ onLunchStart, onTick, speed: 100 })
    const engine = new MarketEngine(config)
    engine.start()

    // 十分な時間を進めて昼休みに到達させる
    vi.advanceTimersByTime(60000)

    expect(onLunchStart).toHaveBeenCalledTimes(1)
  })

  it('onLunchStart後にonTickが呼ばれない（tick生成停止）', () => {
    const onLunchStart = vi.fn()
    const ticks: TickData[] = []
    const config = createConfig({
      onLunchStart,
      onTick: (tick) => ticks.push(tick),
      speed: 100,
    })
    const engine = new MarketEngine(config)
    engine.start()

    vi.advanceTimersByTime(60000)
    expect(onLunchStart).toHaveBeenCalledTimes(1)

    const tickCountAtLunch = ticks.length
    // さらに時間を進めてもtickは増えない
    vi.advanceTimersByTime(10000)
    expect(ticks.length).toBe(tickCountAtLunch)
  })

  it('onLunchStart時の最終tickのtimestampが690（11:30境界tick発行）', () => {
    const onLunchStart = vi.fn()
    const ticks: TickData[] = []
    const config = createConfig({
      onLunchStart,
      onTick: (tick) => ticks.push(tick),
      speed: 100,
    })
    const engine = new MarketEngine(config)
    engine.start()

    vi.advanceTimersByTime(60000)
    expect(onLunchStart).toHaveBeenCalled()

    const lastTick = ticks[ticks.length - 1]
    expect(lastTick.timestamp).toBe(690)
  })
})

describe('MarketEngine resumeFromLunch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resumeFromLunch()後にgameTimeが750から再開する', () => {
    const onLunchStart = vi.fn()
    const ticks: TickData[] = []
    const config = createConfig({
      onLunchStart,
      onTick: (tick) => ticks.push(tick),
      speed: 100,
    })
    const engine = new MarketEngine(config)
    engine.start()

    vi.advanceTimersByTime(60000)
    expect(onLunchStart).toHaveBeenCalled()

    engine.resumeFromLunch()
    // resumeFromLunch直後に12:30境界tickが発行される
    const lunchEndTick = ticks[ticks.length - 1]
    expect(lunchEndTick.timestamp).toBe(750)
  })

  it('resumeFromLunch()後に通常のtick生成が再開する', () => {
    const onLunchStart = vi.fn()
    const ticks: TickData[] = []
    const config = createConfig({
      onLunchStart,
      onTick: (tick) => ticks.push(tick),
      speed: 100,
    })
    const engine = new MarketEngine(config)
    engine.start()

    vi.advanceTimersByTime(60000)
    const tickCountAtLunch = ticks.length

    engine.resumeFromLunch()
    const tickCountAfterResume = ticks.length
    expect(tickCountAfterResume).toBeGreaterThan(tickCountAtLunch)

    // さらに進めるとtickが増える
    vi.advanceTimersByTime(5000)
    expect(ticks.length).toBeGreaterThan(tickCountAfterResume)
  })
})

describe('MarketEngine 境界tickのhigh/low', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('昼休み到達時の境界tick（690）でhigh === low === price（ヒゲなし）', () => {
    const onLunchStart = vi.fn()
    const ticks: TickData[] = []
    const config = createConfig({
      onLunchStart,
      onTick: (tick) => ticks.push(tick),
      speed: 100,
    })
    const engine = new MarketEngine(config)
    engine.start()

    vi.advanceTimersByTime(60000)

    const boundaryTick = ticks.find(t => t.timestamp === 690)
    expect(boundaryTick).toBeDefined()
    expect(boundaryTick!.high).toBe(boundaryTick!.price)
    expect(boundaryTick!.low).toBe(boundaryTick!.price)
  })

  it('resumeFromLunch時の境界tick（750）でhigh === low === price（ヒゲなし）', () => {
    const onLunchStart = vi.fn()
    const ticks: TickData[] = []
    const config = createConfig({
      onLunchStart,
      onTick: (tick) => ticks.push(tick),
      speed: 100,
    })
    const engine = new MarketEngine(config)
    engine.start()

    vi.advanceTimersByTime(60000)
    engine.resumeFromLunch()

    const resumeTick = ticks.find(t => t.timestamp === 750)
    expect(resumeTick).toBeDefined()
    expect(resumeTick!.high).toBe(resumeTick!.price)
    expect(resumeTick!.low).toBe(resumeTick!.price)
  })
})

describe('MarketEngine 境界tickのtimeZone', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('11:30境界tick（timestamp=690）のtimeZoneが"morning"（前場最終）', () => {
    const onLunchStart = vi.fn()
    const ticks: TickData[] = []
    const config = createConfig({
      onLunchStart,
      onTick: (tick) => ticks.push(tick),
      speed: 100,
    })
    const engine = new MarketEngine(config)
    engine.start()

    vi.advanceTimersByTime(60000)

    const boundaryTick = ticks.find(t => t.timestamp === 690)
    expect(boundaryTick).toBeDefined()
    expect(boundaryTick!.timeZone).toBe('morning')
  })

  it('12:30境界tick（timestamp=750）のtimeZoneが"afternoon"（後場開始）', () => {
    const onLunchStart = vi.fn()
    const ticks: TickData[] = []
    const config = createConfig({
      onLunchStart,
      onTick: (tick) => ticks.push(tick),
      speed: 100,
    })
    const engine = new MarketEngine(config)
    engine.start()

    vi.advanceTimersByTime(60000)
    engine.resumeFromLunch()

    const resumeTick = ticks.find(t => t.timestamp === 750)
    expect(resumeTick).toBeDefined()
    expect(resumeTick!.timeZone).toBe('afternoon')
  })
})

describe('MarketEngine onLunchStart単発発火', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('昼休みに入ってもonLunchStartは1回のみ呼ばれる', () => {
    const onLunchStart = vi.fn()
    const config = createConfig({ onLunchStart, speed: 100 })
    const engine = new MarketEngine(config)
    engine.start()

    // 十分進める
    vi.advanceTimersByTime(120000)

    expect(onLunchStart).toHaveBeenCalledTimes(1)
  })
})

describe('MarketEngine high/low overshootフロア', () => {
  function collectTicksWithSeed(config: Partial<MarketEngineConfig>, tickCount: number): TickData[] {
    vi.useFakeTimers()
    let seed = 42
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 0x100000000
    })

    const ticks: TickData[] = []
    const engine = new MarketEngine(createConfig({
      onTick: (tick) => ticks.push(tick),
      speed: 100,
      ...config,
    }))
    engine.start()
    for (let i = 0; i < tickCount; i++) vi.advanceTimersByTime(10)
    engine.stop()

    vi.restoreAllMocks()
    vi.useRealTimers()
    return ticks
  }

  it('低ボラ設定で通常tickのhigh >= price + TICK_UNIT かつ low <= price - TICK_UNIT', () => {
    const ticks = collectTicksWithSeed({
      openPrice: 36000,
      regimeParams: { drift: 0, volMult: 0.7, regime: 'range' },
      anomalyParams: { driftBias: 0, volBias: 0.3, tendency: '' },
    }, 300)

    // 通常tick（境界tick timestamp=690,750,930 を除外）
    const normalTicks = ticks.filter(t => t.timestamp !== 690 && t.timestamp !== 750 && t.timestamp !== 930)
    expect(normalTicks.length).toBeGreaterThan(0)

    for (const tick of normalTicks) {
      expect(tick.high).toBeGreaterThanOrEqual(tick.price + TICK_UNIT)
      expect(tick.low).toBeLessThanOrEqual(tick.price - TICK_UNIT)
    }
  })

  it('高ボラ設定で通常tickの過半数がスプレッド TICK_UNIT * 2 超である', () => {
    const ticks = collectTicksWithSeed({
      openPrice: 36000,
      regimeParams: { drift: 0, volMult: 1.5, regime: 'range' },
      anomalyParams: { driftBias: 0, volBias: 1.5, tendency: '' },
    }, 300)

    const normalTicks = ticks.filter(t => t.timestamp !== 690 && t.timestamp !== 750 && t.timestamp !== 930)
    expect(normalTicks.length).toBeGreaterThan(0)

    const wideSpreadCount = normalTicks.filter(t => (t.high - t.low) > TICK_UNIT * 2).length
    expect(wideSpreadCount / normalTicks.length).toBeGreaterThan(0.5)
  })
})
