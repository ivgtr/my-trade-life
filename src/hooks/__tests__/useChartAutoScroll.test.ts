// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import {
  transition,
  shouldScroll,
  computeScrollRange,
  shouldRefollow,
  AUTO_SCROLL_CONFIG,
  useChartAutoScroll,
} from '../useChartAutoScroll'
import type { ScrollState, ScrollEvent, ChartAutoScrollController } from '../useChartAutoScroll'

// ============================================================
// 純粋関数テスト
// ============================================================

describe('transition', () => {
  const cases: [ScrollState, ScrollEvent, ScrollState][] = [
    ['FOLLOWING', 'USER_SCROLL', 'DETACHED'],
    ['FOLLOWING', 'USER_DRAG', 'DETACHED'],
    ['FOLLOWING', 'RESET', 'FOLLOWING'],
    ['FOLLOWING', 'TIMEFRAME_CHANGE', 'FOLLOWING'],
    ['FOLLOWING', 'USER_RETURN', 'FOLLOWING'],
    ['DETACHED', 'RESET', 'FOLLOWING'],
    ['DETACHED', 'TIMEFRAME_CHANGE', 'FOLLOWING'],
    ['DETACHED', 'USER_RETURN', 'FOLLOWING'],
    ['DETACHED', 'USER_SCROLL', 'DETACHED'],
    ['DETACHED', 'USER_DRAG', 'DETACHED'],
  ]

  it.each(cases)('%s + %s → %s', (current, event, expected) => {
    expect(transition(current, event)).toBe(expected)
  })
})

describe('shouldScroll', () => {
  const range = { from: 0, to: 50 }

  it('閾値直前 → false', () => {
    expect(shouldScroll(range.to - AUTO_SCROLL_CONFIG.SCROLL_TRIGGER_BARS - 1, range)).toBe(false)
  })

  it('閾値ちょうど → true', () => {
    expect(shouldScroll(range.to - AUTO_SCROLL_CONFIG.SCROLL_TRIGGER_BARS, range)).toBe(true)
  })

  it('閾値超過 → true', () => {
    expect(shouldScroll(range.to, range)).toBe(true)
  })
})

describe('computeScrollRange', () => {
  it('表示幅が保持される', () => {
    const visibleBars = 40
    const result = computeScrollRange(100, visibleBars)
    expect(result.to - result.from).toBe(visibleBars)
  })

  it('currentBarIndex + RIGHT_MARGIN_BARS + 1 === to', () => {
    const currentBarIndex = 80
    const result = computeScrollRange(currentBarIndex, 40)
    expect(result.to).toBe(currentBarIndex + AUTO_SCROLL_CONFIG.RIGHT_MARGIN_BARS + 1)
  })
})

describe('shouldRefollow', () => {
  const range = { from: 0, to: 100 }
  const visibleBars = range.to - range.from // 100

  it('可視範囲外 → false', () => {
    expect(shouldRefollow(-1, range)).toBe(false)
    expect(shouldRefollow(101, range)).toBe(false)
  })

  it('可視範囲内だが左寄り → false', () => {
    expect(shouldRefollow(50, range)).toBe(false)
    expect(shouldRefollow(69, range)).toBe(false)
  })

  it('可視範囲内かつ右端30%以内 → true', () => {
    const zoneStart = range.to - visibleBars * AUTO_SCROLL_CONFIG.REFOLLOW_ZONE_RATIO // 70
    expect(shouldRefollow(zoneStart, range)).toBe(true)
    expect(shouldRefollow(90, range)).toBe(true)
    expect(shouldRefollow(100, range)).toBe(true)
  })
})

// ============================================================
// フック統合テスト
// ============================================================

vi.mock('../../utils/chartBarBuilder', () => ({
  generateSessionTimeline: vi.fn().mockReturnValue(
    Array.from({ length: 10 }, (_, i) => ({ time: 32400 + i * 60 })),
  ),
}))

describe('useChartAutoScroll hook', () => {
  let container: HTMLDivElement
  let mockSetVisibleLogicalRange: ReturnType<typeof vi.fn>
  let mockGetVisibleLogicalRange: ReturnType<typeof vi.fn>
  let mockChartRef: { current: Record<string, unknown> | null }

  function createMockChart() {
    mockSetVisibleLogicalRange = vi.fn()
    mockGetVisibleLogicalRange = vi.fn().mockReturnValue({ from: 0, to: 50 })
    return {
      timeScale: () => ({
        getVisibleLogicalRange: mockGetVisibleLogicalRange,
        setVisibleLogicalRange: mockSetVisibleLogicalRange,
      }),
    }
  }

  beforeEach(() => {
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.appendChild(container)
    mockChartRef = { current: createMockChart() }
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.removeChild(container)
  })

  function renderAutoScroll() {
    const containerRef = { current: container }
    let controller: ChartAutoScrollController | null = null

    function TestComponent() {
      const result = useChartAutoScroll({
        chartRef: mockChartRef as any,
        containerRef: containerRef as any,
      })
      const controllerRef = useRef({ set: (v: ChartAutoScrollController) => { controller = v } })
      useEffect(() => { controllerRef.current.set(result) })
      return null
    }

    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)

    act(() => {
      root.render(createElement(TestComponent))
    })

    const unmount = () => {
      act(() => {
        root.unmount()
      })
      document.body.removeChild(host)
    }

    return { get controller() { return controller! }, unmount, act }
  }

  describe('followIfNeeded', () => {
    it('FOLLOWING かつ閾値到達時にスクロールが発動する', () => {
      const { controller } = renderAutoScroll()
      controller.rebuildIndexMap(1)

      mockGetVisibleLogicalRange.mockReturnValue({ from: 0, to: 10 })
      const barTime = 32400 + 9 * 60 // index 9, to=10, 9 >= 10-2=8 → true
      controller.followIfNeeded(barTime)

      expect(mockSetVisibleLogicalRange).toHaveBeenCalledTimes(1)
    })

    it('FOLLOWING だが閾値未達ではスクロールしない', () => {
      const { controller } = renderAutoScroll()
      controller.rebuildIndexMap(1)

      mockGetVisibleLogicalRange.mockReturnValue({ from: 0, to: 50 })
      const barTime = 32400 // index 0, 0 < 50-2=48 → false
      controller.followIfNeeded(barTime)

      expect(mockSetVisibleLogicalRange).not.toHaveBeenCalled()
    })
  })

  describe('wheel debounce', () => {
    it('wheel 発火 → WHEEL_SETTLE_MS 経過前に checkRefollow が呼ばれない', () => {
      const { controller, act: actFn } = renderAutoScroll()
      controller.rebuildIndexMap(1)

      const barTime = 32400 + 9 * 60
      controller.followIfNeeded(barTime)

      actFn(() => {
        container.dispatchEvent(new WheelEvent('wheel'))
      })

      mockGetVisibleLogicalRange.mockReturnValue({ from: 0, to: 10 })

      vi.advanceTimersByTime(AUTO_SCROLL_CONFIG.WHEEL_SETTLE_MS - 1)

      controller.followIfNeeded(barTime)
      expect(mockSetVisibleLogicalRange).not.toHaveBeenCalled()
    })

    it('wheel 発火 → WHEEL_SETTLE_MS 経過後に refollow 判定が走る', () => {
      const { controller, act: actFn } = renderAutoScroll()
      controller.rebuildIndexMap(1)

      const barTime = 32400 + 9 * 60
      mockGetVisibleLogicalRange.mockReturnValue({ from: 0, to: 50 })
      controller.followIfNeeded(barTime)

      actFn(() => {
        container.dispatchEvent(new WheelEvent('wheel'))
      })

      // refollow ゾーン: range { from: 0, to: 10 }, 10*0.3=3, zoneStart=7, 9>=7 → refollow
      mockGetVisibleLogicalRange.mockReturnValue({ from: 0, to: 10 })

      actFn(() => {
        vi.advanceTimersByTime(AUTO_SCROLL_CONFIG.WHEEL_SETTLE_MS)
      })

      mockSetVisibleLogicalRange.mockClear()
      controller.followIfNeeded(barTime)
      expect(mockSetVisibleLogicalRange).toHaveBeenCalled()
    })

    it('wheel 連続発火 → 最後の発火から WHEEL_SETTLE_MS 後に1回だけ判定', () => {
      const { controller, act: actFn } = renderAutoScroll()
      controller.rebuildIndexMap(1)

      const barTime = 32400 + 9 * 60
      mockGetVisibleLogicalRange.mockReturnValue({ from: 0, to: 50 })
      controller.followIfNeeded(barTime)

      actFn(() => {
        container.dispatchEvent(new WheelEvent('wheel'))
      })

      vi.advanceTimersByTime(100)

      actFn(() => {
        container.dispatchEvent(new WheelEvent('wheel'))
      })

      vi.advanceTimersByTime(AUTO_SCROLL_CONFIG.WHEEL_SETTLE_MS - 100)

      mockGetVisibleLogicalRange.mockReturnValue({ from: 0, to: 10 })
      mockSetVisibleLogicalRange.mockClear()
      controller.followIfNeeded(barTime)
      expect(mockSetVisibleLogicalRange).not.toHaveBeenCalled()

      actFn(() => {
        vi.advanceTimersByTime(100)
      })

      mockSetVisibleLogicalRange.mockClear()
      controller.followIfNeeded(barTime)
      expect(mockSetVisibleLogicalRange).toHaveBeenCalled()
    })
  })

  describe('pointer events', () => {
    it('ドラッグで DETACHED → pointerup で refollow 判定', () => {
      const { controller, act: actFn } = renderAutoScroll()
      controller.rebuildIndexMap(1)

      const barTime = 32400 + 9 * 60
      mockGetVisibleLogicalRange.mockReturnValue({ from: 0, to: 50 })
      controller.followIfNeeded(barTime)

      actFn(() => {
        container.dispatchEvent(new PointerEvent('pointerdown', {
          clientX: 100, clientY: 100, bubbles: true,
        }))
      })

      actFn(() => {
        container.dispatchEvent(new PointerEvent('pointermove', {
          clientX: 100 + AUTO_SCROLL_CONFIG.DRAG_THRESHOLD_PX + 1,
          clientY: 100,
          buttons: 1,
          bubbles: true,
        }))
      })

      mockGetVisibleLogicalRange.mockReturnValue({ from: 0, to: 10 })
      mockSetVisibleLogicalRange.mockClear()
      controller.followIfNeeded(barTime)
      expect(mockSetVisibleLogicalRange).not.toHaveBeenCalled()

      actFn(() => {
        window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
      })

      mockSetVisibleLogicalRange.mockClear()
      controller.followIfNeeded(barTime)
      expect(mockSetVisibleLogicalRange).toHaveBeenCalled()
    })

    it('pointercancel でも checkRefollow が実行される', () => {
      const { controller, act: actFn } = renderAutoScroll()
      controller.rebuildIndexMap(1)

      const barTime = 32400 + 9 * 60
      mockGetVisibleLogicalRange.mockReturnValue({ from: 0, to: 50 })
      controller.followIfNeeded(barTime)

      actFn(() => {
        container.dispatchEvent(new PointerEvent('pointerdown', {
          clientX: 0, clientY: 0, bubbles: true,
        }))
        container.dispatchEvent(new PointerEvent('pointermove', {
          clientX: 10, clientY: 10, buttons: 1, bubbles: true,
        }))
      })

      mockGetVisibleLogicalRange.mockReturnValue({ from: 0, to: 10 })

      actFn(() => {
        window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }))
      })

      mockSetVisibleLogicalRange.mockClear()
      controller.followIfNeeded(barTime)
      expect(mockSetVisibleLogicalRange).toHaveBeenCalled()
    })
  })

  describe('resetToFollowing', () => {
    it('DETACHED から FOLLOWING に復帰する', () => {
      const { controller, act: actFn } = renderAutoScroll()
      controller.rebuildIndexMap(1)

      actFn(() => {
        container.dispatchEvent(new WheelEvent('wheel'))
      })

      mockGetVisibleLogicalRange.mockReturnValue({ from: 0, to: 10 })
      const barTime = 32400 + 9 * 60
      controller.followIfNeeded(barTime)
      expect(mockSetVisibleLogicalRange).not.toHaveBeenCalled()

      controller.resetToFollowing()

      controller.followIfNeeded(barTime)
      expect(mockSetVisibleLogicalRange).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('unmount 後にタイマーが残らない', () => {
      const { act: actFn, unmount } = renderAutoScroll()

      actFn(() => {
        container.dispatchEvent(new WheelEvent('wheel'))
      })

      unmount()

      expect(vi.getTimerCount()).toBe(0)
    })
  })
})
