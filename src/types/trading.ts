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

export interface BuyingPowerInfo {
  availableCash: number
  creditMargin: number
  buyingPower: number
}

export interface UnrealizedPnL {
  total: number
  effectiveBalance: number
  availableCash: number
  creditMargin: number
  buyingPower: number
}

export interface DailySummary {
  trades: number
  wins: number
  losses: number
  winRate: number
  totalPnL: number
  closedTrades: TradeResult[]
}
