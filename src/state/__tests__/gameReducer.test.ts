import { describe, it, expect } from 'vitest'
import { gameReducer, initialState } from '../gameReducer'
import { ACTIONS } from '../../types/game'
import type { GameState, GameAction } from '../../types/game'

function makeState(overrides?: Partial<GameState>): GameState {
  return { ...initialState, balance: 1_000_000, currentPrice: 30000, ...overrides }
}

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
