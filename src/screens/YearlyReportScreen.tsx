import { useGameContext } from '../state/GameContext'
import { formatCurrency, formatPercent } from '../utils/formatUtils'

interface YearlyReportScreenProps {
  onNext?: () => void
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100dvh',
    backgroundColor: '#0a0a1a',
    color: '#e0e0e0',
    fontFamily: 'monospace',
    padding: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '24px',
  },
  pnlDisplay: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '16px',
  },
  statsBox: {
    backgroundColor: '#1a1a2e',
    padding: '16px',
    borderRadius: '8px',
    width: '400px',
    marginBottom: '16px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
    fontSize: '14px',
  },
  label: { color: '#a0a0b0' },
  chartArea: {
    width: '400px',
    marginBottom: '16px',
  },
  monthBarContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '120px',
    gap: '4px',
    padding: '8px 0',
    borderBottom: '1px solid #2a2a3e',
  },
  monthBarWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
  },
  monthLabel: {
    fontSize: '10px',
    color: '#a0a0b0',
    marginTop: '4px',
  },
  previewBox: {
    backgroundColor: '#1a1a2e',
    padding: '16px',
    borderRadius: '8px',
    width: '400px',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '14px',
    color: '#a0a0b0',
    marginBottom: '8px',
    borderBottom: '1px solid #2a2a3e',
    paddingBottom: '4px',
  },
  rankComment: {
    fontSize: '16px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    width: '400px',
  },
  nextButton: {
    padding: '14px 32px',
    fontSize: '16px',
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
} as const

function getRankComment(startBalance: number, endBalance: number) {
  if (endBalance <= 0) return { text: '厳しい1年でした…', color: '#ef5350' }
  const ratio = endBalance / Math.max(1, startBalance)
  if (ratio < 1) return { text: '厳しい1年でした…', color: '#ef5350' }
  if (ratio < 2) return { text: '堅実なトレーダーです。', color: '#a0a0b0' }
  if (ratio < 5) return { text: '素晴らしい成績です！', color: '#26a69a' }
  if (ratio < 10) return { text: '驚異的な1年でした！', color: '#ffd700' }
  return { text: '伝説的なトレーダーです！', color: '#ffd700' }
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
    <div style={styles.container}>
      <div style={styles.title}>年次レポート</div>

      <div
        style={{
          ...styles.pnlDisplay,
          color: yearPnL >= 0 ? '#26a69a' : '#ef5350',
        }}
      >
        {formatCurrency(yearPnL)}
      </div>

      <div style={styles.statsBox}>
        <div style={styles.row}>
          <span style={styles.label}>取引回数</span>
          <span>{yearTrades}回</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>勝率</span>
          <span>{formatPercent(winRate)}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>最大ドローダウン</span>
          <span style={{ color: '#ef5350' }}>{formatCurrency(maxDrawdown)}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>残高</span>
          <span>{formatCurrency(gameState.balance)}</span>
        </div>
      </div>

      {/* 月別損益棒グラフ */}
      {monthlyPnLs.length > 0 && (
        <div style={styles.chartArea}>
          <div style={styles.monthBarContainer}>
            {monthlyPnLs.map((pnl: number, i: number) => {
              const height = Math.max(2, (Math.abs(pnl) / maxAbsMonthPnL) * 100)
              return (
                <div key={i} style={styles.monthBarWrapper}>
                  <div
                    style={{
                      width: '100%',
                      height: `${height}%`,
                      backgroundColor: pnl >= 0 ? '#26a69a' : '#ef5350',
                      borderRadius: '2px 2px 0 0',
                    }}
                  />
                  <span style={styles.monthLabel}>{i + 1}月</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ランク評価コメント */}
      <div style={{ ...styles.rankComment, color: rank.color }}>
        {rank.text}
      </div>

      {/* 翌年プレビュー */}
      {yearPreview.length > 0 && (
        <div style={styles.previewBox}>
          <div style={styles.sectionTitle}>翌年の地合いプレビュー</div>
          {yearPreview.map((q) => (
            <div key={q.quarter} style={styles.row}>
              <span style={styles.label}>Q{q.quarter % 4 || 4}</span>
              <span>{q.regime}</span>
            </div>
          ))}
        </div>
      )}

      <button style={styles.nextButton} onClick={handleNext}>
        翌年へ
      </button>
    </div>
  )
}
