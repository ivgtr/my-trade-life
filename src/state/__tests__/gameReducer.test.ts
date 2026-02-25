import { describe, it, expect } from 'vitest'
import { gameReducer, initialState } from '../gameReducer'
import { ACTIONS } from '../../types/game'
import type { GameState, GameAction } from '../../types/game'
import type { LevelUpResult } from '../../types/growth'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return { ...initialState, balance: 1_000_000, currentDate: '2025-04-07', currentPrice: 30000, ...overrides }
}

describe('gameReducer — 損益集計の整合性', () => {
  it('持ち越し→翌朝強制決済→START_SESSION→RECORD_DAY で全額反映', () => {
    let state = makeState({ sessionPnL: 0, totalPnL: 10000 })

    state = gameReducer(state, {
      type: ACTIONS.FORCE_CLOSE_ALL,
      payload: { totalPnl: 5000 },
    })
    expect(state.sessionPnL).toBe(5000)

    state = gameReducer(state, { type: ACTIONS.START_SESSION })
    expect(state.sessionPnL).toBe(5000)

    state = gameReducer(state, {
      type: ACTIONS.CLOSE_POSITION,
      payload: { positionId: 'p1', pnl: 3000 },
    })
    expect(state.sessionPnL).toBe(8000)

    state = gameReducer(state, { type: ACTIONS.RECORD_DAY })
    expect(state.dailyHistory).toHaveLength(1)
    expect(state.dailyHistory[0].pnl).toBe(8000)
    expect(state.totalPnL).toBe(10000 + 8000)
    expect(state.sessionPnL).toBe(0)
  })

  it('END_SESSION→大引け全決済→RECORD_DAY で totalPnL に全額反映', () => {
    let state = makeState({ sessionPnL: 2000, totalPnL: 0 })

    state = gameReducer(state, { type: ACTIONS.END_SESSION })
    expect(state.totalPnL).toBe(0)
    expect(state.sessionPnL).toBe(2000)

    state = gameReducer(state, {
      type: ACTIONS.FORCE_CLOSE_ALL,
      payload: { totalPnl: 4000 },
    })
    expect(state.sessionPnL).toBe(6000)

    state = gameReducer(state, { type: ACTIONS.RECORD_DAY })
    expect(state.dailyHistory).toHaveLength(1)
    expect(state.dailyHistory[0].pnl).toBe(6000)
    expect(state.totalPnL).toBe(6000)
    expect(state.sessionPnL).toBe(0)
  })

  it('通常日（持ち越しなし）で正しく記録される', () => {
    let state = makeState({ totalPnL: 0 })

    state = gameReducer(state, { type: ACTIONS.START_SESSION })
    expect(state.sessionPnL).toBe(0)

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

    state = gameReducer(state, { type: ACTIONS.END_SESSION })
    expect(state.totalPnL).toBe(0)

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

describe('ADVANCE_DAY', () => {
  it('デフォルト increment: day +1', () => {
    const state = makeState({ day: 5, currentDate: '2025-01-05' })
    const result = gameReducer(state, {
      type: ACTIONS.ADVANCE_DAY,
      payload: { date: '2025-01-06' },
    })
    expect(result.day).toBe(6)
    expect(result.currentDate).toBe('2025-01-06')
  })

  it('dayIncrement: 2 で day +2（日曜スキップ）', () => {
    const state = makeState({ day: 5, currentDate: '2025-01-10' })
    const result = gameReducer(state, {
      type: ACTIONS.ADVANCE_DAY,
      payload: { date: '2025-01-12', dayIncrement: 2 },
    })
    expect(result.day).toBe(7)
    expect(result.currentDate).toBe('2025-01-12')
  })
})

describe('INIT_NEW_GAME with currentDate', () => {
  it('currentDate がセットされる', () => {
    const state = makeState()
    const result = gameReducer(state, {
      type: ACTIONS.INIT_NEW_GAME,
      payload: { currentDate: '2025-01-01' },
    })
    expect(result.currentDate).toBe('2025-01-01')
    expect(result.day).toBe(1)
    expect(result.balance).toBe(1_000_000)
  })
})

describe('gameReducer new actions', () => {
  describe('SET_DAY_CONTEXT', () => {
    it('currentPrice 更新、unrealizedPnL=0 リセット、dailyCondition 等の設定', () => {
      const state = makeState({ unrealizedPnL: 500 })
      const action: GameAction = {
        type: ACTIONS.SET_DAY_CONTEXT,
        payload: {
          currentPrice: 30100,
          unrealizedPnL: 0,
          dailyCondition: { displaySentiment: '強気', actualSentiment: '弱気', actualStrength: 0.5, isAccurate: false },
          regimeParams: { drift: 0.01, volMult: 1.2, regime: 'bullish' },
          anomalyParams: { driftBias: 0, volBias: 1, tendency: '' },
          gapResult: { openPrice: 30100, gapAmount: 100, gapPercent: 0.33, isGapUp: true },
          overnightSettled: false,
          overnightPnL: 0,
        },
      }
      const result = gameReducer(state, action)
      expect(result.currentPrice).toBe(30100)
      expect(result.unrealizedPnL).toBe(0)
      expect(result.dailyCondition?.displaySentiment).toBe('強気')
      expect(result.regimeParams?.regime).toBe('bullish')
      expect(result.gapResult?.gapAmount).toBe(100)
    })
  })

  describe('SET_WEEKEND_DATA', () => {
    it('currentPrice 更新、unrealizedPnL=0 リセット、weekendNews 設定', () => {
      const state = makeState({ unrealizedPnL: 1000 })
      const weekendNews = [{ id: 'test-1', headline: 'テストニュース', impact: 0.01 }]
      const action: GameAction = {
        type: ACTIONS.SET_WEEKEND_DATA,
        payload: {
          currentPrice: 30000,
          unrealizedPnL: 0,
          weekendNews,
        },
      }
      const result = gameReducer(state, action)
      expect(result.currentPrice).toBe(30000)
      expect(result.unrealizedPnL).toBe(0)
      expect(result.weekendNews).toBe(weekendNews)
    })
  })

  describe('SET_REPORT_DATA', () => {
    it('monthlyStats/yearlyStats 設定、unrealizedPnL=0 リセット', () => {
      const state = makeState({ unrealizedPnL: 2000 })
      const monthlyStats = { totalPnL: 50000, totalTrades: 20, winRate: 0.6, averagePnL: 2500 }
      const yearlyStats = { totalPnL: 200000, totalTrades: 100, winRate: 0.55, maxDrawdown: 30000 }

      const action1: GameAction = {
        type: ACTIONS.SET_REPORT_DATA,
        payload: { monthlyStats },
      }
      const result1 = gameReducer(state, action1)
      expect(result1.unrealizedPnL).toBe(0)
      expect(result1.monthlyStats).toBe(monthlyStats)

      const action2: GameAction = {
        type: ACTIONS.SET_REPORT_DATA,
        payload: { yearlyStats, yearPreview: [] },
      }
      const result2 = gameReducer(state, action2)
      expect(result2.unrealizedPnL).toBe(0)
      expect(result2.yearlyStats).toBe(yearlyStats)
    })
  })

  describe('SYNC_SESSION_END', () => {
    it('セッション最終値の同期', () => {
      const state = makeState()
      const positions = [
        { id: '1', direction: 'LONG' as const, shares: 10, entryPrice: 30000, leverage: 1, margin: 300000, unrealizedPnL: 1000 },
      ]
      const action: GameAction = {
        type: ACTIONS.SYNC_SESSION_END,
        payload: {
          currentPrice: 30100,
          unrealizedPnL: 1000,
          positions,
          availableCash: 700000,
          creditMargin: 0,
          buyingPower: 700000,
        },
      }
      const result = gameReducer(state, action)
      expect(result.currentPrice).toBe(30100)
      expect(result.unrealizedPnL).toBe(1000)
      expect(result.positions).toBe(positions)
      expect(result.availableCash).toBe(700000)
      expect(result.buyingPower).toBe(700000)
    })
  })
})

describe('gameReducer — ABORT_SESSION', () => {
  it('START_SESSION が preSessionSnapshot を保存する', () => {
    const state = makeState({ balance: 1_500_000, totalTrades: 10, totalWins: 6 })
    const result = gameReducer(state, { type: ACTIONS.START_SESSION })
    expect(result.preSessionSnapshot).toBeDefined()
    expect(result.preSessionSnapshot!.balance).toBe(1_500_000)
    expect(result.preSessionSnapshot!.totalTrades).toBe(10)
    expect(result.preSessionSnapshot!.totalWins).toBe(6)
    expect(result.sessionActive).toBe(true)
  })

  it('ABORT_SESSION がスナップショットから状態を復元する', () => {
    let state = makeState({ balance: 1_000_000, totalTrades: 5, peakBalance: 1_000_000 })

    // セッション開始
    state = gameReducer(state, { type: ACTIONS.START_SESSION })

    // セッション中に取引で残高変動
    state = gameReducer(state, {
      type: ACTIONS.CLOSE_POSITION,
      payload: { positionId: 'p1', pnl: -50000 },
    })
    expect(state.balance).toBe(950_000)
    expect(state.totalTrades).toBe(6)

    // ABORT_SESSION で巻き戻し
    state = gameReducer(state, { type: ACTIONS.ABORT_SESSION })
    expect(state.balance).toBe(1_000_000)
    expect(state.totalTrades).toBe(5)
    expect(state.peakBalance).toBe(1_000_000)
    expect(state.phase).toBe('title')
    expect(state.sessionActive).toBe(false)
    expect(state.sessionPnL).toBe(0)
    expect(state.sessionTrades).toBe(0)
    expect(state.sessionWins).toBe(0)
    expect(state.preSessionSnapshot).toBeUndefined()
  })

  it('ABORT_SESSION でスナップショットがない場合でも安全に動作する', () => {
    const state = makeState({ preSessionSnapshot: undefined, sessionActive: true })
    const result = gameReducer(state, { type: ACTIONS.ABORT_SESSION })
    expect(result.phase).toBe('title')
    expect(result.sessionActive).toBe(false)
    expect(result.sessionPnL).toBe(0)
  })

  it('END_SESSION が preSessionSnapshot をクリアする', () => {
    let state = makeState()
    state = gameReducer(state, { type: ACTIONS.START_SESSION })
    expect(state.preSessionSnapshot).toBeDefined()

    state = gameReducer(state, { type: ACTIONS.END_SESSION })
    expect(state.preSessionSnapshot).toBeUndefined()
    expect(state.sessionActive).toBe(false)
  })
})
