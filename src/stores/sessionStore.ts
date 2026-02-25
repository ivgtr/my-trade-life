import { createStore } from 'zustand/vanilla'
import type { Position } from '../types'

export interface SessionStoreState {
  currentPrice: number
  unrealizedPnL: number
  availableCash: number
  creditMargin: number
  buyingPower: number
  positions: Position[]
  gameTime: string
}

export const createSessionStore = (initial: SessionStoreState) =>
  createStore<SessionStoreState>(() => initial)

export type SessionStore = ReturnType<typeof createSessionStore>
