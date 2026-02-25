import { describe, it, expect } from 'vitest'
import { VolumeModel } from '../VolumeModel'
import { BASE_VOLUME } from '../marketParams'
import { Rng } from '../../utils/Rng'
import type { VolumeContext } from '../../types/market'

function baseCtx(overrides?: Partial<VolumeContext>): VolumeContext {
  return {
    volState: 'normal',
    timeZone: 'morning',
    priceChange: 0,
    currentPrice: 30000,
    ignitionActive: false,
    priceChanged: true,
    activityMult: 1.0,
    ...overrides,
  }
}

describe('VolumeModel', () => {
  it('基本出来高: volState=normal, timeZone=morning で BASE_VOLUME.normal 付近の値を返す', () => {
    const rng = new Rng(42)
    const model = new VolumeModel(rng)
    const volumes: number[] = []
    for (let i = 0; i < 100; i++) {
      volumes.push(model.generate(baseCtx()))
    }
    const avg = volumes.reduce((a, b) => a + b, 0) / volumes.length
    expect(avg).toBeGreaterThan(BASE_VOLUME.normal * 0.4)
    expect(avg).toBeLessThan(BASE_VOLUME.normal * 2.0)
  })

  it('価格変動連動: priceChange大 → 出来高増加', () => {
    const rng = new Rng(42)
    const model = new VolumeModel(rng)
    const volSmall = model.generate(baseCtx({ priceChange: 0 }))
    const volLarge = model.generate(baseCtx({ priceChange: 300 }))
    expect(volLarge).toBeGreaterThan(volSmall)
  })

  it('sticky減少: priceChanged=false時にstickyMult適用で出来高が低下', () => {
    const rng = new Rng(42)
    const model = new VolumeModel(rng)
    const volumes: number[] = []
    for (let i = 0; i < 50; i++) {
      volumes.push(model.generate(baseCtx({ priceChanged: false })))
    }
    const avgSticky = volumes.reduce((a, b) => a + b, 0) / volumes.length
    expect(avgSticky).toBeLessThan(BASE_VOLUME.normal * 0.8)
  })

  it('ソフトキャップ単調性: 巨大な倍率を与えても cap を超えない', () => {
    const rng = new Rng(42)
    const model = new VolumeModel(rng)
    const cap = BASE_VOLUME.normal * 10
    for (let i = 0; i < 100; i++) {
      const vol = model.generate(baseCtx({
        priceChange: 100000,
        ignitionActive: true,
      }))
      expect(vol).toBeLessThanOrEqual(cap)
    }
  })

  it('P50/P90 分位点が妥当な範囲', () => {
    const rng = new Rng(42)
    const model = new VolumeModel(rng)
    const volumes: number[] = []
    for (let i = 0; i < 1000; i++) {
      volumes.push(model.generate(baseCtx()))
    }
    volumes.sort((a, b) => a - b)
    const p50 = volumes[500]
    const p90 = volumes[900]
    expect(p50).toBeGreaterThan(BASE_VOLUME.normal * 0.3)
    expect(p50).toBeLessThan(BASE_VOLUME.normal * 2.0)
    expect(p90).toBeGreaterThan(BASE_VOLUME.normal * 0.8)
    expect(p90).toBeLessThan(BASE_VOLUME.normal * 5.0)
  })

  it('activityMult乗算: activityMult=2.5 で出来高平均が activityMult=1.0 の2.0倍以上', () => {
    const N = 100
    const sampleAvg = (mult: number) => {
      const rng = new Rng(42)
      const model = new VolumeModel(rng)
      let sum = 0
      for (let i = 0; i < N; i++) {
        sum += model.generate(baseCtx({ activityMult: mult }))
      }
      return sum / N
    }
    const avg1 = sampleAvg(1.0)
    const avg25 = sampleAvg(2.5)
    expect(avg25 / avg1).toBeGreaterThan(2.0)
  })

  it('algoOverride時は既存倍率をバイパスする', () => {
    const rng1 = new Rng(42)
    const model1 = new VolumeModel(rng1)
    const rng2 = new Rng(42)
    const model2 = new VolumeModel(rng2)

    const vol1 = model1.generate(
      baseCtx({ priceChange: 0 }),
      { volume: 500 },
    )
    const vol2 = model2.generate(
      baseCtx({ priceChange: 1000 }),
      { volume: 500 },
    )
    // priceChangeが異なっても、override時は同じ値
    expect(vol1).toBe(vol2)
  })
})
