import { useCallback } from 'react'
import { gameReducer } from '../state/gameReducer'
import { calculateDailyBonus, checkLevelUp, getMaxLeverage } from '../engine/GrowthSystem'
import { ACTIONS } from '../state/actions'
import { SaveSystem } from '../systems/SaveSystem'
import type { GameStateInput } from '../systems/SaveSystem'
import type { GameState, GamePhase, GameAction } from '../types/game'

const AUTOSAVE_PHASES: ReadonlySet<GamePhase> = new Set([
  'calendar',
  'monthlyReport',
  'yearlyReport',
])

/**
 * 日次確定ロジックの単一定義。
 * gameReducer を直接チェーンし、RECORD_DAY → ADD_EXP → LEVEL_UP を適用した state を返す純粋関数。
 */
export function computeDailyCloseState(state: GameState): GameState {
  // 1. RECORD_DAY
  let s = gameReducer(state, { type: ACTIONS.RECORD_DAY } as GameAction)

  // 2. ADD_EXP
  const trades = state.sessionTrades ?? 0
  const wins = state.sessionWins ?? 0
  const bonusExp = calculateDailyBonus(trades, wins)
  if (bonusExp > 0) {
    s = gameReducer(s, { type: ACTIONS.ADD_EXP, payload: { amount: bonusExp } } as GameAction)
  }

  // 3. LEVEL_UP
  const levelResult = checkLevelUp(s.level, s.exp)
  if (levelResult) {
    const newFeatures = levelResult.unlocks.flatMap(e => e.features)
    s = gameReducer(s, {
      type: ACTIONS.LEVEL_UP,
      payload: {
        level: levelResult.newLevel,
        newFeatures,
        maxLeverage: getMaxLeverage(levelResult.newLevel),
        lastLevelUp: levelResult,
      },
    } as GameAction)
  }

  return s
}

/**
 * フェーズ遷移時の自動バックアップセーブフック。
 * 保存対象フェーズへの遷移時に SaveSystem.save() を呼び出してから dispatch する。
 */
export function useAutoSave(
  dispatch: React.Dispatch<GameAction>,
  gameState: GameState,
) {
  const saveAndTransition = useCallback(
    (phase: GamePhase, options?: { commitDailyResult?: boolean }) => {
      if (AUTOSAVE_PHASES.has(phase)) {
        const snapshot = options?.commitDailyResult
          ? computeDailyCloseState(gameState)
          : gameState
        SaveSystem.save(snapshot as GameStateInput)
      }
      dispatch({ type: ACTIONS.SET_PHASE, payload: { phase } })
    },
    [dispatch, gameState],
  )

  return { saveAndTransition }
}
