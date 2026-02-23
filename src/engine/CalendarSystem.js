import { isHoliday, isSQDay, isMarketClosed } from '../utils/calendarUtils'

/**
 * @typedef {Object} DayRecord
 * @property {string} date - ISO形式の日付文字列（YYYY-MM-DD）
 * @property {boolean} isWeekend - 週末かどうか
 * @property {boolean} isHoliday - 祝日かどうか
 * @property {boolean} isSQDay - SQ日かどうか
 * @property {number|null} pnl - 損益（休場日はnull）
 * @property {number|null} trades - 取引回数（休場日はnull）
 */

/**
 * @typedef {Object} MonthlyStats
 * @property {number} totalPnL - 月間合計損益
 * @property {number} totalTrades - 月間合計取引回数
 * @property {number} winRate - 勝率（勝利日数/取引日数）
 * @property {number} averagePnL - 平均損益
 */

/**
 * @typedef {Object} YearlyStats
 * @property {number} totalPnL - 年間合計損益
 * @property {number} totalTrades - 年間合計取引回数
 * @property {number} winRate - 勝率（勝利日数/取引日数）
 * @property {number} maxDrawdown - 最大ドローダウン（累積PnLのピークからの最大下落幅）
 */

/**
 * カレンダーシステム。
 * 日付管理・履歴蓄積・統計算出を担うReact非依存の純粋JavaScriptクラス。
 */
export class CalendarSystem {
  /** @type {Date} */
  #currentDate
  /** @type {Date} */
  #startDate
  /** @type {DayRecord[]} */
  #history

  /**
   * @param {Object|null} state - 復元用のシリアライズ済み状態。nullの場合は空初期化
   */
  constructor(state = null) {
    if (state) {
      this.#currentDate = new Date(state.currentDate)
      this.#startDate = new Date(state.startDate)
      this.#history = state.history ? [...state.history] : []
    } else {
      this.#currentDate = new Date(0)
      this.#startDate = new Date(0)
      this.#history = []
    }
  }

  /**
   * ゲーム開始日を今年の1月1日に設定する。
   */
  initializeStartDate() {
    const year = new Date().getFullYear()
    this.#startDate = new Date(year, 0, 1)
    this.#currentDate = new Date(year, 0, 1)
  }

  /**
   * 現在日を1日進める。
   */
  advanceDay() {
    const next = new Date(this.#currentDate)
    next.setDate(next.getDate() + 1)
    this.#currentDate = next
  }

  /**
   * 現在日をISO形式文字列で返す。
   * @returns {string} YYYY-MM-DD
   */
  getCurrentDate() {
    const y = this.#currentDate.getFullYear()
    const m = String(this.#currentDate.getMonth() + 1).padStart(2, '0')
    const d = String(this.#currentDate.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  /**
   * 現在日が平日（月〜金）かどうかを返す。
   * @returns {boolean}
   */
  isWeekday() {
    const day = this.#currentDate.getDay()
    return day >= 1 && day <= 5
  }

  /**
   * 現在日が土曜日かどうかを返す。
   * @returns {boolean}
   */
  isSaturday() {
    return this.#currentDate.getDay() === 6
  }

  /**
   * 現在日が当月の最終営業日かどうかを返す。
   * 当月末日から逆算し、isMarketClosedでない最初の日と現在日を比較する。
   * @returns {boolean}
   */
  isLastBusinessDay() {
    const year = this.#currentDate.getFullYear()
    const month = this.#currentDate.getMonth()
    const lastDay = new Date(year, month + 1, 0)
    const candidate = new Date(lastDay)
    while (isMarketClosed(candidate)) {
      candidate.setDate(candidate.getDate() - 1)
    }
    return this.#currentDate.getFullYear() === candidate.getFullYear()
      && this.#currentDate.getMonth() === candidate.getMonth()
      && this.#currentDate.getDate() === candidate.getDate()
  }

  /**
   * 現在日が12月かどうかを返す。
   * @returns {boolean}
   */
  isDecember() {
    return this.#currentDate.getMonth() === 11
  }

  /**
   * 現在日の四半期を返す。
   * @returns {string} "Q1" | "Q2" | "Q3" | "Q4"
   */
  getCurrentQuarter() {
    const quarter = Math.floor(this.#currentDate.getMonth() / 3) + 1
    return `Q${quarter}`
  }

  /**
   * 日次記録を履歴に追加する。
   * 休場日の場合、pnlとtradesはnullとして記録される。
   * @param {number} pnl - 損益
   * @param {number} trades - 取引回数
   */
  recordDay(pnl, trades) {
    const date = this.#currentDate
    const closed = isMarketClosed(date)
    /** @type {DayRecord} */
    const record = {
      date: this.getCurrentDate(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isHoliday: isHoliday(date),
      isSQDay: isSQDay(date),
      pnl: closed ? null : pnl,
      trades: closed ? null : trades,
    }
    this.#history.push(record)
  }

  /**
   * 指定年月（デフォルトは現在月）の履歴を返す。
   * @param {number} [year] - 年
   * @param {number} [month] - 月（1〜12）
   * @returns {DayRecord[]}
   */
  getMonthHistory(year, month) {
    const y = year ?? this.#currentDate.getFullYear()
    const m = month ?? this.#currentDate.getMonth() + 1
    const prefix = `${y}-${String(m).padStart(2, '0')}`
    return this.#history.filter((r) => r.date.startsWith(prefix))
  }

  /**
   * 指定年（デフォルトは現在年）の履歴を返す。
   * @param {number} [year] - 年
   * @returns {DayRecord[]}
   */
  getYearHistory(year) {
    const y = year ?? this.#currentDate.getFullYear()
    const prefix = `${y}-`
    return this.#history.filter((r) => r.date.startsWith(prefix))
  }

  /**
   * 当月の統計を算出する。取引日のみを対象とする。
   * @returns {MonthlyStats}
   */
  calcMonthlyStats() {
    const monthRecords = this.getMonthHistory()
    const tradingDays = monthRecords.filter((r) => r.pnl !== null)

    if (tradingDays.length === 0) {
      return { totalPnL: 0, totalTrades: 0, winRate: 0, averagePnL: 0 }
    }

    const totalPnL = tradingDays.reduce((sum, r) => sum + r.pnl, 0)
    const totalTrades = tradingDays.reduce((sum, r) => sum + r.trades, 0)
    const winDays = tradingDays.filter((r) => r.pnl > 0).length
    const winRate = winDays / tradingDays.length
    const averagePnL = totalPnL / tradingDays.length

    return { totalPnL, totalTrades, winRate, averagePnL }
  }

  /**
   * 当年の統計を算出する。取引日のみを対象とする。
   * maxDrawdownは累積PnLのピークからの最大下落幅。
   * @returns {YearlyStats}
   */
  calcYearlyStats() {
    const yearRecords = this.getYearHistory()
    const tradingDays = yearRecords.filter((r) => r.pnl !== null)

    if (tradingDays.length === 0) {
      return { totalPnL: 0, totalTrades: 0, winRate: 0, maxDrawdown: 0 }
    }

    const totalPnL = tradingDays.reduce((sum, r) => sum + r.pnl, 0)
    const totalTrades = tradingDays.reduce((sum, r) => sum + r.trades, 0)
    const winDays = tradingDays.filter((r) => r.pnl > 0).length
    const winRate = winDays / tradingDays.length

    let cumPnL = 0
    let peak = 0
    let maxDrawdown = 0
    for (const r of tradingDays) {
      cumPnL += r.pnl
      if (cumPnL > peak) peak = cumPnL
      const drawdown = peak - cumPnL
      if (drawdown > maxDrawdown) maxDrawdown = drawdown
    }

    return { totalPnL, totalTrades, winRate, maxDrawdown }
  }

  /**
   * ゲーム開始日からの経過日数を返す。
   * @returns {number}
   */
  getElapsedDays() {
    const msPerDay = 24 * 60 * 60 * 1000
    const diff = this.#currentDate.getTime() - this.#startDate.getTime()
    return Math.floor(diff / msPerDay) + 1
  }

  /**
   * 状態をシリアライズして返す。復元用。
   * @returns {{ currentDate: string, startDate: string, history: DayRecord[] }}
   */
  serialize() {
    return {
      currentDate: this.#currentDate.toISOString(),
      startDate: this.#startDate.toISOString(),
      history: [...this.#history],
    }
  }
}
