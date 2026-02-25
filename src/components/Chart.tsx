import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { createChart, CandlestickSeries } from 'lightweight-charts'
import type { CandlestickData } from 'lightweight-charts'
import type { TickData, Timeframe } from '../types'
import { ConfigManager } from '../systems/ConfigManager'
import { asGameMinutes, toBarTime, createTickMarkFormatter, chartTimeFormatter, computeGridInterval, toVisibleBarCount } from '../utils/chartTime'
import { buildBars, mergeTickIntoBar, generateSessionTimeline } from '../utils/chartBarBuilder'
import { SESSION_START_MINUTES, SESSION_END_MINUTES } from '../constants/sessionTime'
import { IntervalGridPrimitive } from './GridPrimitive'

interface ChartProps {
  autoSize?: boolean
  width?: number | string
  height?: number | string
}

export interface ChartHandle {
  updateTick: (tickData: TickData) => void
  setTimeframe: (tf: Timeframe, history: TickData[]) => void
  reset: () => void
}

const CHART_OPTIONS = {
  layout: {
    background: { color: '#1a1a2e' },
    textColor: '#a0a0b0',
  },
  grid: {
    vertLines: { visible: false },
    horzLines: { color: '#2a2a3e' },
  },
  crosshair: {
    mode: 0 as const,
  },
  localization: {
    timeFormatter: chartTimeFormatter,
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    borderColor: '#2a2a3e',
    uniformDistribution: true,
  },
  rightPriceScale: {
    borderColor: '#2a2a3e',
  },
}

const Chart = forwardRef<ChartHandle, ChartProps>(function Chart({ autoSize = true, width, height }, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const seriesRef = useRef<ReturnType<ReturnType<typeof createChart>['addSeries']> | null>(null)
  const currentBarRef = useRef<CandlestickData | null>(null)
  const timeframeRef = useRef<Timeframe>(1)
  const intervalRef = useRef<number>(0)
  const gridPrimitiveRef = useRef<IntervalGridPrimitive | null>(null)

  function applyInterval(newInterval: number) {
    if (newInterval === intervalRef.current) return
    intervalRef.current = newInterval
    chartRef.current?.applyOptions({
      timeScale: { tickMarkFormatter: createTickMarkFormatter(newInterval) },
    })
    gridPrimitiveRef.current?.setInterval(newInterval)
  }

  useImperativeHandle(ref, () => ({
    updateTick(tickData: TickData) {
      if (!seriesRef.current) return

      const { timestamp } = tickData
      if (timestamp < SESSION_START_MINUTES || timestamp > SESSION_END_MINUTES) return

      const tf = timeframeRef.current
      const barTime = toBarTime(asGameMinutes(timestamp), tf)

      if (!currentBarRef.current || currentBarRef.current.time !== barTime) {
        currentBarRef.current = mergeTickIntoBar(null, tickData, barTime)
      } else {
        currentBarRef.current = mergeTickIntoBar(currentBarRef.current, tickData, barTime)
      }

      seriesRef.current.update({ ...currentBarRef.current }, true)
    },

    setTimeframe(tf: Timeframe, history: TickData[]) {
      timeframeRef.current = tf
      if (!seriesRef.current) return

      const bars = buildBars(history, tf)
      seriesRef.current.setData(bars)

      const range = chartRef.current?.timeScale().getVisibleLogicalRange()
      const totalBars = generateSessionTimeline(tf).length
      const visibleBars = range ? toVisibleBarCount(range) : totalBars
      applyInterval(computeGridInterval(tf, visibleBars))

      let lastCandle: CandlestickData | null = null
      for (let i = bars.length - 1; i >= 0; i--) {
        if ('open' in bars[i]) { lastCandle = { ...bars[i] } as CandlestickData; break }
      }
      currentBarRef.current = lastCandle
    },

    reset() {
      if (seriesRef.current) {
        seriesRef.current.setData(generateSessionTimeline(timeframeRef.current))
      }
      currentBarRef.current = null
    },
  }))

  useEffect(() => {
    if (!containerRef.current) return

    const el = containerRef.current
    const initWidth = width ?? el.clientWidth
    const initHeight = height ?? el.clientHeight

    const chart = createChart(el, {
      ...CHART_OPTIONS,
      width: typeof initWidth === 'number' ? initWidth : el.clientWidth,
      height: typeof initHeight === 'number' ? initHeight : el.clientHeight,
    })
    chartRef.current = chart

    const { up, down } = ConfigManager.getChartColors()
    const series = chart.addSeries(CandlestickSeries, {
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
    })
    seriesRef.current = series
    series.setData(generateSessionTimeline(timeframeRef.current))

    const range = chart.timeScale().getVisibleLogicalRange()
    const initialBars = range
      ? toVisibleBarCount(range)
      : generateSessionTimeline(timeframeRef.current).length
    const initialInterval = computeGridInterval(timeframeRef.current, initialBars)
    intervalRef.current = initialInterval
    chart.applyOptions({
      timeScale: { tickMarkFormatter: createTickMarkFormatter(initialInterval) },
    })

    const gridPrimitive = new IntervalGridPrimitive(initialInterval)
    series.attachPrimitive(gridPrimitive)
    gridPrimitiveRef.current = gridPrimitive

    const handleVisibleRangeChange = (logicalRange: { from: number; to: number } | null) => {
      if (!logicalRange) return
      const visibleBars = toVisibleBarCount(logicalRange)
      applyInterval(computeGridInterval(timeframeRef.current, visibleBars))
    }
    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleRangeChange)

    let ro: ResizeObserver | null = null
    if (autoSize) {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: w, height: h } = entry.contentRect
          if (chartRef.current && w > 0 && h > 0) {
            chartRef.current.applyOptions({ width: w, height: h })
          }
        }
      })
      ro.observe(el)
    }

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange)
      if (ro) ro.disconnect()
      series.detachPrimitive(gridPrimitive)
      gridPrimitiveRef.current = null
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [autoSize, width, height])

  return (
    <div
      ref={containerRef}
      className={autoSize ? 'w-full h-full min-h-[200px]' : ''}
      style={
        autoSize
          ? undefined
          : {
              width: typeof width === 'number' ? `${width}px` : (width ?? '100%'),
              height: typeof height === 'number' ? `${height}px` : (height ?? '400px'),
            }
      }
    />
  )
})

export default Chart
