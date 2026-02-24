import { useContext } from 'react'
import { GameContext } from '../state/gameContextDef'
import type { GameContextValue } from '../state/gameContextDef'

export function useGameContext(): GameContextValue {
  const context = useContext(GameContext)
  if (context === null) {
    throw new Error('useGameContext は GameProvider の内部で使用してください')
  }
  return context
}
