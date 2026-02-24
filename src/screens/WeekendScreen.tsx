import { useEffect, useState } from 'react'
import { useGameContext } from '../state/GameContext'
import { formatCurrency, formatPercent } from '../utils/formatUtils'

interface WeekendScreenProps {
  onNext?: () => void
}

export default function WeekendScreen({ onNext }: WeekendScreenProps) {
  const { gameState } = useGameContext()
  const [weekendNews, setWeekendNews] = useState<any[]>([])

  const history = gameState.dailyHistory ?? []
  const weekHistory = history.slice(-5)
  const weekPnL = weekHistory.reduce((sum, d) => sum + (d.pnl ?? 0), 0)
  const weekTrades = weekHistory.reduce((sum, d) => sum + (d.trades ?? 0), 0)
  const weekWins = weekHistory.reduce((sum, d) => sum + (d.wins ?? 0), 0)
  const weekWinRate = weekTrades > 0 ? weekWins / weekTrades : 0

  useEffect(() => {
    setWeekendNews(gameState.weekendNews ?? [])
  }, [gameState.weekendNews])

  const handleConfirm = () => {
    if (onNext) onNext()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-deepest text-text-primary font-mono">
      <div className="text-xl font-bold mb-6">週末レビュー</div>

      <div className="bg-bg-panel p-4 rounded-lg w-80 mb-4">
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">今週の損益</span>
          <span className={weekPnL >= 0 ? 'text-profit' : 'text-loss'}>
            {formatCurrency(weekPnL)}
          </span>
        </div>
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">取引回数</span>
          <span>{weekTrades}回</span>
        </div>
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">勝率</span>
          <span>{formatPercent(weekWinRate)}</span>
        </div>
      </div>

      {weekendNews.length > 0 && (
        <div className="bg-bg-panel p-4 rounded-lg w-80 mb-4">
          <div className="text-sm text-text-secondary mb-2 border-b border-bg-elevated pb-1">
            週末の経済ニュース
          </div>
          {weekendNews.map((news) => (
            <div key={news.id} className="mb-2 text-[13px] p-1.5 bg-bg-deepest rounded">
              <div className="font-bold mb-0.5">{news.headline}</div>
              <div className={`text-[11px] ${news.impact >= 0 ? 'text-profit' : 'text-loss'}`}>
                影響度: {news.impact > 0 ? '+' : ''}{(news.impact * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        className="py-3.5 px-8 text-base bg-accent text-white border-none rounded-lg cursor-pointer"
        onClick={handleConfirm}
      >
        確認した
      </button>
    </div>
  )
}
