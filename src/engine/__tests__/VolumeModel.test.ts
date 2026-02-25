import { describe, it, expect, vi, afterEach } from 'vitest'
import { VolumeModel } from '../VolumeModel'
import { BASE_VOLUME } from '../marketParams'
import type { VolumeContext } from '../../types/market'

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

function baseCtx(overrides?: Partial<VolumeContext>): VolumeContext {
  return {
    volState: 'normal',
    timeZone: 'morning',
    priceChange: 0,
    currentPrice: 30000,
    ignitionActive: false,
    priceChanged: true,
    ...overrides,
  }
}

describe('VolumeModel', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('基本出来高: volState=normal, timeZone=morning で BASE_VOLUME.normal 付近の値を返す', () => {
    const model = new VolumeModel()
    withSeed(42, () => {
      const volumes: number[] = []
      for (let i = 0; i < 100; i++) {
        volumes.push(model.generate(baseCtx()))
      }
      const avg = volumes.reduce((a, b) => a + b, 0) / volumes.length
      // randomFactor平均1.0, todMult=1.0, changeMult=1.0, eventMult=1.0
      expect(avg).toBeGreaterThan(BASE_VOLUME.normal * 0.4)
      expect(avg).toBeLessThan(BASE_VOLUME.normal * 1.8)
    })
  })

  it('価格変動連動: priceChange大 → 出来高増加', () => {
    const model = new VolumeModel()
    withSeed(42, () => {
      const volSmall = model.generate(baseCtx({ priceChange: 0 }))
      const volLarge = model.generate(baseCtx({ priceChange: 300 }))
      expect(volLarge).toBeGreaterThan(volSmall)
    })
  })

  it('sticky減少: priceChanged=false時にstickyMult適用で出来高が低下', () => {
    const model = new VolumeModel()
    withSeed(42, () => {
      const volumes: number[] = []
      for (let i = 0; i < 50; i++) {
        volumes.push(model.generate(baseCtx({ priceChanged: false })))
      }
      const avgSticky = volumes.reduce((a, b) => a + b, 0) / volumes.length
      // stickyMult=0.4 なので通常の4割程度
      expect(avgSticky).toBeLessThan(BASE_VOLUME.normal * 0.7)
    })
  })
})
