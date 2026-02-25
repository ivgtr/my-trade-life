import type { Position, TradeResult, UnrealizedPnL, BuyingPowerInfo, DailySummary } from '../types/trading'
import { floorToTick, ceilToTick } from './priceGrid'

interface TradingEngineConfig {
  balance: number
  maxLeverage: number
  existingPositions?: Position[]
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

  constructor({ balance, maxLeverage, existingPositions }: TradingEngineConfig) {
    this.#balance = balance
    this.#maxLeverage = maxLeverage
    this.#positions = new Map()
    this.#closedTrades = []
    if (existingPositions) {
      for (const pos of existingPositions) {
        this.#positions.set(pos.id, { ...pos })
      }
    }
  }

  /** 証拠金を計算する（ETF信用取引: 株数 × 価格 / 信用倍率） */
  #calcMargin(shares: number, price: number): number {
    return shares * price / this.#maxLeverage
  }

  /** 損益を計算する（ETF信用取引: 価格差 × 株数） */
  #calcPnL(direction: 'LONG' | 'SHORT', entryPrice: number, exitPrice: number, shares: number): number {
    const diff = direction === 'LONG'
      ? exitPrice - entryPrice
      : entryPrice - exitPrice
    return diff * shares
  }

  /** ポジションを新規建てする */
  openPosition(direction: 'LONG' | 'SHORT', shares: number, price: number): Position | null {
    if (direction !== 'LONG' && direction !== 'SHORT') return null
    if (shares <= 0 || price <= 0) return null

    const margin = this.#calcMargin(shares, price)
    if (margin > this.#balance) return null

    this.#balance -= margin

    const id = crypto.randomUUID()
    const position: Position = {
      id,
      direction,
      shares,
      entryPrice: price,
      leverage: this.#maxLeverage,
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

  /** 余力情報を返す */
  getBuyingPowerInfo(): BuyingPowerInfo {
    const availableCash = this.#balance
    const creditMargin = availableCash * (this.#maxLeverage - 1)
    const buyingPower = availableCash * this.#maxLeverage
    return { availableCash, creditMargin, buyingPower }
  }

  /** ポジションにSL/TPを設定する。undefinedを渡すと解除。5円刻みに丸め、方向整合性を検証する。 */
  setSLTP(positionId: string, stopLoss?: number, takeProfit?: number): boolean {
    const position = this.#positions.get(positionId)
    if (!position) return false

    let roundedSL: number | undefined
    let roundedTP: number | undefined

    if (stopLoss != null) {
      if (stopLoss <= 0) return false
      roundedSL = position.direction === 'LONG'
        ? floorToTick(stopLoss)
        : ceilToTick(stopLoss)
      if (roundedSL <= 0) return false
      if (position.direction === 'LONG' && roundedSL >= position.entryPrice) return false
      if (position.direction === 'SHORT' && roundedSL <= position.entryPrice) return false
    }

    if (takeProfit != null) {
      if (takeProfit <= 0) return false
      roundedTP = position.direction === 'LONG'
        ? ceilToTick(takeProfit)
        : floorToTick(takeProfit)
      if (roundedTP <= 0) return false
      if (position.direction === 'LONG' && roundedTP <= position.entryPrice) return false
      if (position.direction === 'SHORT' && roundedTP >= position.entryPrice) return false
    }

    position.stopLoss = roundedSL
    position.takeProfit = roundedTP
    return true
  }

  /** SL/TP条件を満たしたポジションIDを返す */
  checkSLTP(currentPrice: number): string[] {
    const triggered: string[] = []
    for (const position of this.#positions.values()) {
      const { direction, stopLoss, takeProfit } = position
      if (direction === 'LONG') {
        if (stopLoss != null && currentPrice <= stopLoss) triggered.push(position.id)
        else if (takeProfit != null && currentPrice >= takeProfit) triggered.push(position.id)
      } else {
        if (stopLoss != null && currentPrice >= stopLoss) triggered.push(position.id)
        else if (takeProfit != null && currentPrice <= takeProfit) triggered.push(position.id)
      }
    }
    return triggered
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
    const { availableCash, creditMargin, buyingPower } = this.getBuyingPowerInfo()
    return { total, effectiveBalance: this.#balance + total, availableCash, creditMargin, buyingPower }
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
