import { describe, it, expect, vi } from 'vitest'
import { createSessionStore } from '../sessionStore'
import type { SessionStoreState } from '../sessionStore'

function makeInitial(): SessionStoreState {
  return {
    currentPrice: 30000,
    unrealizedPnL: 0,
    availableCash: 1_000_000,
    creditMargin: 0,
    buyingPower: 1_000_000,
    positions: [],
    gameTime: '09:00',
  }
}

describe('sessionStore', () => {
  it('setState: 部分更新の正確性（他フィールドが保持される）', () => {
    const store = createSessionStore(makeInitial())

    store.setState({ currentPrice: 30100, unrealizedPnL: 500 })

    const state = store.getState()
    expect(state.currentPrice).toBe(30100)
    expect(state.unrealizedPnL).toBe(500)
    expect(state.availableCash).toBe(1_000_000)
    expect(state.gameTime).toBe('09:00')
  })

  it('subscribe: setState 時にリスナーが1回だけ呼ばれる', () => {
    const store = createSessionStore(makeInitial())
    const listener = vi.fn()
    store.subscribe(listener)

    store.setState({
      currentPrice: 30100,
      unrealizedPnL: 500,
      gameTime: '09:01',
    })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('positions: setState ごとに新しい参照が設定される', () => {
    const store = createSessionStore(makeInitial())

    const pos1 = [{ id: '1', direction: 'LONG' as const, shares: 10, entryPrice: 30000, leverage: 1, margin: 300000, unrealizedPnL: 0 }]
    store.setState({ positions: pos1 })
    expect(store.getState().positions).toBe(pos1)

    const pos2 = [{ id: '1', direction: 'LONG' as const, shares: 10, entryPrice: 30000, leverage: 1, margin: 300000, unrealizedPnL: 100 }]
    store.setState({ positions: pos2 })
    expect(store.getState().positions).toBe(pos2)
    expect(store.getState().positions).not.toBe(pos1)
  })
})
