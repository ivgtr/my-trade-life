import { useGameContext } from '../hooks/useGameContext'
import { formatCurrency, formatPercent } from '../utils/formatUtils'

interface MonthlyReportScreenProps {
  onNext?: () => void
}

export default function MonthlyReportScreen({ onNext }: MonthlyReportScreenProps) {
  const { gameState } = useGameContext()

  const monthStats = (gameState.monthlyStats ?? {}) as any
  const monthPnL = monthStats.totalPnL ?? 0
  const monthTrades = monthStats.totalTrades ?? 0
  const monthWins = monthStats.totalWins ?? 0
  const winRate = monthTrades > 0 ? monthWins / monthTrades : 0
  const avgPnL = monthTrades > 0 ? monthPnL / monthTrades : 0

  const monthHistory: { pnl?: number }[] = monthStats.dailyHistory ?? []
  const maxAbsPnl = Math.max(1, ...monthHistory.map((d) => Math.abs(d.pnl ?? 0)))

  const monthPreview = gameState.monthPreview
  const anomalyInfo = gameState.anomalyInfo

  const handleNext = () => {
    if (onNext) onNext()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-deepest text-text-primary font-mono p-6">
      <div className="text-xl font-bold mb-6">月次レポート</div>

      <div className={`text-[28px] font-bold mb-4 ${monthPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
        {formatCurrency(monthPnL)}
      </div>

      <div className="bg-bg-panel p-4 rounded-lg w-[360px] mb-4">
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">取引回数</span>
          <span>{monthTrades}回</span>
        </div>
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">勝率</span>
          <span>{formatPercent(winRate)}</span>
        </div>
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">平均損益</span>
          <span className={avgPnL >= 0 ? 'text-profit' : 'text-loss'}>
            {formatCurrency(Math.round(avgPnL))}
          </span>
        </div>
        <div className="flex justify-between mb-1.5 text-sm">
          <span className="text-text-secondary">残高</span>
          <span>{formatCurrency(gameState.balance)}</span>
        </div>
      </div>

      {monthHistory.length > 0 && (
        <div className="w-[360px] mb-4">
          {monthHistory.map((d, i) => {
            const pnl = d.pnl ?? 0
            const width = Math.max(2, (Math.abs(pnl) / maxAbsPnl) * 100)
            return (
              <div key={i} className="flex items-center mb-[3px] text-[11px]">
                <span className="w-7 text-text-secondary text-right mr-1.5">{i + 1}</span>
                <div
                  className={`h-1.5 rounded-sm ${pnl >= 0 ? 'bg-profit' : 'bg-loss'}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            )
          })}
        </div>
      )}

      {monthPreview && (
        <div className="bg-bg-panel p-4 rounded-lg w-[360px] mb-4">
          <div className="text-sm text-text-secondary mb-2 border-b border-bg-elevated pb-1">
            翌月の見通し
          </div>
          <div className="flex justify-between mb-1.5 text-sm">
            <span className="text-text-secondary">地合い</span>
            <span>{monthPreview.regime}</span>
          </div>
          <div className="flex justify-between mb-1.5 text-sm">
            <span className="text-text-secondary">見通し</span>
            <span>{monthPreview.outlook}</span>
          </div>
          <div className="flex justify-between mb-1.5 text-sm">
            <span className="text-text-secondary">ボラティリティ</span>
            <span>{monthPreview.volatility}</span>
          </div>
          {anomalyInfo && anomalyInfo.tendency && (
            <div className="flex justify-between mb-1.5 text-sm">
              <span className="text-text-secondary">月次傾向</span>
              <span>{anomalyInfo.tendency}</span>
            </div>
          )}
        </div>
      )}

      <button
        className="py-3.5 px-8 text-base bg-accent text-white border-none rounded-lg cursor-pointer"
        onClick={handleNext}
      >
        翌月へ
      </button>
    </div>
  )
}
