/**
 * @typedef {Object} Position
 * @property {string} id - ポジションID (uuid)
 * @property {'LONG'|'SHORT'} direction - 売買方向
 * @property {number} shares - 株数
 * @property {number} entryPrice - エントリー価格
 * @property {number} leverage - 信用倍率
 * @property {number} margin - 確保証拠金
 * @property {number} unrealizedPnL - 含み損益
 */

/**
 * @typedef {Object} TradeResult
 * @property {string} positionId - ポジションID
 * @property {number} pnl - 実現損益
 * @property {boolean} isProfit - 利益かどうか
 * @property {number} entryPrice - エントリー価格
 * @property {number} exitPrice - 決済価格
 */

/**
 * @typedef {Object} UnrealizedPnL
 * @property {number} total - 含み損益合計
 * @property {number} effectiveBalance - 残高 + 含み損益
 */

/**
 * @typedef {Object} DailySummary
 * @property {number} trades - 取引回数
 * @property {number} wins - 勝ち回数
 * @property {number} losses - 負け回数
 * @property {number} winRate - 勝率（0〜1）
 * @property {number} totalPnL - 合計損益
 * @property {TradeResult[]} closedTrades - 決済済みトレード一覧
 */

/**
 * トレードエンジン（ETF信用取引モデル）。
 * ポジション管理・損益計算を担う engine 層の中核コンポーネント。
 */
export class TradingEngine {
  /** @type {number} 利用可能残高（証拠金差引後） */
  #balance
  /** @type {number} 最大信用倍率 */
  #maxLeverage
  /** @type {Map<string, Position>} 保有ポジション（ID検索 O(1)） */
  #positions
  /** @type {TradeResult[]} 日次決済済みトレード */
  #closedTrades

  /**
   * @param {Object} config
   * @param {number} config.balance - 現在の残高
   * @param {number} config.maxLeverage - 現在の最大信用倍率
   */
  constructor({ balance, maxLeverage }) {
    this.#balance = balance
    this.#maxLeverage = maxLeverage
    this.#positions = new Map()
    this.#closedTrades = []
  }

  /**
   * 証拠金を計算する（ETF信用取引: 株数 × 価格 / 信用倍率）
   * @param {number} shares - 株数
   * @param {number} price - 現在価格
   * @param {number} leverage - 信用倍率
   * @returns {number} 必要証拠金
   */
  #calcMargin(shares, price, leverage) {
    return shares * price / leverage
  }

  /**
   * 損益を計算する（ETF信用取引: 価格差 × 株数）
   * @param {'LONG'|'SHORT'} direction - 売買方向
   * @param {number} entryPrice - エントリー価格
   * @param {number} exitPrice - 決済価格
   * @param {number} shares - 株数
   * @returns {number} 損益額
   */
  #calcPnL(direction, entryPrice, exitPrice, shares) {
    const diff = direction === 'LONG'
      ? exitPrice - entryPrice
      : entryPrice - exitPrice
    return diff * shares
  }

  /**
   * ポジションを新規建てする
   * @param {'LONG'|'SHORT'} direction - 売買方向
   * @param {number} shares - 株数
   * @param {number} price - エントリー価格
   * @param {number} leverage - 信用倍率
   * @returns {Position|null} 成功時はPosition、残高不足またはバリデーション失敗時はnull
   */
  openPosition(direction, shares, price, leverage) {
    if (direction !== 'LONG' && direction !== 'SHORT') return null
    if (shares <= 0 || price <= 0) return null
    if (leverage < 1 || leverage > this.#maxLeverage) return null

    const margin = this.#calcMargin(shares, price, leverage)
    if (margin > this.#balance) return null

    this.#balance -= margin

    const id = crypto.randomUUID()
    const position = {
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

  /**
   * ポジションを決済する
   * @param {string} positionId - ポジションID
   * @param {number} price - 決済価格
   * @returns {TradeResult|null} 成功時はTradeResult、ポジション不在時はnull
   */
  closePosition(positionId, price) {
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

    const result = {
      positionId,
      pnl,
      isProfit: pnl > 0,
      entryPrice: position.entryPrice,
      exitPrice: price,
    }

    this.#closedTrades.push(result)
    return result
  }

  /**
   * 全ポジションを強制決済する（大引け用）
   * @param {number} price - 決済価格
   * @returns {TradeResult[]} 全決済結果
   */
  forceCloseAll(price) {
    const ids = [...this.#positions.keys()]
    const results = []
    for (const id of ids) {
      const result = this.closePosition(id, price)
      if (result) results.push(result)
    }
    return results
  }

  /**
   * 含み損益を再計算する
   * @param {number} currentPrice - 現在価格
   * @returns {UnrealizedPnL}
   */
  recalculateUnrealized(currentPrice) {
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

  /**
   * 日次の取引結果サマリーを返す
   * @returns {DailySummary}
   */
  getDailySummary() {
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

  /**
   * 現在の残高を返す
   * @returns {number}
   */
  getBalance() {
    return this.#balance
  }

  /**
   * 保有ポジション一覧を返す
   * @returns {Position[]}
   */
  getPositions() {
    return [...this.#positions.values()].map((p) => ({ ...p }))
  }

  /**
   * 状態をシリアライズして返す。復元用。
   * @returns {{ balance: number, maxLeverage: number, positions: Position[], closedTrades: TradeResult[] }}
   */
  serialize() {
    return {
      balance: this.#balance,
      maxLeverage: this.#maxLeverage,
      positions: this.getPositions(),
      closedTrades: [...this.#closedTrades],
    }
  }
}
