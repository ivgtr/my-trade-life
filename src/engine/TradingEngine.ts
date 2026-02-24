import type { Position, TradeResult, UnrealizedPnL, DailySummary } from '../types/trading'

interface TradingEngineConfig {
  balance: number
  maxLeverage: number
}

interface TradingEngineState {
  balance: number
  maxLeverage: number
  positions: Position[]
  closedTrades: TradeResult[]
}

/**
 * トレードエンジン（ETF信用取引モデル）。
 * ポジション管理・損益計算を担う engine 層の中核コンポーネント。
 */
export class TradingEngine {
  #balance: number
  #maxLeverage: number
  #positions: Map<string, Position>
  #closedTrades: TradeResult[]

  constructor({ balance, maxLeverage }: TradingEngineConfig) {
    this.#balance = balance
    this.#maxLeverage = maxLeverage
    this.#positions = new Map()
    this.#closedTrades = []
  }

  /** 証拠金を計算する（ETF信用取引: 株数 × 価格 / 信用倍率） */
  #calcMargin(shares: number, price: number, leverage: number): number {
    return shares * price / leverage
  }

  /** 損益を計算する（ETF信用取引: 価格差 × 株数） */
  #calcPnL(direction: 'LONG' | 'SHORT', entryPrice: number, exitPrice: number, shares: number): number {
    const diff = direction === 'LONG'
      ? exitPrice - entryPrice
      : entryPrice - exitPrice
    return diff * shares
  }

  /** ポジションを新規建てする */
  openPosition(direction: 'LONG' | 'SHORT', shares: number, price: number, leverage: number): Position | null {
    if (direction !== 'LONG' && direction !== 'SHORT') return null
    if (shares <= 0 || price <= 0) return null
    if (leverage < 1 || leverage > this.#maxLeverage) return null

    const margin = this.#calcMargin(shares, price, leverage)
    if (margin > this.#balance) return null

    this.#balance -= margin

    const id = crypto.randomUUID()
    const position: Position = {
      id,
      direction,
      shares,
      entryPrice: price,
      leverage,
      margin,
      unrealizedPnL: 0,
    }

    this.#positions.set(id, position)
    return { ...position }
  }

  /** ポジションを決済する */
  closePosition(positionId: string, price: number): TradeResult | null {
    const position = this.#positions.get(positionId)
    if (!position) return null

    const pnl = this.#calcPnL(
      position.direction,
      position.entryPrice,
      price,
      position.shares
    )

    this.#balance += position.margin + pnl
    this.#positions.delete(positionId)

    const result: TradeResult = {
      positionId,
      pnl,
      isProfit: pnl > 0,
      entryPrice: position.entryPrice,
      exitPrice: price,
    }

    this.#closedTrades.push(result)
    return result
  }

  /** 全ポジションを強制決済する（大引け用） */
  forceCloseAll(price: number): TradeResult[] {
    const ids = [...this.#positions.keys()]
    const results: TradeResult[] = []
    for (const id of ids) {
      const result = this.closePosition(id, price)
      if (result) results.push(result)
    }
    return results
  }

  /** 含み損益を再計算する */
  recalculateUnrealized(currentPrice: number): UnrealizedPnL {
    let total = 0
    for (const position of this.#positions.values()) {
      const pnl = this.#calcPnL(
        position.direction,
        position.entryPrice,
        currentPrice,
        position.shares
      )
      position.unrealizedPnL = pnl
      total += pnl
    }
    return { total, effectiveBalance: this.#balance + total }
  }

  /** 日次の取引結果サマリーを返す */
  getDailySummary(): DailySummary {
    const trades = this.#closedTrades.length
    const wins = this.#closedTrades.filter((t) => t.pnl > 0).length
    const losses = trades - wins
    const winRate = trades > 0 ? wins / trades : 0
    const totalPnL = this.#closedTrades.reduce((sum, t) => sum + t.pnl, 0)

    return {
      trades,
      wins,
      losses,
      winRate,
      totalPnL,
      closedTrades: [...this.#closedTrades],
    }
  }

  /** 現在の残高を返す */
  getBalance(): number {
    return this.#balance
  }

  /** 保有ポジション一覧を返す */
  getPositions(): Position[] {
    return [...this.#positions.values()].map((p) => ({ ...p }))
  }

  /** 状態をシリアライズして返す。復元用。 */
  serialize(): TradingEngineState {
    return {
      balance: this.#balance,
      maxLeverage: this.#maxLeverage,
      positions: this.getPositions(),
      closedTrades: [...this.#closedTrades],
    }
  }
}
