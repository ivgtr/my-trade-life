import { createStore } from 'zustand/vanilla'
import type { TickData } from '../types'

const CAPACITY = 100

export interface TickStoreState {
  ticks: TickData[]
  push: (tick: TickData) => void
  clear: () => void
}

export const createTickStore = () =>
  createStore<TickStoreState>((set) => ({
    ticks: [],
    push: (tick) =>
      set((s) => ({
        ticks:
          s.ticks.length >= CAPACITY
            ? [...s.ticks.slice(-(CAPACITY - 1)), tick]
            : [...s.ticks, tick],
      })),
    clear: () => set({ ticks: [] }),
  }))

export type TickStore = ReturnType<typeof createTickStore>
