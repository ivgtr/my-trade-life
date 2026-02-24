import { useEffect } from 'react'
import { useGameContext } from '../state/GameContext'
import { AudioSystem } from '../systems/AudioSystem'
import { formatDate, formatCurrency } from '../utils/formatUtils'

interface CalendarScreenProps {
  onAdvance?: () => void
}

export default function CalendarScreen({ onAdvance }: CalendarScreenProps) {
  const { gameState } = useGameContext()

  useEffect(() => {
    AudioSystem.playSE('calendarFlip')
  }, [])

  const currentDate = gameState.currentDate ? new Date(gameState.currentDate) : new Date()
  const dayOfWeek = currentDate.getDay()
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  const isSaturday = dayOfWeek === 6

  const history = gameState.dailyHistory ?? []
  const lastDay = history.length > 0 ? history[history.length - 1] : null
  const lastPnL = lastDay?.pnl ?? 0

  const currentMonth = currentDate.getMonth()
  const monthHistory = history.filter((d) => {
    if (!d.date) return false
    const date = new Date(d.date)
    return date.getMonth() === currentMonth
  })

  const maxAbsPnl = Math.max(1, ...monthHistory.map((d) => Math.abs(d.pnl ?? 0)))

  const handleAdvance = () => {
    if (onAdvance) {
      onAdvance()
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-deepest text-text-primary font-mono">
      <div className="text-[28px] font-bold mb-6">{formatDate(currentDate)}</div>

      <div className="text-sm text-text-secondary mb-2">
        残高: {formatCurrency(gameState.balance)}
      </div>

      {lastDay && (
        <div className={`text-base mb-4 ${lastPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
          前日損益: {formatCurrency(lastPnL)}
        </div>
      )}

      {monthHistory.length > 0 && (
        <div className="w-80 mb-6">
          {monthHistory.map((d, i) => {
            const pnl = d.pnl ?? 0
            const width = Math.max(2, (Math.abs(pnl) / maxAbsPnl) * 100)
            return (
              <div key={i} className="flex items-center mb-0.5 text-[11px]">
                <span className="w-7 text-text-secondary text-right mr-1.5">{i + 1}</span>
                <div
                  className={`h-2 rounded-sm ${pnl >= 0 ? 'bg-profit' : 'bg-loss'}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            )
          })}
        </div>
      )}

      {isWeekday && (
        <button
          className="py-3.5 px-8 text-base bg-accent text-white border-none rounded-lg cursor-pointer mt-4"
          onClick={handleAdvance}
        >
          朝の地合いを確認する
        </button>
      )}

      {isSaturday && (
        <button
          className="py-3.5 px-8 text-base bg-accent text-white border-none rounded-lg cursor-pointer mt-4"
          onClick={handleAdvance}
        >
          週末ニュースを確認
        </button>
      )}

      {!isWeekday && !isSaturday && (
        <>
          <div className="text-lg text-text-secondary mt-4">休場日</div>
          <button
            className="py-3.5 px-8 text-base bg-bg-button text-text-primary border-none rounded-lg cursor-pointer mt-4"
            onClick={handleAdvance}
          >
            翌日へ
          </button>
        </>
      )}
    </div>
  )
}
