import { gameReducer } from '../state/gameReducer'
import { calculateDailyBonus, checkLevelUp, getMaxLeverage } from '../engine/GrowthSystem'
import { ACTIONS } from '../state/actions'
import type { GameState, GameAction } from '../types/game'

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
