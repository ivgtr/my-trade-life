import { useGameContext } from '../state/GameContext'
import { formatCurrency, formatPercent } from '../utils/formatUtils'

interface MonthlyReportScreenProps {
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
    width: '360px',
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
    width: '360px',
    marginBottom: '16px',
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '3px',
    fontSize: '11px',
  },
  barLabel: {
    width: '28px',
    color: '#a0a0b0',
    textAlign: 'right',
    marginRight: '6px',
  },
  previewBox: {
    backgroundColor: '#1a1a2e',
    padding: '16px',
    borderRadius: '8px',
    width: '360px',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '14px',
    color: '#a0a0b0',
    marginBottom: '8px',
    borderBottom: '1px solid #2a2a3e',
    paddingBottom: '4px',
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
    <div style={styles.container}>
      <div style={styles.title}>月次レポート</div>

      <div
        style={{
          ...styles.pnlDisplay,
          color: monthPnL >= 0 ? '#26a69a' : '#ef5350',
        }}
      >
        {formatCurrency(monthPnL)}
      </div>

      <div style={styles.statsBox}>
        <div style={styles.row}>
          <span style={styles.label}>取引回数</span>
          <span>{monthTrades}回</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>勝率</span>
          <span>{formatPercent(winRate)}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>平均損益</span>
          <span style={{ color: avgPnL >= 0 ? '#26a69a' : '#ef5350' }}>
            {formatCurrency(Math.round(avgPnL))}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>残高</span>
          <span>{formatCurrency(gameState.balance)}</span>
        </div>
      </div>

      {/* 月次損益推移バー */}
      {monthHistory.length > 0 && (
        <div style={styles.chartArea}>
          {monthHistory.map((d, i) => {
            const pnl = d.pnl ?? 0
            const width = Math.max(2, (Math.abs(pnl) / maxAbsPnl) * 100)
            return (
              <div key={i} style={styles.barRow}>
                <span style={styles.barLabel}>{i + 1}</span>
                <div
                  style={{
                    height: '6px',
                    width: `${width}%`,
                    backgroundColor: pnl >= 0 ? '#26a69a' : '#ef5350',
                    borderRadius: '2px',
                  }}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* 翌月プレビュー */}
      {monthPreview && (
        <div style={styles.previewBox}>
          <div style={styles.sectionTitle}>翌月の見通し</div>
          <div style={styles.row}>
            <span style={styles.label}>地合い</span>
            <span>{monthPreview.regime}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>見通し</span>
            <span>{monthPreview.outlook}</span>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>ボラティリティ</span>
            <span>{monthPreview.volatility}</span>
          </div>
          {anomalyInfo && anomalyInfo.tendency && (
            <div style={styles.row}>
              <span style={styles.label}>月次傾向</span>
              <span>{anomalyInfo.tendency}</span>
            </div>
          )}
        </div>
      )}

      <button style={styles.nextButton} onClick={handleNext}>
        翌月へ
      </button>
    </div>
  )
}
