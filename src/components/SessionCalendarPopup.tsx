import type { DayHistoryEntry } from '../types/calendar'
import { formatCurrency, parseLocalDate } from '../utils/formatUtils'

interface SessionCalendarPopupProps {
  currentDate: Date
  balance: number
  dailyHistory: DayHistoryEntry[]
  sessionPnL: number
  sessionTrades: number
  sessionWins: number
  onClose: () => void
  onReturnToTitle: () => void
  onOpenConfig: () => void
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

export default function SessionCalendarPopup({
  currentDate,
  balance,
  dailyHistory,
  sessionPnL,
  sessionTrades,
  onClose,
  onReturnToTitle,
  onOpenConfig,
}: SessionCalendarPopupProps) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const today = currentDate.getDate()

  const startDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // 対象月のdailyHistoryを日付→エントリのMapに変換
  const dayMap = new Map<number, DayHistoryEntry>()
  for (const entry of dailyHistory) {
    if (!entry.date) continue
    const d = parseLocalDate(entry.date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      dayMap.set(d.getDate(), entry)
    }
  }

  // グリッドセルを構築（先頭の空セル + 日セル）
  const cells: (number | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[var(--z-modal)] flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-bg-panel rounded-lg p-4 w-80 font-mono text-text-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-3">
          <div className="text-base font-bold">
            {year}年{month + 1}月
          </div>
          <button
            className="bg-transparent border-none text-text-secondary cursor-pointer text-lg leading-none"
            onClick={onClose}
          >
            &times;
          </button>
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
          {/* 曜日ヘッダー */}
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={`py-1 font-bold ${i === 0 ? 'text-loss' : i === 6 ? 'text-accent' : 'text-text-secondary'}`}
            >
              {label}
            </div>
          ))}

          {/* 日セル */}
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} />
            }

            const isToday = day === today
            const dayOfWeek = (startDay + day - 1) % 7
            const isSunday = dayOfWeek === 0
            const isSaturday = dayOfWeek === 6

            // 当日はpropsのsessionPnLを使用、過去日はdailyHistoryを参照
            let pnl: number | undefined
            let hasTrade = false
            if (isToday && sessionTrades > 0) {
              pnl = sessionPnL
              hasTrade = true
            } else {
              const entry = dayMap.get(day)
              if (entry) {
                pnl = entry.pnl
                hasTrade = true
              }
            }

            let bgClass = ''
            let textClass = ''

            if (hasTrade) {
              bgClass = pnl! >= 0 ? 'bg-profit/20' : 'bg-loss/20'
              textClass = pnl! >= 0 ? 'text-profit' : 'text-loss'
            } else if (isSunday || isSaturday) {
              textClass = isSunday ? 'text-loss/40' : 'text-accent/40'
            } else {
              textClass = 'text-text-primary'
            }

            const ringClass = isToday ? 'ring-1 ring-accent' : ''

            return (
              <div
                key={day}
                className={`py-1 rounded ${bgClass} ${textClass} ${ringClass}`}
              >
                {day}
              </div>
            )
          })}
        </div>

        {/* フッター */}
        <div className="mt-3 pt-3 border-t border-bg-elevated text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-text-secondary">残高</span>
            <span>{formatCurrency(balance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">本日</span>
            <span>
              <span className={sessionPnL >= 0 ? 'text-profit' : 'text-loss'}>
                {formatCurrency(sessionPnL)}
              </span>
              <span className="text-text-secondary ml-2">{sessionTrades}回</span>
            </span>
          </div>
        </div>

        {/* ナビゲーションボタン */}
        <div className="mt-3 pt-3 border-t border-bg-elevated flex gap-2">
          <button
            className="flex-1 py-2 bg-bg-button text-text-primary border-none rounded-md cursor-pointer text-xs"
            onClick={onOpenConfig}
          >
            コンフィグ
          </button>
          <button
            className="flex-1 py-2 bg-bg-danger text-text-primary border-none rounded-md cursor-pointer text-xs"
            onClick={onReturnToTitle}
          >
            タイトルへ戻る
          </button>
        </div>
      </div>
    </div>
  )
}
