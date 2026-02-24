import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { createChart, CandlestickSeries } from 'lightweight-charts'

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
    mode: 0,
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    borderColor: '#2a2a3e',
  },
  rightPriceScale: {
    borderColor: '#2a2a3e',
  },
}

/**
 * lightweight-charts v5 ラッパーコンポーネント。
 * TickDataを受けてリアルタイム更新する。React再レンダリングを回避するため
 * ref経由でupdateTick/resetを公開する。
 *
 * autoSize=true（デフォルト）: ResizeObserverで親コンテナに完全追従。
 * 親に width/height を CSS で指定すること（flex:1 等）。
 */
const Chart = forwardRef(function Chart({ autoSize = true, width, height }, ref) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  /** @type {React.MutableRefObject<{open:number,high:number,low:number,close:number,time:number}|null>} */
  const currentBarRef = useRef(null)

  useImperativeHandle(ref, () => ({
    updateTick(tickData) {
      if (!seriesRef.current) return

      const { price, timestamp } = tickData
      const barTime = Math.floor(timestamp)

      if (!currentBarRef.current || currentBarRef.current.time !== barTime) {
        currentBarRef.current = {
          time: barTime,
          open: price,
          high: price,
          low: price,
          close: price,
        }
      } else {
        currentBarRef.current.high = Math.max(currentBarRef.current.high, price)
        currentBarRef.current.low = Math.min(currentBarRef.current.low, price)
        currentBarRef.current.close = price
      }

      seriesRef.current.update({ ...currentBarRef.current })
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

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })
    seriesRef.current = series

    let ro = null
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

  const containerStyle = autoSize
    ? { width: '100%', height: '100%', minHeight: '200px' }
    : {
        width: typeof width === 'number' ? `${width}px` : (width ?? '100%'),
        height: typeof height === 'number' ? `${height}px` : (height ?? '400px'),
      }

  return <div ref={containerRef} style={containerStyle} />
})

export default Chart
