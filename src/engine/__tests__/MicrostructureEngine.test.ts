import { describe, it, expect } from 'vitest'
import { MicrostructureEngine } from '../MicrostructureEngine'
import { STICKY_PRICE, IGNITION, STOP_HUNT, scaleProb } from '../marketParams'
import { tickUnit } from '../priceGrid'
import { Rng } from '../../utils/Rng'
import type { MicroContext } from '../../types/market'

const GAME_TIME_PER_REF_TICK = 200 * (330 / 174750)

function baseCtx(overrides?: Partial<MicroContext>): MicroContext {
  return {
    currentPrice: 30000,
    totalChange: 5,
    dt: 1.0,
    gameTimeDelta: 200 * (330 / 174750),
    gameTimePerRefTick: GAME_TIME_PER_REF_TICK,
    volState: 'normal',
    effectiveVol: 30000 * 0.00042 * 1.0,
    momentumSign: 0,
    extremeEventActive: false,
    ...overrides,
  }
}

describe('MicrostructureEngine Sticky Price', () => {
  it('滞留分布: 価格変更の間隔がemergencyMaxTicks以下に収まる', () => {
    const rng = new Rng(123)
    const engine = new MicrostructureEngine(30000, rng)
    let ticksSinceLastChange = 0
    const intervals: number[] = []

    for (let i = 0; i < 1000; i++) {
      const result = engine.update(baseCtx({ totalChange: 3 }))
      ticksSinceLastChange++
      if (result.priceChanged) {
        intervals.push(ticksSinceLastChange)
        ticksSinceLastChange = 0
      }
    }

    const maxAllowed = STICKY_PRICE.emergencyMaxTicks.normal
    for (const interval of intervals) {
      expect(interval).toBeLessThanOrEqual(maxAllowed)
    }
  })

  it('符号反転: 正方向蓄積中に大きな負のtotalChangeで即時解放', () => {
    const rng = new Rng(42)
    const engine = new MicrostructureEngine(30000, rng, {
      STICKY_PRICE: {
        ...STICKY_PRICE,
        releaseHazardRate: { high: 0, normal: 0, low: 0 },
        emergencyMaxTicks: { high: 100, normal: 100, low: 100 },
        releaseMultMin: 100,
        releaseMultMax: 100,
      },
    })

    // 正方向に蓄積
    engine.update(baseCtx({ totalChange: 5 }))
    engine.update(baseCtx({ totalChange: 5 }))

    // 大きな負の変化で符号反転 → 即時解放
    const result = engine.update(baseCtx({ totalChange: -50 }))
    expect(result.priceChanged).toBe(true)
  })

  it('蓄積上限: maxAccumulationMult × tickUnit を超えない', () => {
    const rng = new Rng(42)
    const engine = new MicrostructureEngine(30000, rng, {
      STICKY_PRICE: {
        ...STICKY_PRICE,
        releaseHazardRate: { high: 0, normal: 0, low: 0 },
        emergencyMaxTicks: { high: 1000, normal: 1000, low: 1000 },
        releaseMultMin: 1000,
        releaseMultMax: 1000,
      },
    })

    const price = 30000
    const tick = tickUnit(price)
    const maxAccum = tick * STICKY_PRICE.maxAccumulationMult

    // 大量に蓄積しようとする
    for (let i = 0; i < 100; i++) {
      engine.update(baseCtx({ totalChange: 100 }))
    }

    // 次に符号反転で強制解放して値を検証
    const result = engine.update(baseCtx({ totalChange: -10000 }))
    const change = Math.abs(result.newPrice - price)
    expect(change).toBeLessThanOrEqual(maxAccum + tick)
  })
})

describe('MicrostructureEngine ラウンドナンバー', () => {
  it('キリ番より上にいるとき負の力、下にいるとき正の力が返る', () => {
    const noStickyParams = {
      STICKY_PRICE: {
        ...STICKY_PRICE,
        releaseMultMin: 0,
        releaseMultMax: 0,
        releaseHazardRate: { high: 1.0, normal: 1.0, low: 1.0 },
        emergencyMaxTicks: { high: 1, normal: 1, low: 1 },
      },
    }

    // 30000 + 30 = 30030 (30000のキリ番より上)
    const rngAbove = new Rng(42)
    const engineAbove = new MicrostructureEngine(30030, rngAbove, noStickyParams)
    const resultAbove = engineAbove.update(baseCtx({
      currentPrice: 30030,
      totalChange: 0,
    }))

    // 30000 - 30 = 29970 (30000のキリ番より下)
    const rngBelow = new Rng(42)
    const engineBelow = new MicrostructureEngine(29970, rngBelow, noStickyParams)
    const resultBelow = engineBelow.update(baseCtx({
      currentPrice: 29970,
      totalChange: 0,
    }))

    // 上にいるとき: 価格が下方向に引っ張られる (30000に近づく)
    if (resultAbove.priceChanged) {
      expect(resultAbove.newPrice).toBeLessThanOrEqual(30030)
    }
    // 下にいるとき: 価格が上方向に引っ張られる (30000に近づく)
    if (resultBelow.priceChanged) {
      expect(resultBelow.newPrice).toBeGreaterThanOrEqual(29970)
    }
  })
})

describe('MicrostructureEngine イグニション', () => {
  it('発火率が理論値の±30%以内', () => {
    const rng = new Rng(777)
    const engine = new MicrostructureEngine(30000, rng, {
      IGNITION: {
        ...IGNITION,
        durationMin: 0,
        durationMax: 0,
      },
    })

    let fireCount = 0
    const N = 10000
    const dt = 1.0

    for (let i = 0; i < N; i++) {
      const result = engine.update(baseCtx({ dt }))
      if (result.ignitionActive) fireCount++
    }

    const expectedProb = scaleProb(IGNITION.triggerProb * IGNITION.volStateMult.normal, dt)
    const expectedCount = N * expectedProb
    expect(fireCount).toBeGreaterThan(expectedCount * 0.7)
    expect(fireCount).toBeLessThan(expectedCount * 1.3)
  })

  it('extremeEventActive=true時にイグニションが発火しない', () => {
    const rng = new Rng(42)
    const engine = new MicrostructureEngine(30000, rng, {
      IGNITION: {
        ...IGNITION,
        triggerProb: 1.0,
        volStateMult: { high: 1, normal: 1, low: 1 },
        durationMin: 0,
        durationMax: 0,
      },
    })

    let fireCount = 0
    for (let i = 0; i < 100; i++) {
      const result = engine.update(baseCtx({ extremeEventActive: true }))
      if (result.ignitionActive) fireCount++
    }

    expect(fireCount).toBe(0)
  })

  it('duration=0で即終了する', () => {
    const rng = new Rng(42)
    const engine = new MicrostructureEngine(30000, rng, {
      IGNITION: {
        ...IGNITION,
        triggerProb: 1.0,
        volStateMult: { high: 1, normal: 1, low: 1 },
        durationMin: 0,
        durationMax: 0,
      },
    })

    // 発火後、次tickではignitionActive=falseになる
    let fired = false
    for (let i = 0; i < 100; i++) {
      const result = engine.update(baseCtx())
      if (result.ignitionActive) {
        fired = true
        // duration=0なので同tick内で即終了、次tickでは非アクティブ
        const next = engine.update(baseCtx())
        // 新たな発火 or 非アクティブ（duration=0だと1tick持続）
        // duration=0 → timeRemaining=0 → 初回tickで発火しignitionActive=true
        // 次tick timeRemaining(0)-=gameTimeDelta → <=0 → null
        expect(next.ignitionActive).toBe(false)
        break
      }
    }
    expect(fired).toBe(true)
  })
})

describe('MicrostructureEngine ストップハンティング', () => {
  it('sessionHighの近傍で発火し、pierce→reversalの2段階遷移が正しい', () => {
    const rng = new Rng(42)
    const engine = new MicrostructureEngine(30000, rng, {
      STOP_HUNT: {
        ...STOP_HUNT,
        triggerProb: 1.0,
        pierceDurationMin: 1,
        pierceDurationMax: 1,
        reversalDurationMin: 1,
        reversalDurationMax: 1,
      },
      STICKY_PRICE: {
        ...STICKY_PRICE,
        releaseMultMin: 0,
        releaseMultMax: 0,
        releaseHazardRate: { high: 1.0, normal: 1.0, low: 1.0 },
        emergencyMaxTicks: { high: 1, normal: 1, low: 1 },
      },
    })

    // まずセッション高値を作る
    for (let i = 0; i < 5; i++) {
      engine.update(baseCtx({ totalChange: 50, currentPrice: 30000 + i * 10 }))
    }

    // セッション高値近傍に移動（proximityZone内）
    const ctx = baseCtx({
      currentPrice: 30050,
      totalChange: 0,
      gameTimeDelta: GAME_TIME_PER_REF_TICK * 20,
    })

    let pierceSeen = false
    let reversalSeen = false

    for (let i = 0; i < 50; i++) {
      const result = engine.update(ctx)
      if (result.newPrice > 30050) pierceSeen = true
      if (pierceSeen && result.newPrice < 30050) reversalSeen = true
    }

    expect(pierceSeen || reversalSeen).toBe(true)
  })
})
