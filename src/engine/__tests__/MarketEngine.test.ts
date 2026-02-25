import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MarketEngine } from '../MarketEngine'
import { tickUnit } from '../priceGrid'
import { REFERENCE_TICK_MEAN, scaleProb, scaleDecay, scaleLinear } from '../marketParams'
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

/** 指定コールバックが発火するまでタイマーを段階的に進める */
function advanceUntilCalled(
  callback: ReturnType<typeof vi.fn>,
  stepMs = 100,
  limitMs = 120000,
): void {
  for (let elapsed = 0; elapsed < limitMs; elapsed += stepMs) {
    vi.advanceTimersByTime(stepMs)
    if (callback.mock.calls.length > 0) return
  }
  throw new Error(`Callback not called within ${limitMs}ms`)
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

    advanceUntilCalled(onLunchStart)

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

    advanceUntilCalled(onLunchStart)
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

    advanceUntilCalled(onLunchStart)
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

    advanceUntilCalled(onLunchStart)
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

    advanceUntilCalled(onLunchStart)
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

    advanceUntilCalled(onLunchStart)

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

    advanceUntilCalled(onLunchStart)
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

    advanceUntilCalled(onLunchStart)

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

    advanceUntilCalled(onLunchStart)
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

    advanceUntilCalled(onLunchStart)
    // さらに進めても2回目は呼ばれない
    vi.advanceTimersByTime(30000)

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

  it('低ボラ設定で通常tickのhigh >= price + tickUnit かつ low <= price - tickUnit', () => {
    const ticks = collectTicksWithSeed({
      openPrice: 25000,
      regimeParams: { drift: 0, volMult: 0.7, regime: 'range' },
      anomalyParams: { driftBias: 0, volBias: 0.3, tendency: '' },
    }, 300)

    // 通常tick（境界tick timestamp=690,750,930 を除外）
    const normalTicks = ticks.filter(t => t.timestamp !== 690 && t.timestamp !== 750 && t.timestamp !== 930)
    expect(normalTicks.length).toBeGreaterThan(0)

    for (const tick of normalTicks) {
      expect(tick.high).toBeGreaterThanOrEqual(tick.price + tickUnit(tick.price))
      expect(tick.low).toBeLessThanOrEqual(tick.price - tickUnit(tick.price))
    }
  })

  it('高ボラ設定で通常tickの過半数がスプレッド tickUnit * 2 超である', () => {
    const ticks = collectTicksWithSeed({
      openPrice: 25000,
      regimeParams: { drift: 0, volMult: 1.5, regime: 'range' },
      anomalyParams: { driftBias: 0, volBias: 1.5, tendency: '' },
    }, 300)

    const normalTicks = ticks.filter(t => t.timestamp !== 690 && t.timestamp !== 750 && t.timestamp !== 930)
    expect(normalTicks.length).toBeGreaterThan(0)

    const wideSpreadCount = normalTicks.filter(t => (t.high - t.low) > tickUnit(t.price) * 2).length
    expect(wideSpreadCount / normalTicks.length).toBeGreaterThan(0.5)
  })
})

describe('dtスケーリング関数の数学的性質', () => {
  it('scaleLinear: dt=1.0で元の値と一致', () => {
    expect(scaleLinear(0.5, 1.0)).toBe(0.5)
  })

  it('scaleLinear: dt=0.5で半分', () => {
    expect(scaleLinear(0.5, 0.5)).toBeCloseTo(0.25)
  })

  it('scaleDecay: dt=1.0で元の減衰率と一致', () => {
    expect(scaleDecay(0.72, 1.0)).toBeCloseTo(0.72)
  })

  it('scaleDecay: dt=2.0で減衰率の2乗', () => {
    expect(scaleDecay(0.72, 2.0)).toBeCloseTo(0.72 ** 2)
  })

  it('scaleDecay: dt=0.5で減衰率の平方根', () => {
    expect(scaleDecay(0.72, 0.5)).toBeCloseTo(Math.sqrt(0.72))
  })

  it('scaleProb: dt=1.0で元の確率と一致', () => {
    expect(scaleProb(0.1, 1.0)).toBeCloseTo(0.1)
  })

  it('scaleProb: dt=2.0で2回分の確率', () => {
    // P(2ticks) = 1 - (1-p)^2
    expect(scaleProb(0.1, 2.0)).toBeCloseTo(1 - 0.9 ** 2)
  })

  it('scaleProb: dt=0.5で半tick分の確率', () => {
    expect(scaleProb(0.1, 0.5)).toBeCloseTo(1 - 0.9 ** 0.5)
  })

  it('scaleProb: 加法性 — scaleProb(p, a) + (1-scaleProb(p,a))*scaleProb(p,b) ≈ scaleProb(p, a+b)', () => {
    const p = 0.12
    const a = 0.3, b = 0.7
    const combined = scaleProb(p, a) + (1 - scaleProb(p, a)) * scaleProb(p, b)
    expect(combined).toBeCloseTo(scaleProb(p, a + b), 10)
  })

  it('REFERENCE_TICK_MEAN は200ms', () => {
    expect(REFERENCE_TICK_MEAN).toBe(200)
  })
})
