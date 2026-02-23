import { createContext, useContext, useReducer } from 'react'
import { gameReducer, initialState } from './gameReducer'

/**
 * ゲーム状態を共有するための Context。
 * @type {React.Context<{ gameState: Object, dispatch: Function } | null>}
 */
const GameContext = createContext(null)

/**
 * ゲーム状態を子コンポーネントに提供する Provider。
 * @param {{ children: React.ReactNode }} props
 */
export function GameProvider({ children }) {
  const [gameState, dispatch] = useReducer(gameReducer, initialState)

  return (
    <GameContext.Provider value={{ gameState, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

/**
 * ゲーム状態と dispatch を取得するカスタムフック。
 * GameProvider の外で呼び出された場合はエラーを投げる。
 * @returns {{ gameState: Object, dispatch: Function }}
 */
export function useGameContext() {
  const context = useContext(GameContext)
  if (context === null) {
    throw new Error('useGameContext は GameProvider の内部で使用してください')
  }
  return context
}
