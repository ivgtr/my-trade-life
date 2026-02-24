import React, { createContext } from 'react'
import type { GameState, GameAction } from '../types/game'

export interface GameContextValue {
  gameState: GameState
  dispatch: React.Dispatch<GameAction>
}

export const GameContext = createContext<GameContextValue | null>(null)
