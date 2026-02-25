// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { computeDailyCloseState, useAutoSave } from '../useAutoSave'
import { initialState } from '../../state/gameReducer'
import { ACTIONS } from '../../types/game'
import { SaveSystem } from '../../systems/SaveSystem'
import type { GameState, GamePhase, GameAction } from '../../types/game'

vi.mock('../../systems/SaveSystem', () => ({
  SaveSystem: {
    save: vi.fn(),
  },
}))

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
    expect(result.dailyHistory[0].trades).toBe(0)
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

describe('useAutoSave — saveAndTransition', () => {
  const mockSave = SaveSystem.save as ReturnType<typeof vi.fn>
  let container: HTMLDivElement

  beforeEach(() => {
    mockSave.mockClear()
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  function renderAutoSave(
    state: GameState,
    dispatch: React.Dispatch<GameAction>,
  ) {
    const resultRef = { current: null as ReturnType<typeof useAutoSave> | null }

    function TestComponent() {
      const result = useAutoSave(dispatch, state)
      resultRef.current = result
      return null
    }

    act(() => {
      createRoot(container).render(createElement(TestComponent))
    })

    return resultRef
  }

  it('保存対象フェーズで SaveSystem.save が呼ばれる', () => {
    const dispatch = vi.fn()
    const state = makeState()
    const ref = renderAutoSave(state, dispatch)

    act(() => {
      ref.current!.saveAndTransition('calendar')
    })

    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({
      type: ACTIONS.SET_PHASE,
      payload: { phase: 'calendar' },
    })
  })

  it('非対象フェーズで SaveSystem.save は呼ばれない', () => {
    const dispatch = vi.fn()
    const state = makeState()
    const ref = renderAutoSave(state, dispatch)

    const nonSavePhases: GamePhase[] = ['morning', 'session', 'report', 'closing']
    for (const phase of nonSavePhases) {
      act(() => {
        ref.current!.saveAndTransition(phase)
      })
    }

    expect(mockSave).not.toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledTimes(nonSavePhases.length)
  })

  it('commitDailyResult: true 時に computeDailyCloseState 経由のデータが保存される', () => {
    const dispatch = vi.fn()
    const state = makeState({
      sessionPnL: 5000,
      sessionTrades: 3,
      sessionWins: 2,
      totalPnL: 10000,
    })
    const ref = renderAutoSave(state, dispatch)

    act(() => {
      ref.current!.saveAndTransition('calendar', { commitDailyResult: true })
    })

    expect(mockSave).toHaveBeenCalledTimes(1)
    const savedData = mockSave.mock.calls[0][0] as GameState
    // computeDailyCloseState 適用後: totalPnL = 15000, sessionPnL = 0
    expect(savedData.totalPnL).toBe(15000)
    expect(savedData.sessionPnL).toBe(0)
    expect(savedData.dailyHistory).toHaveLength(1)
  })

  it('commitDailyResult なしでは gameState がそのまま保存される', () => {
    const dispatch = vi.fn()
    const state = makeState({
      sessionPnL: 5000,
      totalPnL: 10000,
    })
    const ref = renderAutoSave(state, dispatch)

    act(() => {
      ref.current!.saveAndTransition('calendar')
    })

    expect(mockSave).toHaveBeenCalledTimes(1)
    const savedData = mockSave.mock.calls[0][0] as GameState
    expect(savedData.totalPnL).toBe(10000)
    expect(savedData.sessionPnL).toBe(5000)
  })

  it('いずれの場合も dispatch(SET_PHASE) が実行される', () => {
    const dispatch = vi.fn()
    const state = makeState()
    const ref = renderAutoSave(state, dispatch)

    act(() => {
      ref.current!.saveAndTransition('monthlyReport')
    })

    expect(dispatch).toHaveBeenCalledWith({
      type: ACTIONS.SET_PHASE,
      payload: { phase: 'monthlyReport' },
    })
  })
})
