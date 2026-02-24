import React, { useReducer } from 'react'
import { gameReducer, initialState } from './gameReducer'
import { GameContext } from './gameContextDef'

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState)

  return (
    <GameContext.Provider value={{ gameState, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}
