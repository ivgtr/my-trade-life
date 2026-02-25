import { useRef, useCallback, useEffect } from 'react'
import type { LineData } from 'lightweight-charts'
import type { ChartHandle } from '../components/Chart'
import type { TickData, Timeframe } from '../types'
import type { MAPeriod } from '../constants/maSpecs'
import { MA_SPECS } from '../constants/maSpecs'
import { computeMA } from '../utils/maCalculator'
import { buildBars } from '../utils/chartBarBuilder'
import { asGameMinutes, toBarTime } from '../utils/chartTime'
import { SESSION_START_MINUTES, SESSION_END_MINUTES, isDuringLunch } from '../constants/sessionTime'

interface UseMAOverlayConfig {
  chartRef: React.RefObject<ChartHandle | null>
  getTickHistory: () => TickData[]
  timeframe: Timeframe
  maVisible: boolean
}

interface UseMAOverlayReturn {
  handleTick: (tick: TickData) => void
  rebuildMA: () => void
}

export function useMAOverlay({
  chartRef,
  getTickHistory,
  timeframe,
  maVisible,
}: UseMAOverlayConfig): UseMAOverlayReturn {
  const closePricesRef = useRef<number[]>([])
  const runningSumsRef = useRef<Map<MAPeriod, number>>(new Map())
  const lastBarTimeRef = useRef<number | null>(null)

  const rebuildMA = useCallback(() => {
    const history = getTickHistory()
    const allBars = buildBars(history, timeframe)

    // 実データ（CandlestickData）がある最後のバーまでにトリム。
    // buildBarsはセッション全体のタイムライン（〜15:30）を返すが、
    // 未来のWhitespaceDataをMAシリーズに含めるとupdate()が
    // "Cannot update oldest data"エラーになるため除外する。
    let lastDataIdx = -1
    for (let i = allBars.length - 1; i >= 0; i--) {
      if ('close' in allBars[i]) {
        lastDataIdx = i
        break
      }
    }
    const bars = lastDataIdx >= 0 ? allBars.slice(0, lastDataIdx + 1) : []

    const allMAData = {} as Record<MAPeriod, ReturnType<typeof computeMA>>
    for (const spec of MA_SPECS) {
      allMAData[spec.period] = computeMA(bars, spec.period)
    }
    chartRef.current?.setAllMAData(allMAData)

    // closePricesRefを再構築
    const closes: number[] = []
    for (const bar of bars) {
      if ('close' in bar) {
        closes.push(bar.close)
      }
    }
    closePricesRef.current = closes

    // runningSumsを再計算
    const sums = new Map<MAPeriod, number>()
    for (const spec of MA_SPECS) {
      const p = spec.period
      let sum = 0
      const startIdx = Math.max(0, closes.length - p)
      for (let i = startIdx; i < closes.length; i++) {
        sum += closes[i]
      }
      sums.set(p, sum)
    }
    runningSumsRef.current = sums

    // lastBarTimeを更新
    lastBarTimeRef.current = lastDataIdx >= 0 ? (bars[lastDataIdx].time as number) : null
  }, [chartRef, getTickHistory, timeframe])

  const handleTick = useCallback((tick: TickData) => {
    if (!maVisible) return

    const { timestamp, price } = tick
    if (timestamp < SESSION_START_MINUTES || timestamp > SESSION_END_MINUTES) return
    if (isDuringLunch(timestamp)) return

    const barTime = toBarTime(asGameMinutes(timestamp), timeframe) as number
    const isNewBar = lastBarTimeRef.current !== barTime
    lastBarTimeRef.current = barTime

    const closes = closePricesRef.current
    if (isNewBar) {
      closes.push(price)
    } else {
      if (closes.length > 0) {
        // 現在のバーのcloseを更新: runningSumsから古い値を引いて新しい値を足す
        const oldClose = closes[closes.length - 1]
        closes[closes.length - 1] = price
        for (const spec of MA_SPECS) {
          const p = spec.period
          if (closes.length >= p) {
            const oldSum = runningSumsRef.current.get(p) ?? 0
            runningSumsRef.current.set(p, oldSum - oldClose + price)
          }
        }
      }
    }

    if (isNewBar) {
      // 新しいバーの場合、runningSumsを更新
      for (const spec of MA_SPECS) {
        const p = spec.period
        const oldSum = runningSumsRef.current.get(p) ?? 0
        let newSum = oldSum + price
        if (closes.length > p) {
          newSum -= closes[closes.length - p - 1]
        }
        runningSumsRef.current.set(p, newSum)
      }
    }

    // MA値を計算して更新
    const updates: { period: MAPeriod; point: LineData }[] = []
    for (const spec of MA_SPECS) {
      const p = spec.period
      if (closes.length >= p) {
        const sum = runningSumsRef.current.get(p) ?? 0
        updates.push({
          period: p,
          point: { time: barTime, value: sum / p } as LineData,
        })
      }
    }

    if (updates.length > 0) {
      chartRef.current?.updateMAPoints(updates)
    }
  }, [maVisible, timeframe, chartRef])

  // maVisible ON時にフルリビルド + visible切替
  useEffect(() => {
    chartRef.current?.setMAVisible(maVisible)
    if (maVisible) {
      rebuildMA()
    }
  }, [maVisible, chartRef, rebuildMA])

  // timeframe変更時にMA再構築（maVisible ONの場合のみ）
  useEffect(() => {
    if (maVisible) {
      rebuildMA()
    }
  }, [timeframe, maVisible, rebuildMA])

  return { handleTick, rebuildMA }
}
