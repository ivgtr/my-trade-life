export interface Position {
  id: string
  direction: 'LONG' | 'SHORT'
  shares: number
  entryPrice: number
  leverage: number
  margin: number
  unrealizedPnL: number
}

export interface TradeResult {
  positionId: string
  pnl: number
  isProfit: boolean
  entryPrice: number
  exitPrice: number
}

export interface UnrealizedPnL {
  total: number
  effectiveBalance: number
}

export interface DailySummary {
  trades: number
  wins: number
  losses: number
  winRate: number
  totalPnL: number
  closedTrades: TradeResult[]
}
