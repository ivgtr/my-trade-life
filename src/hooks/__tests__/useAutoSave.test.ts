import { describe, it, expect } from 'vitest'
import { computeDailyCloseState } from '../useAutoSave'
import { initialState } from '../../state/gameReducer'
import type { GameState } from '../../types/game'

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...initialState,
    balance: 1_000_000,
    currentDate: '2025-04-07',
    ...overrides,
  }
}

describe('computeDailyCloseState', () => {
  it('dailyHistory にエントリ追加、totalPnL += sessionPnL、session フィールドリセット', () => {
    const state = makeState({
      sessionPnL: 5000,
      sessionTrades: 3,
      sessionWins: 2,
      totalPnL: 10000,
    })

    const result = computeDailyCloseState(state)

    expect(result.dailyHistory).toHaveLength(1)
    expect(result.dailyHistory[0].pnl).toBe(5000)
    expect(result.dailyHistory[0].trades).toBe(3)
    expect(result.dailyHistory[0].wins).toBe(2)
    expect(result.totalPnL).toBe(15000)
    expect(result.sessionPnL).toBe(0)
    expect(result.sessionTrades).toBe(0)
    expect(result.sessionWins).toBe(0)
  })

  it('EXP加算: calculateDailyBonus の結果が exp に加算される', () => {
    const state = makeState({
      sessionTrades: 10,
      sessionWins: 5,
      exp: 0,
    })

    const result = computeDailyCloseState(state)

    // winRate=0.5, effectiveTrades=10, bonus=floor(0.5*10*5)=25
    expect(result.exp).toBe(25)
  })

  it('取引ゼロ日: ゼロエントリ追加、exp 変化なし', () => {
    const state = makeState({
      sessionPnL: 0,
      sessionTrades: 0,
      sessionWins: 0,
      exp: 50,
    })

    const result = computeDailyCloseState(state)

    expect(result.dailyHistory).toHaveLength(1)
    expect(result.dailyHistory[0].pnl).toBe(0)
    expect(result.exp).toBe(50)
  })

  it('オーバーナイト強制決済日: sessionPnL が totalPnL に反映', () => {
    const state = makeState({
      sessionPnL: 3000,
      sessionTrades: 0,
      sessionWins: 0,
      totalPnL: 5000,
    })

    const result = computeDailyCloseState(state)

    expect(result.dailyHistory).toHaveLength(1)
    expect(result.dailyHistory[0].pnl).toBe(3000)
    expect(result.totalPnL).toBe(8000)
  })

  it('レベルアップ閾値到達: level / maxLeverage / unlockedFeatures が更新', () => {
    // exp 50 + bonus 50 (10取引10勝) = 100 → Lv2
    const state = makeState({
      level: 1,
      exp: 50,
      sessionTrades: 10,
      sessionWins: 10,
      unlockedFeatures: [],
    })

    const result = computeDailyCloseState(state)

    expect(result.level).toBe(2)
    expect(result.unlockedFeatures).toContain('dailySentimentIcon')
    expect(result.maxLeverage).toBe(1)
  })

  it('レベルアップ未到達: level / maxLeverage / unlockedFeatures 変更なし', () => {
    const state = makeState({
      level: 1,
      exp: 0,
      sessionTrades: 1,
      sessionWins: 1,
      // bonus=floor(1.0*1*5)=5 → exp=5 < 100
      unlockedFeatures: [],
      maxLeverage: 1,
    })

    const result = computeDailyCloseState(state)

    expect(result.level).toBe(1)
    expect(result.unlockedFeatures).toEqual([])
    expect(result.maxLeverage).toBe(1)
  })

  it('複数レベル同時アップ: 全レベルの features が累積', () => {
    // EXP_TABLE: 2:100, 3:300, 4:600
    const state = makeState({
      level: 1,
      exp: 600,
      sessionTrades: 0,
      sessionWins: 0,
      unlockedFeatures: [],
    })

    const result = computeDailyCloseState(state)

    expect(result.level).toBe(4)
    expect(result.unlockedFeatures).toContain('dailySentimentIcon')
    expect(result.unlockedFeatures).toContain('dailySentimentValue')
    expect(result.unlockedFeatures).toContain('anomalyDisplay')
    expect(result.maxLeverage).toBe(3)
  })
})
