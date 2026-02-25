import { describe, it, expect, vi } from 'vitest'
import type { Time } from 'lightweight-charts'
import { collectBoundaryCoordinates, IntervalGridPrimitive } from '../GridPrimitive'
import { generateBoundaryTimes } from '../../utils/chartTime'

describe('collectBoundaryCoordinates', () => {
  it('全境界が可視 → 全座標が返る', () => {
    const times = [32400, 33300, 34200]
    const toCoord = (t: Time) => (t as number) / 100
    const coords = collectBoundaryCoordinates(times, toCoord)
    expect(coords).toEqual([324, 333, 342])
  })

  it('一部がnull（範囲外） → nullの時刻は除外', () => {
    const times = [32400, 33300, 34200]
    const toCoord = (t: Time) => (t as number) === 33300 ? null : (t as number) / 100
    const coords = collectBoundaryCoordinates(times, toCoord)
    expect(coords).toEqual([324, 342])
  })

  it('全てnull → 空配列', () => {
    const times = [32400, 33300]
    const toCoord = () => null
    const coords = collectBoundaryCoordinates(times, toCoord)
    expect(coords).toEqual([])
  })

  it('interval変更(15→30) → 境界数が変わる', () => {
    const times15 = generateBoundaryTimes(15)
    const times30 = generateBoundaryTimes(30)
    const toCoord = (t: Time) => (t as number) / 100
    const coords15 = collectBoundaryCoordinates(times15, toCoord)
    const coords30 = collectBoundaryCoordinates(times30, toCoord)
    expect(coords15.length).toBe(24)
    expect(coords30.length).toBe(13)
  })
})

describe('IntervalGridPrimitive', () => {
  it('attached後にsetInterval() → requestUpdate()が1回呼ばれる', () => {
    const primitive = new IntervalGridPrimitive(15)
    const requestUpdate = vi.fn()
    const mockParam = {
      requestUpdate,
      chart: { timeScale: () => ({ timeToCoordinate: () => null }) },
    }
    primitive.attached(mockParam as never)
    primitive.setInterval(30)
    expect(requestUpdate).toHaveBeenCalledTimes(1)
  })

  it('detached後にsetInterval() → requestUpdate()は呼ばれない（エラーなし）', () => {
    const primitive = new IntervalGridPrimitive(15)
    const requestUpdate = vi.fn()
    const mockParam = {
      requestUpdate,
      chart: { timeScale: () => ({ timeToCoordinate: () => null }) },
    }
    primitive.attached(mockParam as never)
    primitive.detached()
    primitive.setInterval(30)
    expect(requestUpdate).not.toHaveBeenCalled()
  })
})
