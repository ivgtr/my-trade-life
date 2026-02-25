import { describe, it, expect } from 'vitest'
import { gameReducer, initialState } from './gameReducer'
import { ACTIONS } from '../types/game'
import type { GameState } from '../types/game'
import type { LevelUpResult } from '../types/growth'

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

describe('gameReducer — LEVEL_UP / CLEAR_LEVEL_UP', () => {
  const sampleLevelUp: LevelUpResult = {
    newLevel: 3,
    unlocks: [
      { level: 2, features: ['dailySentimentIcon'], leverage: null, label: '地合いアイコン表示' },
      { level: 3, features: ['dailySentimentValue'], leverage: 2, label: '地合い実強度数値' },
    ],
  }

  it('LEVEL_UP で newFeatures が既存 unlockedFeatures にマージされる', () => {
    const state = makeState({ unlockedFeatures: ['existingFeature'], level: 1, maxLeverage: 1 })
    const result = gameReducer(state, {
      type: ACTIONS.LEVEL_UP,
      payload: {
        level: 3,
        newFeatures: ['dailySentimentIcon', 'dailySentimentValue'],
        maxLeverage: 2,
        lastLevelUp: sampleLevelUp,
      },
    })
    expect(result.level).toBe(3)
    expect(result.unlockedFeatures).toContain('existingFeature')
    expect(result.unlockedFeatures).toContain('dailySentimentIcon')
    expect(result.unlockedFeatures).toContain('dailySentimentValue')
    expect(result.maxLeverage).toBe(2)
  })

  it('LEVEL_UP で lastLevelUp が保存される', () => {
    const state = makeState()
    const result = gameReducer(state, {
      type: ACTIONS.LEVEL_UP,
      payload: {
        level: 3,
        newFeatures: ['dailySentimentIcon', 'dailySentimentValue'],
        maxLeverage: 2,
        lastLevelUp: sampleLevelUp,
      },
    })
    expect(result.lastLevelUp).toEqual(sampleLevelUp)
  })

  it('LEVEL_UP で重複 features が除去される', () => {
    const state = makeState({ unlockedFeatures: ['dailySentimentIcon'] })
    const result = gameReducer(state, {
      type: ACTIONS.LEVEL_UP,
      payload: {
        level: 2,
        newFeatures: ['dailySentimentIcon'],
        maxLeverage: 1,
        lastLevelUp: { newLevel: 2, unlocks: [] },
      },
    })
    const count = result.unlockedFeatures.filter(f => f === 'dailySentimentIcon').length
    expect(count).toBe(1)
  })

  it('CLEAR_LEVEL_UP で lastLevelUp が null になる', () => {
    const state = makeState({ lastLevelUp: sampleLevelUp })
    const result = gameReducer(state, { type: ACTIONS.CLEAR_LEVEL_UP })
    expect(result.lastLevelUp).toBeNull()
  })

  it('LOAD_GAME で lastLevelUp がクリアされる', () => {
    const state = makeState({ lastLevelUp: sampleLevelUp })
    const result = gameReducer(state, {
      type: ACTIONS.LOAD_GAME,
      payload: { gameState: { balance: 2000000 } },
    })
    expect(result.lastLevelUp).toBeNull()
  })
})
