import { describe, it, expect } from 'vitest'
import { gameReducer, initialState } from './gameReducer'
import { ACTIONS } from '../types/game'
import type { GameState } from '../types/game'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...initialState, balance: 1_000_000, currentDate: '2025-04-07', ...overrides }
}

describe('gameReducer — 損益集計の整合性', () => {
  it('持ち越し→翌朝強制決済→START_SESSION→RECORD_DAY で全額反映', () => {
    // Day N 終了時: sessionPnL がリセット済み、ポジション持ち越し
    let state = makeState({ sessionPnL: 0, totalPnL: 10000 })

    // 翌朝 FORCE_CLOSE_ALL（オーバーナイト強制決済）
    state = gameReducer(state, {
      type: ACTIONS.FORCE_CLOSE_ALL,
      payload: { totalPnl: 5000 },
    })
    expect(state.sessionPnL).toBe(5000)

    // START_SESSION — sessionPnL が保持されること
    state = gameReducer(state, { type: ACTIONS.START_SESSION })
    expect(state.sessionPnL).toBe(5000)

    // セッション中の取引
    state = gameReducer(state, {
      type: ACTIONS.CLOSE_POSITION,
      payload: { positionId: 'p1', pnl: 3000 },
    })
    expect(state.sessionPnL).toBe(8000)

    // RECORD_DAY — dailyHistory と totalPnL の両方に全額反映
    state = gameReducer(state, { type: ACTIONS.RECORD_DAY })
    expect(state.dailyHistory).toHaveLength(1)
    expect(state.dailyHistory[0].pnl).toBe(8000)
    expect(state.totalPnL).toBe(10000 + 8000)
    expect(state.sessionPnL).toBe(0)
  })

  it('END_SESSION→大引け全決済→RECORD_DAY で totalPnL に全額反映', () => {
    let state = makeState({ sessionPnL: 2000, totalPnL: 0 })

    // END_SESSION — totalPnL は加算されない
    state = gameReducer(state, { type: ACTIONS.END_SESSION })
    expect(state.totalPnL).toBe(0)
    expect(state.sessionPnL).toBe(2000)

    // 大引け FORCE_CLOSE_ALL
    state = gameReducer(state, {
      type: ACTIONS.FORCE_CLOSE_ALL,
      payload: { totalPnl: 4000 },
    })
    expect(state.sessionPnL).toBe(6000)

    // RECORD_DAY — 全額反映
    state = gameReducer(state, { type: ACTIONS.RECORD_DAY })
    expect(state.dailyHistory).toHaveLength(1)
    expect(state.dailyHistory[0].pnl).toBe(6000)
    expect(state.totalPnL).toBe(6000)
    expect(state.sessionPnL).toBe(0)
  })

  it('通常日（持ち越しなし）で正しく記録される', () => {
    let state = makeState({ totalPnL: 0 })

    // START_SESSION
    state = gameReducer(state, { type: ACTIONS.START_SESSION })
    expect(state.sessionPnL).toBe(0)

    // セッション中の取引
    state = gameReducer(state, {
      type: ACTIONS.CLOSE_POSITION,
      payload: { positionId: 'p1', pnl: 1500 },
    })
    state = gameReducer(state, {
      type: ACTIONS.CLOSE_POSITION,
      payload: { positionId: 'p2', pnl: -500 },
    })
    expect(state.sessionPnL).toBe(1000)
    expect(state.sessionTrades).toBe(2)
    expect(state.sessionWins).toBe(1)

    // END_SESSION
    state = gameReducer(state, { type: ACTIONS.END_SESSION })
    expect(state.totalPnL).toBe(0)

    // RECORD_DAY
    state = gameReducer(state, { type: ACTIONS.RECORD_DAY })
    expect(state.dailyHistory).toHaveLength(1)
    expect(state.dailyHistory[0].pnl).toBe(1000)
    expect(state.dailyHistory[0].trades).toBe(2)
    expect(state.dailyHistory[0].wins).toBe(1)
    expect(state.totalPnL).toBe(1000)
    expect(state.sessionPnL).toBe(0)
    expect(state.sessionTrades).toBe(0)
    expect(state.sessionWins).toBe(0)
  })
})
