import { useGameContext } from '../state/GameContext'
import { formatCurrency, formatPercent } from '../utils/formatUtils'

interface YearlyReportScreenProps {
  onNext?: () => void
}

function getRankComment(startBalance: number, endBalance: number) {
  if (endBalance <= 0) return { text: '厳しい1年でした…', className: 'text-loss' }
  const ratio = endBalance / Math.max(1, startBalance)
  if (ratio < 1) return { text: '厳しい1年でした…', className: 'text-loss' }
  if (ratio < 2) return { text: '堅実なトレーダーです。', className: 'text-text-secondary' }
  if (ratio < 5) return { text: '素晴らしい成績です！', className: 'text-profit' }
  if (ratio < 10) return { text: '驚異的な1年でした！', className: 'text-gold' }
  return { text: '伝説的なトレーダーです！', className: 'text-gold' }
}

export default function YearlyReportScreen({ onNext }: YearlyReportScreenProps) {
  const { gameState } = useGameContext()

  const yearStats: any = gameState.yearlyStats ?? {}
  const yearPnL = yearStats.totalPnL ?? 0
  const yearTrades = yearStats.totalTrades ?? 0
  const yearWins = yearStats.totalWins ?? 0
  const winRate = yearTrades > 0 ? yearWins / yearTrades : 0
  const maxDrawdown = yearStats.maxDrawdown ?? gameState.maxDrawdown ?? 0

  const monthlyPnLs = yearStats.monthlyPnLs ?? []
  const maxAbsMonthPnL = Math.max(1, ...monthlyPnLs.map((p: number) => Math.abs(p)))

  const yearPreview = gameState.yearPreview ?? []
  const startBalance = yearStats.startBalance ?? 1000000
  const rank = getRankComment(startBalance, gameState.balance)

  const handleNext = () => {
    if (onNext) onNext()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-deepest text-text-primary font-mono p-6">
      <div className="text-xl font-bold mb-6">年次レポート</div>

      <div className={`text-[28px] font-bold mb-4 ${yearPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
        {formatCurrency(yearPnL)}
      </div>

      <div className="bg-bg-panel p-4 rounded-lg w-[400px] mb-4">
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">取引回数</span>
          <span>{yearTrades}回</span>
        </div>
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">勝率</span>
          <span>{formatPercent(winRate)}</span>
        </div>
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">最大ドローダウン</span>
          <span className="text-loss">{formatCurrency(maxDrawdown)}</span>
        </div>
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">残高</span>
          <span>{formatCurrency(gameState.balance)}</span>
        </div>
      </div>

      {monthlyPnLs.length > 0 && (
        <div className="w-[400px] mb-4">
          <div className="flex items-end justify-between h-30 gap-1 py-2 border-b border-bg-elevated">
            {monthlyPnLs.map((pnl: number, i: number) => {
              const height = Math.max(2, (Math.abs(pnl) / maxAbsMonthPnL) * 100)
              return (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-full rounded-t-sm ${pnl >= 0 ? 'bg-profit' : 'bg-loss'}`}
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-text-secondary mt-1">{i + 1}月</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className={`text-base font-bold text-center mb-4 p-3 bg-bg-panel rounded-lg w-[400px] ${rank.className}`}>
        {rank.text}
      </div>

      {yearPreview.length > 0 && (
        <div className="bg-bg-panel p-4 rounded-lg w-[400px] mb-4">
          <div className="text-sm text-text-secondary mb-2 border-b border-bg-elevated pb-1">
            翌年の地合いプレビュー
          </div>
          {yearPreview.map((q) => (
            <div key={q.quarter} className="flex justify-between mb-1.5 text-sm">
              <span className="text-text-secondary">Q{q.quarter % 4 || 4}</span>
              <span>{q.regime}</span>
            </div>
          ))}
        </div>
      )}

      <button
        className="py-3.5 px-8 text-base bg-accent text-white border-none rounded-lg cursor-pointer"
        onClick={handleNext}
      >
        翌年へ
      </button>
    </div>
  )
}
