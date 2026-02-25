import { describe, it, expect, vi } from 'vitest'
import { createTickStore } from '../tickStore'
import type { TickData } from '../../types'

function makeTick(price: number, timestamp: number): TickData {
  return { price, high: price, low: price, volume: 100, timestamp, volState: 'normal', timeZone: 'morning' }
}

describe('tickStore', () => {
  it('push: 容量内での追加動作', () => {
    const store = createTickStore()
    store.getState().push(makeTick(30000, 540))
    store.getState().push(makeTick(30010, 541))
    expect(store.getState().ticks).toHaveLength(2)
    expect(store.getState().ticks[0].price).toBe(30000)
    expect(store.getState().ticks[1].price).toBe(30010)
  })

  it('push: 容量超過時のリングバッファ切り捨て動作', () => {
    const store = createTickStore()
    for (let i = 0; i < 105; i++) {
      store.getState().push(makeTick(30000 + i, 540 + i))
    }
    const ticks = store.getState().ticks
    expect(ticks).toHaveLength(100)
    expect(ticks[0].price).toBe(30005)
    expect(ticks[99].price).toBe(30104)
  })

  it('subscribe: push 時にリスナーが1回だけ呼ばれる', () => {
    const store = createTickStore()
    const listener = vi.fn()
    store.subscribe(listener)

    store.getState().push(makeTick(30000, 540))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('clear: バッファクリア + リスナー通知', () => {
    const store = createTickStore()
    store.getState().push(makeTick(30000, 540))
    store.getState().push(makeTick(30010, 541))

    const listener = vi.fn()
    store.subscribe(listener)

    store.getState().clear()
    expect(store.getState().ticks).toHaveLength(0)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
