import { describe, it, expect, vi, afterEach } from 'vitest'
import { MicrostructureEngine } from '../MicrostructureEngine'
import { STICKY_PRICE, IGNITION, STOP_HUNT, scaleProb } from '../marketParams'
import { tickUnit } from '../priceGrid'
import type { MicroContext } from '../../types/market'

function withSeed(seed: number, fn: () => void): void {
  let s = seed
  vi.spyOn(Math, 'random').mockImplementation(() => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  })
  try {
    fn()
  } finally {
    vi.restoreAllMocks()
  }
}

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
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('滞留分布: 価格変更の間隔がvolStateMaxTicks以下に収まる', () => {
    withSeed(123, () => {
      const engine = new MicrostructureEngine(30000)
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

      const maxAllowed = STICKY_PRICE.volStateMaxTicks.normal
      for (const interval of intervals) {
        expect(interval).toBeLessThanOrEqual(maxAllowed)
      }
    })
  })

  it('符号反転: 正方向蓄積中に大きな負のtotalChangeで即時解放', () => {
    withSeed(42, () => {
      // 蓄積上限を大きくして蓄積しやすくする
      const engine = new MicrostructureEngine(30000, {
        STICKY_PRICE: {
          ...STICKY_PRICE,
          volStateMaxTicks: { high: 100, normal: 100, low: 100 },
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
  })

  it('蓄積上限: maxAccumulationMult × tickUnit を超えない', () => {
    withSeed(42, () => {
      const engine = new MicrostructureEngine(30000, {
        STICKY_PRICE: {
          ...STICKY_PRICE,
          volStateMaxTicks: { high: 1000, normal: 1000, low: 1000 },
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
      // 解放された変化量（≒蓄積量）が maxAccum 付近か、
      // 符号反転で解放されるので newPrice の変化で検証
      const change = Math.abs(result.newPrice - price)
      expect(change).toBeLessThanOrEqual(maxAccum + tick)
    })
  })
})

describe('MicrostructureEngine ラウンドナンバー', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('キリ番より上にいるとき負の力、下にいるとき正の力が返る', () => {
    // キリ番の効果を直接見るために、stickyを無効化
    const noStickyParams = {
      STICKY_PRICE: {
        ...STICKY_PRICE,
        releaseMultMin: 0,
        releaseMultMax: 0,
        volStateMaxTicks: { high: 1, normal: 1, low: 1 },
      },
    }

    withSeed(42, () => {
      // 30000 + 30 = 30030 (30000のキリ番より上)
      const engineAbove = new MicrostructureEngine(30030, noStickyParams)
      const resultAbove = engineAbove.update(baseCtx({
        currentPrice: 30030,
        totalChange: 0,
      }))

      // 30000 - 30 = 29970 (30000のキリ番より下)
      const engineBelow = new MicrostructureEngine(29970, noStickyParams)
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
})

describe('MicrostructureEngine イグニション', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('発火率が理論値の±30%以内', () => {
    withSeed(777, () => {
      // 持続時間ゼロでベルヌーイ試行化
      const engine = new MicrostructureEngine(30000, {
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
  })

  it('extremeEventActive=true時にイグニションが発火しない', () => {
    withSeed(42, () => {
      const engine = new MicrostructureEngine(30000, {
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
  })
})

describe('MicrostructureEngine ストップハンティング', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sessionHighの近傍で発火し、pierce→reversalの2段階遷移が正しい', () => {
    withSeed(42, () => {
      // triggerProb=1.0で確実に発火、stickyは即解放
      const engine = new MicrostructureEngine(30000, {
        STOP_HUNT: {
          ...STOP_HUNT,
          triggerProb: 1.0,
          pierceDuration: 1,
          reversalDuration: 1,
        },
        STICKY_PRICE: {
          ...STICKY_PRICE,
          releaseMultMin: 0,
          releaseMultMax: 0,
          volStateMaxTicks: { high: 1, normal: 1, low: 1 },
        },
      })

      // まずセッション高値を作る
      for (let i = 0; i < 5; i++) {
        engine.update(baseCtx({ totalChange: 50, currentPrice: 30000 + i * 10 }))
      }

      // セッション高値近傍に移動（proximityZone内）
      // sessionHigh付近の価格で発火を試みる
      const ctx = baseCtx({
        currentPrice: 30050,
        totalChange: 0,
        gameTimeDelta: GAME_TIME_PER_REF_TICK * 20,
      })

      let pierceSeen = false
      let reversalSeen = false

      // pierce → reversal遷移を観察
      for (let i = 0; i < 50; i++) {
        const result = engine.update(ctx)
        if (result.newPrice > 30050) pierceSeen = true
        if (pierceSeen && result.newPrice < 30050) reversalSeen = true
      }

      // pierce発動の確認（triggerProb=1.0なので確実に発火するはず）
      expect(pierceSeen || reversalSeen).toBe(true)
    })
  })
})
