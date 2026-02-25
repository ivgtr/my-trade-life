// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import TradePanel from '../TradePanel'

const baseProps = {
  currentPrice: 30000,
  availableCash: 1_000_000,
  creditMargin: 0,
  buyingPower: 1_000_000,
  maxLeverage: 1,
  positions: [],
  onEntry: vi.fn(),
  onClose: vi.fn(),
  onCloseAll: vi.fn(),
  onSetSLTP: vi.fn().mockReturnValue(true),
}

describe('TradePanel onEntry コールバック', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('デスクトップ版: 初期状態(0株)ではLONG/SHORTがdisabled', () => {
    act(() => {
      root.render(createElement(TradePanel, { ...baseProps, compact: false }))
    })

    const buttons = container.querySelectorAll('button')
    const longButton = Array.from(buttons).find((btn) => btn.textContent === 'LONG')
    const shortButton = Array.from(buttons).find((btn) => btn.textContent === 'SHORT')
    expect(longButton!.disabled).toBe(true)
    expect(shortButton!.disabled).toBe(true)
  })

  it('デスクトップ版: +1で株数設定後、LONGボタンクリック → onEntry("LONG", 1) が呼ばれる', () => {
    const onEntry = vi.fn()
    act(() => {
      root.render(createElement(TradePanel, { ...baseProps, onEntry, compact: false }))
    })

    const buttons = container.querySelectorAll('button')
    const plusOneButton = Array.from(buttons).find((btn) => btn.textContent === '+1')
    expect(plusOneButton).toBeDefined()
    act(() => {
      plusOneButton!.click()
    })

    const longButton = Array.from(container.querySelectorAll('button')).find((btn) => btn.textContent === 'LONG')
    expect(longButton!.disabled).toBe(false)
    act(() => {
      longButton!.click()
    })

    expect(onEntry).toHaveBeenCalledWith('LONG', 1)
  })

  it('デスクトップ版: +1で株数設定後、SHORTボタンクリック → onEntry("SHORT", 1) が呼ばれる', () => {
    const onEntry = vi.fn()
    act(() => {
      root.render(createElement(TradePanel, { ...baseProps, onEntry, compact: false }))
    })

    const buttons = container.querySelectorAll('button')
    const plusOneButton = Array.from(buttons).find((btn) => btn.textContent === '+1')
    act(() => {
      plusOneButton!.click()
    })

    const shortButton = Array.from(container.querySelectorAll('button')).find((btn) => btn.textContent === 'SHORT')
    expect(shortButton!.disabled).toBe(false)
    act(() => {
      shortButton!.click()
    })

    expect(onEntry).toHaveBeenCalledWith('SHORT', 1)
  })

  it('モバイル版: LONGタップ → モーダル → +1で株数設定 → 注文確定 → onEntry("LONG", 1) が呼ばれる', () => {
    const onEntry = vi.fn()
    act(() => {
      root.render(createElement(TradePanel, { ...baseProps, onEntry, compact: true }))
    })

    // LONGボタンをタップしてモーダルを開く
    const footerButtons = container.querySelectorAll('button')
    const longTapButton = Array.from(footerButtons).find((btn) => btn.textContent === 'LONG')
    expect(longTapButton).toBeDefined()

    act(() => {
      longTapButton!.click()
    })

    // モーダル内の+1ボタンで株数を設定
    const plusOneButton = Array.from(document.querySelectorAll('button')).find(
      (btn) => btn.textContent === '+1',
    )
    expect(plusOneButton).toBeDefined()
    act(() => {
      plusOneButton!.click()
    })

    // 注文確定ボタンを押す
    const confirmButton = Array.from(document.querySelectorAll('button')).find(
      (btn) => btn.textContent?.includes('注文確定'),
    )
    expect(confirmButton).toBeDefined()
    expect(confirmButton!.disabled).toBe(false)

    act(() => {
      confirmButton!.click()
    })

    expect(onEntry).toHaveBeenCalledWith('LONG', 1)
  })
})
