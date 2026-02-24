import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { createChart } from 'lightweight-charts'

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
 */
const Chart = forwardRef(function Chart({ width = '100%', height = 400 }, ref) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)
  /** @type {React.MutableRefObject<{open:number,high:number,low:number,close:number,time:number}|null>} */
  const currentBarRef = useRef(null)

  useImperativeHandle(ref, () => ({
    /**
     * TickDataを受けてシリーズを更新する。
     * @param {{ price: number, timestamp: number }} tickData
     */
    updateTick(tickData) {
      if (!seriesRef.current) return

      const { price, timestamp } = tickData
      // timestampはゲーム内時刻（分）。1分ごとに新しいバーを作成
      const barTime = Math.floor(timestamp)

      if (!currentBarRef.current || currentBarRef.current.time !== barTime) {
        // 新しいバーを開始
        currentBarRef.current = {
          time: barTime,
          open: price,
          high: price,
          low: price,
          close: price,
        }
      } else {
        // 既存バーを更新
        currentBarRef.current.high = Math.max(currentBarRef.current.high, price)
        currentBarRef.current.low = Math.min(currentBarRef.current.low, price)
        currentBarRef.current.close = price
      }

      seriesRef.current.update({ ...currentBarRef.current })
    },

    /**
     * チャートデータをクリアする。
     */
    reset() {
      if (seriesRef.current) {
        seriesRef.current.setData([])
      }
      currentBarRef.current = null
    },
  }))

  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      ...CHART_OPTIONS,
      width: typeof width === 'number' ? width : containerRef.current.clientWidth,
      height,
    })
    chartRef.current = chart

    const series = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })
    seriesRef.current = series

    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
        })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [width, height])

  return (
    <div
      ref={containerRef}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: `${height}px`,
      }}
    />
  )
})

export default Chart
