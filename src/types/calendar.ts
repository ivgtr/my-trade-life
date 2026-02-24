export interface DayRecord {
  date: string
  isWeekend: boolean
  isHoliday: boolean
  isSQDay: boolean
  pnl: number | null
  trades: number | null
}

export interface DayHistoryEntry {
  date: string | null
  pnl: number
  trades: number
  wins: number
  balance: number
}

export interface MonthlyStats {
  totalPnL: number
  totalTrades: number
  winRate: number
  averagePnL: number
}

export interface YearlyStats {
  totalPnL: number
  totalTrades: number
  winRate: number
  maxDrawdown: number
}
