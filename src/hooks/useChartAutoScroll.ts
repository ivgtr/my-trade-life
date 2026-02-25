import { useRef, useEffect, useCallback } from 'react'
import type { createChart } from 'lightweight-charts'
import type { RefObject } from 'react'
import type { Timeframe } from '../types'
import { generateSessionTimeline } from '../utils/chartBarBuilder'

// --- 定数 ---

export const AUTO_SCROLL_CONFIG = {
  DRAG_THRESHOLD_PX: 3,
  SCROLL_TRIGGER_BARS: 2,
  RIGHT_MARGIN_BARS: 5,
  WHEEL_SETTLE_MS: 150,
  REFOLLOW_ZONE_RATIO: 0.3,
} as const

// --- 状態機械（純粋関数） ---

export type ScrollState = 'FOLLOWING' | 'DETACHED'
export type ScrollEvent =
  | 'USER_SCROLL'
  | 'USER_DRAG'
  | 'RESET'
  | 'TIMEFRAME_CHANGE'
  | 'USER_RETURN'

export function transition(current: ScrollState, event: ScrollEvent): ScrollState {
  if (current === 'FOLLOWING') {
    if (event === 'USER_SCROLL' || event === 'USER_DRAG') return 'DETACHED'
    return 'FOLLOWING'
  }
  if (event === 'RESET' || event === 'TIMEFRAME_CHANGE' || event === 'USER_RETURN') {
    return 'FOLLOWING'
  }
  return 'DETACHED'
}

// --- スクロール判定（純粋関数） ---

export function shouldScroll(
  currentBarIndex: number,
  range: { from: number; to: number },
): boolean {
  return currentBarIndex >= range.to - AUTO_SCROLL_CONFIG.SCROLL_TRIGGER_BARS
}

export function computeScrollRange(
  currentBarIndex: number,
  visibleBars: number,
): { from: number; to: number } {
  const newTo = currentBarIndex + AUTO_SCROLL_CONFIG.RIGHT_MARGIN_BARS + 1
  return { from: newTo - visibleBars, to: newTo }
}

export function shouldRefollow(
  currentBarIndex: number,
  range: { from: number; to: number },
): boolean {
  const visibleBars = range.to - range.from
  const isVisible = currentBarIndex >= range.from && currentBarIndex <= range.to
  const isNearRight = currentBarIndex >= range.to - visibleBars * AUTO_SCROLL_CONFIG.REFOLLOW_ZONE_RATIO
  return isVisible && isNearRight
}

// --- フック ---

interface UseChartAutoScrollOptions {
  chartRef: RefObject<ReturnType<typeof createChart> | null>
  containerRef: RefObject<HTMLDivElement | null>
}

export interface ChartAutoScrollController {
  followIfNeeded: (barTime: number) => void
  resetToFollowing: () => void
  rebuildIndexMap: (tf: Timeframe) => void
}

export function useChartAutoScroll({
  chartRef,
  containerRef,
}: UseChartAutoScrollOptions): ChartAutoScrollController {
  const stateRef = useRef<ScrollState>('FOLLOWING')
  const currentBarTimeRef = useRef<number | null>(null)
  const indexMapRef = useRef<Map<number, number>>(new Map())

  function dispatch(event: ScrollEvent) {
    stateRef.current = transition(stateRef.current, event)
  }

  const checkRefollow = useCallback(() => {
    if (stateRef.current !== 'DETACHED') return
    const chart = chartRef.current
    if (!chart || currentBarTimeRef.current === null) return

    const index = indexMapRef.current.get(currentBarTimeRef.current)
    if (index === undefined) return

    const range = chart.timeScale().getVisibleLogicalRange()
    if (!range) return

    if (shouldRefollow(index, range)) {
      dispatch('USER_RETURN')
    }
  }, [chartRef])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let wheelTimerId: ReturnType<typeof setTimeout> | null = null
    const onWheel = () => {
      dispatch('USER_SCROLL')
      if (wheelTimerId !== null) clearTimeout(wheelTimerId)
      wheelTimerId = setTimeout(() => {
        wheelTimerId = null
        checkRefollow()
      }, AUTO_SCROLL_CONFIG.WHEEL_SETTLE_MS)
    }
    el.addEventListener('wheel', onWheel, { passive: true })

    let dragOriginX = 0
    let dragOriginY = 0

    const onPointerUp = () => {
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      checkRefollow()
    }
    const onPointerDown = (e: PointerEvent) => {
      dragOriginX = e.clientX
      dragOriginY = e.clientY
      window.addEventListener('pointerup', onPointerUp, { once: true })
      window.addEventListener('pointercancel', onPointerUp, { once: true })
    }
    const onPointerMove = (e: PointerEvent) => {
      if (e.buttons === 0) return
      const dx = Math.abs(e.clientX - dragOriginX)
      const dy = Math.abs(e.clientY - dragOriginY)
      if (
        dx > AUTO_SCROLL_CONFIG.DRAG_THRESHOLD_PX ||
        dy > AUTO_SCROLL_CONFIG.DRAG_THRESHOLD_PX
      ) {
        dispatch('USER_DRAG')
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)

    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      if (wheelTimerId !== null) clearTimeout(wheelTimerId)
    }
  }, [containerRef, checkRefollow])

  const followIfNeeded = useCallback((barTime: number) => {
    currentBarTimeRef.current = barTime

    if (stateRef.current !== 'FOLLOWING') return
    const chart = chartRef.current
    if (!chart) return

    const index = indexMapRef.current.get(barTime)
    if (index === undefined) return

    const ts = chart.timeScale()
    const range = ts.getVisibleLogicalRange()
    if (!range) return

    if (!shouldScroll(index, range)) return

    const visibleBars = range.to - range.from
    ts.setVisibleLogicalRange(computeScrollRange(index, visibleBars))
  }, [chartRef])

  const resetToFollowing = useCallback(() => {
    dispatch('RESET')
  }, [])

  const rebuildIndexMap = useCallback((tf: Timeframe) => {
    const timeline = generateSessionTimeline(tf)
    const map = new Map<number, number>()
    timeline.forEach((entry, i) => {
      map.set(entry.time as number, i)
    })
    indexMapRef.current = map
  }, [])

  return { followIfNeeded, resetToFollowing, rebuildIndexMap }
}
