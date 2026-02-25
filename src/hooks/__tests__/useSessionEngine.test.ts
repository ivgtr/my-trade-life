// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { ACTIONS } from '../../state/actions'
import type { GameState, GameAction } from '../../types'
import type { Direction } from '../../types/trading'

const { mockOpenPosition, mockPlaySE } = vi.hoisted(() => ({
  mockOpenPosition: vi.fn(),
  mockPlaySE: vi.fn(),
}))

vi.mock('../../engine/MarketEngine', () => ({
  MarketEngine: class {
    start() {}
    stop() {}
    setSpeed() {}
    getCurrentTime() { return { formatted: '09:00' } }
    injectExternalForce() {}
    resumeFromLunch() {}
  },
}))

vi.mock('../../engine/TradingEngine', () => ({
  TradingEngine: class {
    openPosition = mockOpenPosition
    closePosition() { return null }
    forceCloseAll() { return [] }
    checkSLTP() { return [] }
    recalculateUnrealized() {
      return { total: 0, effectiveBalance: 0, availableCash: 0, creditMargin: 0, buyingPower: 0 }
    }
    getPositions() { return [] }
    getDailySummary() {
      return { trades: 0, wins: 0, losses: 0, winRate: 0, totalPnL: 0, closedTrades: [] }
    }
    setSLTP() { return true }
    getBuyingPowerInfo() { return { availableCash: 0, creditMargin: 0, buyingPower: 0 } }
  },
}))

vi.mock('../../engine/NewsSystem', () => ({
  NewsSystem: class {
    scheduleSessionEvents() {}
    checkTriggers() {}
    getExternalForce() { return 0 }
  },
}))

vi.mock('../../systems/AudioSystem', () => ({
  AudioSystem: {
    playSE: mockPlaySE,
    playBGM() {},
  },
}))

import { useSessionEngine } from '../useSessionEngine'

function createGameState(overrides?: Partial<GameState>): GameState {
  return {
    phase: 'session',
    balance: 1_000_000,
    currentPrice: 30000,
    positions: [],
    maxLeverage: 1,
    speed: 1,
    ...overrides,
  } as GameState
}

interface CapturedResult {
  handleEntry: (direction: Direction, shares: number) => void
}

function renderHook(gameState: GameState, dispatch: React.Dispatch<GameAction>): CapturedResult {
  const captured = {} as CapturedResult
  const chartRef = { current: null }

  function TestComponent() {
    const result = useSessionEngine({ gameState, dispatch, chartRef })
    const capturedRef = useRef(captured)
    useEffect(() => { capturedRef.current.handleEntry = result.handleEntry })
    return null
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(createElement(TestComponent))
  })

  return captured
}

describe('useSessionEngine handleEntry', () => {
  const dispatch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handleEntry("LONG", 10) → openPosition("LONG", 10, price) → dispatch(OPEN_POSITION)', () => {
    const fakePos = { id: '1', direction: 'LONG' as const, shares: 10, entryPrice: 30000, leverage: 1, margin: 300000, unrealizedPnL: 0 }
    mockOpenPosition.mockReturnValue(fakePos)

    const gameState = createGameState()
    const result = renderHook(gameState, dispatch)

    act(() => {
      result.handleEntry('LONG', 10)
    })

    expect(mockOpenPosition).toHaveBeenCalledWith('LONG', 10, 30000)
    expect(dispatch).toHaveBeenCalledWith({
      type: ACTIONS.OPEN_POSITION,
      payload: { position: fakePos },
    })
    expect(mockPlaySE).toHaveBeenCalledWith('entry')
  })

  it('handleEntry("SHORT", 5) → openPosition("SHORT", 5, price) → dispatch(OPEN_POSITION)', () => {
    const fakePos = { id: '2', direction: 'SHORT' as const, shares: 5, entryPrice: 30000, leverage: 1, margin: 150000, unrealizedPnL: 0 }
    mockOpenPosition.mockReturnValue(fakePos)

    const gameState = createGameState()
    const result = renderHook(gameState, dispatch)

    act(() => {
      result.handleEntry('SHORT', 5)
    })

    expect(mockOpenPosition).toHaveBeenCalledWith('SHORT', 5, 30000)
    expect(dispatch).toHaveBeenCalledWith({
      type: ACTIONS.OPEN_POSITION,
      payload: { position: fakePos },
    })
    expect(mockPlaySE).toHaveBeenCalledWith('entry')
  })

  it('openPositionがnullを返した場合 → dispatchにOPEN_POSITIONが発行されない', () => {
    mockOpenPosition.mockReturnValue(null)

    const gameState = createGameState()
    const result = renderHook(gameState, dispatch)

    act(() => {
      result.handleEntry('LONG', 100)
    })

    expect(mockOpenPosition).toHaveBeenCalledWith('LONG', 100, 30000)
    const openPositionCalls = dispatch.mock.calls.filter(
      (call) => call[0].type === ACTIONS.OPEN_POSITION,
    )
    expect(openPositionCalls).toHaveLength(0)
    expect(mockPlaySE).not.toHaveBeenCalledWith('entry')
  })
})
