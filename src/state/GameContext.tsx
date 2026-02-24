import React, { createContext, useContext, useReducer } from 'react'
import { gameReducer, initialState } from './gameReducer'
import type { GameState, GameAction } from '../types/game'

interface GameContextValue {
  gameState: GameState
  dispatch: React.Dispatch<GameAction>
}

const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState)

  return (
    <GameContext.Provider value={{ gameState, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGameContext(): GameContextValue {
  const context = useContext(GameContext)
  if (context === null) {
    throw new Error('useGameContext は GameProvider の内部で使用してください')
  }
  return context
}
