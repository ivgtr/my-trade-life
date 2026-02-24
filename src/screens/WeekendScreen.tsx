import { useEffect, useState } from 'react'
import { useGameContext } from '../state/GameContext'
import { formatCurrency, formatPercent } from '../utils/formatUtils'

interface WeekendScreenProps {
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
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '24px',
  },
  summaryBox: {
    backgroundColor: '#1a1a2e',
    padding: '16px',
    borderRadius: '8px',
    width: '320px',
    marginBottom: '16px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
    fontSize: '14px',
  },
  label: { color: '#a0a0b0' },
  newsBox: {
    backgroundColor: '#1a1a2e',
    padding: '16px',
    borderRadius: '8px',
    width: '320px',
    marginBottom: '16px',
  },
  newsTitle: {
    fontSize: '14px',
    color: '#a0a0b0',
    marginBottom: '8px',
    borderBottom: '1px solid #2a2a3e',
    paddingBottom: '4px',
  },
  newsItem: {
    marginBottom: '8px',
    fontSize: '13px',
    padding: '6px',
    backgroundColor: '#0a0a1a',
    borderRadius: '4px',
  },
  newsHeadline: {
    fontWeight: 'bold',
    marginBottom: '2px',
  },
  newsImpact: {
    fontSize: '11px',
  },
  confirmButton: {
    padding: '14px 32px',
    fontSize: '16px',
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
} as const

export default function WeekendScreen({ onNext }: WeekendScreenProps) {
  const { gameState } = useGameContext()
  const [weekendNews, setWeekendNews] = useState<any[]>([])

  // 今週の統計を取得
  const history = gameState.dailyHistory ?? []
  const weekHistory = history.slice(-5)
  const weekPnL = weekHistory.reduce((sum, d) => sum + (d.pnl ?? 0), 0)
  const weekTrades = weekHistory.reduce((sum, d) => sum + (d.trades ?? 0), 0)
  const weekWins = weekHistory.reduce((sum, d) => sum + (d.wins ?? 0), 0)
  const weekWinRate = weekTrades > 0 ? weekWins / weekTrades : 0

  useEffect(() => {
    // 週末ニュースはgameStateから取得（GameFlowControllerが事前に生成済み）
    setWeekendNews(gameState.weekendNews ?? [])
  }, [gameState.weekendNews])

  const handleConfirm = () => {
    if (onNext) onNext()
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>週末レビュー</div>

      <div style={styles.summaryBox}>
        <div style={styles.row}>
          <span style={styles.label}>今週の損益</span>
          <span style={{ color: weekPnL >= 0 ? '#26a69a' : '#ef5350' }}>
            {formatCurrency(weekPnL)}
          </span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>取引回数</span>
          <span>{weekTrades}回</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>勝率</span>
          <span>{formatPercent(weekWinRate)}</span>
        </div>
      </div>

      {weekendNews.length > 0 && (
        <div style={styles.newsBox}>
          <div style={styles.newsTitle}>週末の経済ニュース</div>
          {weekendNews.map((news) => (
            <div key={news.id} style={styles.newsItem}>
              <div style={styles.newsHeadline}>{news.headline}</div>
              <div
                style={{
                  ...styles.newsImpact,
                  color: news.impact >= 0 ? '#26a69a' : '#ef5350',
                }}
              >
                影響度: {news.impact > 0 ? '+' : ''}{(news.impact * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}

      <button style={styles.confirmButton} onClick={handleConfirm}>
        確認した
      </button>
    </div>
  )
}
