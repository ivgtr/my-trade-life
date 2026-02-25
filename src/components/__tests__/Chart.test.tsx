// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import type { TickData } from '../../types'
import type { ChartHandle } from '../Chart'

// ResizeObserverモック（jsdomに未実装）
vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
})

const mockUpdate = vi.fn()
const mockSetData = vi.fn()
const mockAttachPrimitive = vi.fn()
const mockDetachPrimitive = vi.fn()
const mockApplyOptions = vi.fn()
const mockSubscribeVisibleLogicalRangeChange = vi.fn()
const mockUnsubscribeVisibleLogicalRangeChange = vi.fn()
const mockGetVisibleLogicalRange = vi.fn().mockReturnValue(null)

vi.mock('lightweight-charts', () => ({
  createChart: () => ({
    addSeries: () => ({
      update: mockUpdate,
      setData: mockSetData,
      attachPrimitive: mockAttachPrimitive,
      detachPrimitive: mockDetachPrimitive,
    }),
    applyOptions: mockApplyOptions,
    remove: vi.fn(),
    timeScale: () => ({
      subscribeVisibleLogicalRangeChange: mockSubscribeVisibleLogicalRangeChange,
      unsubscribeVisibleLogicalRangeChange: mockUnsubscribeVisibleLogicalRangeChange,
      getVisibleLogicalRange: mockGetVisibleLogicalRange,
    }),
  }),
  CandlestickSeries: Symbol('CandlestickSeries'),
}))

const mockGridSetInterval = vi.fn()
vi.mock('../GridPrimitive', () => ({
  IntervalGridPrimitive: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.setInterval = mockGridSetInterval
  }),
}))

vi.mock('../../systems/ConfigManager', () => ({
  ConfigManager: {
    getChartColors: () => ({ up: '#00ff00', down: '#ff0000' }),
  },
}))

function makeTick(timestamp: number, price: number): TickData {
  return {
    timestamp,
    price,
    high: price + 5,
    low: price - 5,
    volume: 100,
    volState: 'normal',
    timeZone: 'morning',
  } as TickData
}

describe('Chart updateTick', () => {
  let ref: ReturnType<typeof createRef<ChartHandle>>
  let container: HTMLDivElement

  beforeEach(async () => {
    mockUpdate.mockClear()
    mockSetData.mockClear()
    mockAttachPrimitive.mockClear()
    mockDetachPrimitive.mockClear()
    mockApplyOptions.mockClear()
    mockSubscribeVisibleLogicalRangeChange.mockClear()
    mockUnsubscribeVisibleLogicalRangeChange.mockClear()
    mockGetVisibleLogicalRange.mockClear().mockReturnValue(null)
    mockGridSetInterval.mockClear()

    // dynamic importでモック適用後にChartを読み込む
    const { default: Chart } = await import('../Chart')

    ref = createRef<ChartHandle>()
    container = document.createElement('div')
    // clientWidth/clientHeight をモック
    Object.defineProperty(container, 'clientWidth', { value: 800 })
    Object.defineProperty(container, 'clientHeight', { value: 400 })
    document.body.appendChild(container)

    await act(() => {
      createRoot(container).render(<Chart ref={ref} autoSize={false} width={800} height={400} />)
    })
  })

  it('setData初期化 → series.setDataがセッションタイムラインで呼ばれる', () => {
    expect(mockSetData).toHaveBeenCalledTimes(1)
    const data = mockSetData.mock.calls[0][0]
    expect(data[0].time).toBe(32400)   // 09:00
    expect(data[data.length - 1].time).toBe(55800) // 15:30
    expect(data).toHaveLength(332) // tf=1のデフォルト（昼休み除外）
  })

  it('範囲内tick(540=09:00) → series.update(bar, true)が呼ばれる', () => {
    act(() => {
      ref.current!.updateTick(makeTick(540, 100))
    })
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    const [bar, historicalUpdate] = mockUpdate.mock.calls[0]
    expect(bar.time).toBe(32400)
    expect(bar.open).toBe(100)
    expect(historicalUpdate).toBe(true)
  })

  it('範囲外tick(539=08:59) → series.updateが呼ばれない', () => {
    act(() => {
      ref.current!.updateTick(makeTick(539, 100))
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('範囲外tick(931=15:31, tf=15) → timestamp判定で除外、series.updateが呼ばれない', () => {
    act(() => {
      ref.current!.updateTick(makeTick(931, 100))
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('昼休みtick(720=12:00) → isDuringLunchガードで除外、series.updateが呼ばれない', () => {
    act(() => {
      ref.current!.updateTick(makeTick(720, 100))
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('11:30境界tick(690) → series.updateが呼ばれる（前場最終）', () => {
    act(() => {
      ref.current!.updateTick(makeTick(690, 100))
    })
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('12:30境界tick(750) → series.updateが呼ばれる（後場開始）', () => {
    act(() => {
      ref.current!.updateTick(makeTick(750, 100))
    })
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })
})

describe('Chart 動的ラベル間隔（ハンドラ経路）', () => {
  let ref: ReturnType<typeof createRef<ChartHandle>>
  let container: HTMLDivElement

  beforeEach(async () => {
    mockApplyOptions.mockClear()
    mockSubscribeVisibleLogicalRangeChange.mockClear()
    mockGetVisibleLogicalRange.mockClear().mockReturnValue(null)
    mockGridSetInterval.mockClear()
    mockSetData.mockClear()

    const { default: Chart } = await import('../Chart')

    ref = createRef<ChartHandle>()
    container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: 800 })
    Object.defineProperty(container, 'clientHeight', { value: 400 })
    document.body.appendChild(container)

    await act(() => {
      createRoot(container).render(<Chart ref={ref} autoSize={false} width={800} height={400} />)
    })
  })

  it('マウント時にsubscribeVisibleLogicalRangeChangeが呼ばれる', () => {
    expect(mockSubscribeVisibleLogicalRangeChange).toHaveBeenCalledTimes(1)
    expect(typeof mockSubscribeVisibleLogicalRangeChange.mock.calls[0][0]).toBe('function')
  })

  it('ハンドラ実行(50bars相当, tf=1) → applyOptionsとsetIntervalが呼ばれる', () => {
    const handler = mockSubscribeVisibleLogicalRangeChange.mock.calls[0][0]
    mockApplyOptions.mockClear()
    mockGridSetInterval.mockClear()

    act(() => {
      handler({ from: 0, to: 49 })
    })

    expect(mockApplyOptions).toHaveBeenCalled()
    expect(mockGridSetInterval).toHaveBeenCalledWith(5)
  })

  it('ハンドラ実行で同一interval → applyOptions/setIntervalが呼ばれない（スキップ）', () => {
    const handler = mockSubscribeVisibleLogicalRangeChange.mock.calls[0][0]

    // 初回: intervalを確定
    act(() => {
      handler({ from: 0, to: 49 })
    })
    mockApplyOptions.mockClear()
    mockGridSetInterval.mockClear()

    // 2回目: 同じintervalになるrange
    act(() => {
      handler({ from: 5, to: 54 })
    })

    expect(mockApplyOptions).not.toHaveBeenCalled()
    expect(mockGridSetInterval).not.toHaveBeenCalled()
  })

  it('nullレンジ → applyOptions/setIntervalが呼ばれない', () => {
    const handler = mockSubscribeVisibleLogicalRangeChange.mock.calls[0][0]
    mockApplyOptions.mockClear()
    mockGridSetInterval.mockClear()

    act(() => {
      handler(null)
    })

    expect(mockApplyOptions).not.toHaveBeenCalled()
    expect(mockGridSetInterval).not.toHaveBeenCalled()
  })
})

describe('Chart setTimeframe経路', () => {
  let ref: ReturnType<typeof createRef<ChartHandle>>
  let container: HTMLDivElement

  beforeEach(async () => {
    mockApplyOptions.mockClear()
    mockSubscribeVisibleLogicalRangeChange.mockClear()
    mockGetVisibleLogicalRange.mockClear().mockReturnValue(null)
    mockGridSetInterval.mockClear()
    mockSetData.mockClear()

    const { default: Chart } = await import('../Chart')

    ref = createRef<ChartHandle>()
    container = document.createElement('div')
    Object.defineProperty(container, 'clientWidth', { value: 800 })
    Object.defineProperty(container, 'clientHeight', { value: 400 })
    document.body.appendChild(container)

    await act(() => {
      createRoot(container).render(<Chart ref={ref} autoSize={false} width={800} height={400} />)
    })
  })

  it('setTimeframe(5, history) → rangeが返る場合applyOptionsとsetIntervalが呼ばれる', () => {
    // 初期interval=30（tf=1, 332bars）。range指定で異なるintervalにする
    mockGetVisibleLogicalRange.mockReturnValue({ from: 0, to: 9 })
    mockApplyOptions.mockClear()
    mockGridSetInterval.mockClear()

    const history = [makeTick(540, 100), makeTick(545, 105)]

    act(() => {
      ref.current!.setTimeframe(5, history)
    })

    // computeGridInterval(5, 10) = 5 ≠ 30 → 更新される
    expect(mockApplyOptions).toHaveBeenCalled()
    expect(mockGridSetInterval).toHaveBeenCalledWith(5)
  })

  it('setTimeframe時にgetVisibleLogicalRange()がnull → totalBarsフォールバックでinterval算出', () => {
    // 初期interval=30。ハンドラで5に変更してからsetTimeframeでnullフォールバックを検証
    const handler = mockSubscribeVisibleLogicalRangeChange.mock.calls[0][0]
    act(() => {
      handler({ from: 0, to: 49 })
    })
    // intervalRef is now 5

    mockGetVisibleLogicalRange.mockReturnValue(null)
    mockApplyOptions.mockClear()
    mockGridSetInterval.mockClear()

    act(() => {
      ref.current!.setTimeframe(15, [makeTick(540, 100)])
    })

    // tf=15 totalBars=24 → computeGridInterval(15, 24) = 30 ≠ 5 → 更新される
    expect(mockGridSetInterval).toHaveBeenCalledWith(30)
  })
})
