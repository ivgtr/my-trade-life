import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { createChart, CandlestickSeries } from 'lightweight-charts'
import type { CandlestickData, UTCTimestamp } from 'lightweight-charts'
import type { TickData, Timeframe } from '../types'
import { ConfigManager } from '../systems/ConfigManager'

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

function formatGameTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(Math.floor(m)).padStart(2, '0')}`
}

function buildBarsFromHistory(history: TickData[], tf: Timeframe): CandlestickData[] {
  const bars = new Map<number, CandlestickData>()
  for (const tick of history) {
    const barTime = Math.floor(tick.timestamp / tf) * tf
    const existing = bars.get(barTime)
    if (existing) {
      existing.high = Math.max(existing.high, tick.high)
      existing.low = Math.min(existing.low, tick.low)
      existing.close = tick.price
    } else {
      bars.set(barTime, {
        time: barTime as UTCTimestamp,
        open: tick.price,
        high: tick.high,
        low: tick.low,
        close: tick.price,
      })
    }
  }
  return Array.from(bars.values())
}

const CHART_OPTIONS = {
  layout: {
    background: { color: '#1a1a2e' },
    textColor: '#a0a0b0',
  },
  grid: {
    vertLines: { color: '#2a2a3e' },
    horzLines: { color: '#2a2a3e' },
  },
  crosshair: {
    mode: 0 as const,
  },
  localization: {
    timeFormatter: (time: number) => formatGameTime(time),
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    borderColor: '#2a2a3e',
    tickMarkFormatter: (time: number) => formatGameTime(time),
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

  useImperativeHandle(ref, () => ({
    updateTick(tickData: TickData) {
      if (!seriesRef.current) return

      const { price, high, low, timestamp } = tickData
      const tf = timeframeRef.current
      const barTime = (Math.floor(timestamp / tf) * tf) as UTCTimestamp

      if (!currentBarRef.current || currentBarRef.current.time !== barTime) {
        currentBarRef.current = {
          time: barTime,
          open: price,
          high,
          low,
          close: price,
        }
      } else {
        currentBarRef.current.high = Math.max(currentBarRef.current.high, high)
        currentBarRef.current.low = Math.min(currentBarRef.current.low, low)
        currentBarRef.current.close = price
      }

      seriesRef.current.update({ ...currentBarRef.current })
    },

    setTimeframe(tf: Timeframe, history: TickData[]) {
      timeframeRef.current = tf
      if (!seriesRef.current) return
      const bars = buildBarsFromHistory(history, tf)
      seriesRef.current.setData(bars)
      currentBarRef.current = bars.length > 0 ? { ...bars[bars.length - 1] } : null
    },

    reset() {
      if (seriesRef.current) {
        seriesRef.current.setData([])
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
      if (ro) ro.disconnect()
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
