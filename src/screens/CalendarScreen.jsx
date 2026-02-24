import { useEffect } from 'react'
import { useGameContext } from '../state/GameContext'
import { AudioSystem } from '../systems/AudioSystem'
import { formatDate, formatCurrency } from '../utils/formatUtils'

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0a0a1a',
    color: '#e0e0e0',
    fontFamily: 'monospace',
  },
  dateDisplay: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '24px',
  },
  pnlDisplay: {
    fontSize: '16px',
    marginBottom: '16px',
  },
  monthBar: {
    width: '320px',
    marginBottom: '24px',
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '2px',
    fontSize: '11px',
  },
  barLabel: {
    width: '28px',
    color: '#a0a0b0',
    textAlign: 'right',
    marginRight: '6px',
  },
  barPositive: {
    height: '8px',
    backgroundColor: '#26a69a',
    borderRadius: '2px',
  },
  barNegative: {
    height: '8px',
    backgroundColor: '#ef5350',
    borderRadius: '2px',
  },
  actionButton: {
    padding: '14px 32px',
    fontSize: '16px',
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '16px',
  },
  holidayText: {
    fontSize: '18px',
    color: '#a0a0b0',
    marginTop: '16px',
  },
  balanceRow: {
    fontSize: '14px',
    color: '#a0a0b0',
    marginBottom: '8px',
  },
}

/**
 * カレンダー画面。日付表示と損益推移、次アクションのボタンを表示する。
 */
export default function CalendarScreen({ onAdvance }) {
  const { gameState } = useGameContext()

  useEffect(() => {
    AudioSystem.playSE('calendarFlip')
  }, [])

  const currentDate = gameState.currentDate ? new Date(gameState.currentDate) : new Date()
  const dayOfWeek = currentDate.getDay()
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  const isSaturday = dayOfWeek === 6

  // 前日の損益を取得
  const history = gameState.dailyHistory ?? []
  const lastDay = history.length > 0 ? history[history.length - 1] : null
  const lastPnL = lastDay?.pnl ?? 0

  // 今月の損益推移
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
    <div style={styles.container}>
      <div style={styles.dateDisplay}>{formatDate(currentDate)}</div>

      <div style={styles.balanceRow}>
        残高: {formatCurrency(gameState.balance)}
      </div>

      {lastDay && (
        <div
          style={{
            ...styles.pnlDisplay,
            color: lastPnL >= 0 ? '#26a69a' : '#ef5350',
          }}
        >
          前日損益: {formatCurrency(lastPnL)}
        </div>
      )}

      {/* 月次損益推移バー */}
      {monthHistory.length > 0 && (
        <div style={styles.monthBar}>
          {monthHistory.map((d, i) => {
            const pnl = d.pnl ?? 0
            const width = Math.max(2, (Math.abs(pnl) / maxAbsPnl) * 100)
            return (
              <div key={i} style={styles.barRow}>
                <span style={styles.barLabel}>{i + 1}</span>
                <div
                  style={{
                    ...(pnl >= 0 ? styles.barPositive : styles.barNegative),
                    width: `${width}%`,
                  }}
                />
              </div>
            )
          })}
        </div>
      )}

      {isWeekday && (
        <button style={styles.actionButton} onClick={handleAdvance}>
          朝の地合いを確認する
        </button>
      )}

      {isSaturday && (
        <button style={styles.actionButton} onClick={handleAdvance}>
          週末ニュースを確認
        </button>
      )}

      {!isWeekday && !isSaturday && (
        <>
          <div style={styles.holidayText}>休場日</div>
          <button
            style={{ ...styles.actionButton, backgroundColor: '#3a3a4e' }}
            onClick={handleAdvance}
          >
            翌日へ
          </button>
        </>
      )}
    </div>
  )
}
