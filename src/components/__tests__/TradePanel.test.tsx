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

  it('デスクトップ版: LONGボタンクリック → onEntry("LONG", shares) が呼ばれる', () => {
    const onEntry = vi.fn()
    act(() => {
      root.render(createElement(TradePanel, { ...baseProps, onEntry, compact: false }))
    })

    const buttons = container.querySelectorAll('button')
    const longButton = Array.from(buttons).find((btn) => btn.textContent === 'LONG')
    expect(longButton).toBeDefined()

    act(() => {
      longButton!.click()
    })

    expect(onEntry).toHaveBeenCalledWith('LONG', 1)
  })

  it('デスクトップ版: SHORTボタンクリック → onEntry("SHORT", shares) が呼ばれる', () => {
    const onEntry = vi.fn()
    act(() => {
      root.render(createElement(TradePanel, { ...baseProps, onEntry, compact: false }))
    })

    const buttons = container.querySelectorAll('button')
    const shortButton = Array.from(buttons).find((btn) => btn.textContent === 'SHORT')
    expect(shortButton).toBeDefined()

    act(() => {
      shortButton!.click()
    })

    expect(onEntry).toHaveBeenCalledWith('SHORT', 1)
  })

  it('モバイル版: LONGタップ → モーダル → 注文確定 → onEntry("LONG", shares) が呼ばれる', () => {
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

    // モーダルが表示される → 注文確定ボタンを押す
    const confirmButton = Array.from(document.querySelectorAll('button')).find(
      (btn) => btn.textContent?.includes('注文確定'),
    )
    expect(confirmButton).toBeDefined()

    act(() => {
      confirmButton!.click()
    })

    expect(onEntry).toHaveBeenCalledWith('LONG', 1)
  })
})
