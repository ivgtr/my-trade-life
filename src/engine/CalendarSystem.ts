import { isHoliday, isSQDay, isMarketClosed } from '../utils/calendarUtils'
import { parseLocalDate } from '../utils/formatUtils'
import type { DayRecord, MonthlyStats, YearlyStats } from '../types/calendar'

interface CalendarState {
  currentDate: string
  startDate: string
  history: DayRecord[]
}

/**
 * カレンダーシステム。
 * 日付管理・履歴蓄積・統計算出を担うReact非依存の純粋JavaScriptクラス。
 */
export class CalendarSystem {
  #currentDate: Date
  #startDate: Date
  #history: DayRecord[]

  constructor(state: CalendarState | null = null) {
    if (state) {
      this.#currentDate = parseLocalDate(state.currentDate)
      this.#startDate = state.startDate ? parseLocalDate(state.startDate) : parseLocalDate(state.currentDate)
      this.#history = state.history ? [...state.history] : []
    } else {
      this.#currentDate = new Date(0)
      this.#startDate = new Date(0)
      this.#history = []
    }
  }

  /** ゲーム開始日を今年の1月1日に設定する。 */
  initializeStartDate(): void {
    const year = new Date().getFullYear()
    this.#startDate = new Date(year, 0, 1)
    this.#currentDate = new Date(year, 0, 1)
  }

  /** 現在日を1日進める。 */
  advanceDay(): void {
    const next = new Date(this.#currentDate)
    next.setDate(next.getDate() + 1)
    this.#currentDate = next
  }

  /** 現在日をISO形式文字列で返す。 */
  getCurrentDate(): string {
    const y = this.#currentDate.getFullYear()
    const m = String(this.#currentDate.getMonth() + 1).padStart(2, '0')
    const d = String(this.#currentDate.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  /** 現在日が平日（月〜金）かどうかを返す。 */
  isWeekday(): boolean {
    const day = this.#currentDate.getDay()
    return day >= 1 && day <= 5
  }

  /** 現在日が土曜日かどうかを返す。 */
  isSaturday(): boolean {
    return this.#currentDate.getDay() === 6
  }

  /**
   * 現在日が当月の最終営業日かどうかを返す。
   * 当月末日から逆算し、isMarketClosedでない最初の日と現在日を比較する。
   */
  isLastBusinessDay(): boolean {
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

  /** 現在日が12月かどうかを返す。 */
  isDecember(): boolean {
    return this.#currentDate.getMonth() === 11
  }

  /** 現在日の四半期を返す。 */
  getCurrentQuarter(): string {
    const quarter = Math.floor(this.#currentDate.getMonth() / 3) + 1
    return `Q${quarter}`
  }

  /**
   * 日次記録を履歴に追加する。
   * 休場日の場合、pnlとtradesはnullとして記録される。
   */
  recordDay(pnl: number, trades: number): void {
    const date = this.#currentDate
    const closed = isMarketClosed(date)
    const record: DayRecord = {
      date: this.getCurrentDate(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      isHoliday: isHoliday(date),
      isSQDay: isSQDay(date),
      pnl: closed ? null : pnl,
      trades: closed ? null : trades,
    }
    this.#history.push(record)
  }

  /** 指定年月（デフォルトは現在月）の履歴を返す。 */
  getMonthHistory(year?: number, month?: number): DayRecord[] {
    const y = year ?? this.#currentDate.getFullYear()
    const m = month ?? this.#currentDate.getMonth() + 1
    const prefix = `${y}-${String(m).padStart(2, '0')}`
    return this.#history.filter((r) => r.date.startsWith(prefix))
  }

  /** 指定年（デフォルトは現在年）の履歴を返す。 */
  getYearHistory(year?: number): DayRecord[] {
    const y = year ?? this.#currentDate.getFullYear()
    const prefix = `${y}-`
    return this.#history.filter((r) => r.date.startsWith(prefix))
  }

  /** 当月の統計を算出する。取引日のみを対象とする。 */
  calcMonthlyStats(): MonthlyStats {
    const monthRecords = this.getMonthHistory()
    const tradingDays = monthRecords.filter((r) => r.pnl !== null)

    if (tradingDays.length === 0) {
      return { totalPnL: 0, totalTrades: 0, winRate: 0, averagePnL: 0 }
    }

    const totalPnL = tradingDays.reduce((sum, r) => sum + r.pnl!, 0)
    const totalTrades = tradingDays.reduce((sum, r) => sum + r.trades!, 0)
    const winDays = tradingDays.filter((r) => r.pnl! > 0).length
    const winRate = winDays / tradingDays.length
    const averagePnL = totalPnL / tradingDays.length

    return { totalPnL, totalTrades, winRate, averagePnL }
  }

  /**
   * 当年の統計を算出する。取引日のみを対象とする。
   * maxDrawdownは累積PnLのピークからの最大下落幅。
   */
  calcYearlyStats(): YearlyStats {
    const yearRecords = this.getYearHistory()
    const tradingDays = yearRecords.filter((r) => r.pnl !== null)

    if (tradingDays.length === 0) {
      return { totalPnL: 0, totalTrades: 0, winRate: 0, maxDrawdown: 0 }
    }

    const totalPnL = tradingDays.reduce((sum, r) => sum + r.pnl!, 0)
    const totalTrades = tradingDays.reduce((sum, r) => sum + r.trades!, 0)
    const winDays = tradingDays.filter((r) => r.pnl! > 0).length
    const winRate = winDays / tradingDays.length

    let cumPnL = 0
    let peak = 0
    let maxDrawdown = 0
    for (const r of tradingDays) {
      cumPnL += r.pnl!
      if (cumPnL > peak) peak = cumPnL
      const drawdown = peak - cumPnL
      if (drawdown > maxDrawdown) maxDrawdown = drawdown
    }

    return { totalPnL, totalTrades, winRate, maxDrawdown }
  }

  /** ゲーム開始日からの経過日数を返す。 */
  getElapsedDays(): number {
    const msPerDay = 24 * 60 * 60 * 1000
    const diff = this.#currentDate.getTime() - this.#startDate.getTime()
    return Math.floor(diff / msPerDay) + 1
  }

  /** 状態をシリアライズして返す。復元用。 */
  serialize(): CalendarState {
    const formatDate = (d: Date): string => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    return {
      currentDate: formatDate(this.#currentDate),
      startDate: formatDate(this.#startDate),
      history: [...this.#history],
    }
  }
}
