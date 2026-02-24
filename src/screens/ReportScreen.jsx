import { useEffect, useState } from 'react'
import { useGameContext } from '../state/GameContext'
import { AudioSystem } from '../systems/AudioSystem'
import { formatCurrency, formatPercent } from '../utils/formatUtils'
import MilestoneOverlay, { MILESTONE_TABLE } from '../components/MilestoneOverlay'

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
  pnlDisplay: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '16px',
  },
  statsBox: {
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
  levelUpBanner: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    color: '#a5b4fc',
    padding: '12px',
    borderRadius: '8px',
    textAlign: 'center',
    marginBottom: '16px',
    width: '320px',
    fontSize: '16px',
    fontWeight: 'bold',
    border: '1px solid rgba(99, 102, 241, 0.4)',
  },
  previewWarning: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    color: '#ffc107',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '13px',
    textAlign: 'center',
    marginBottom: '16px',
    width: '320px',
    border: '1px solid rgba(255, 193, 7, 0.3)',
  },
  nextButton: {
    padding: '14px 32px',
    fontSize: '16px',
    backgroundColor: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '8px',
  },
}

/**
 * 日次成果報告画面。
 */
export default function ReportScreen({ onNext }) {
  const { gameState } = useGameContext()
  const [milestone, setMilestone] = useState(null)
  const [leveledUp, setLeveledUp] = useState(false)

  const sessionPnL = gameState.sessionPnL ?? 0
  const sessionTrades = gameState.sessionTrades ?? 0
  const sessionWins = gameState.sessionWins ?? 0
  const winRate = sessionTrades > 0 ? sessionWins / sessionTrades : 0

  useEffect(() => {
    // レベルアップ判定（gameReducerで処理済みの場合はgameStateに反映済み）
    if (gameState._justLeveledUp) {
      setLeveledUp(true)
      AudioSystem.playSE('levelup')
    }

    // マイルストーン判定
    const balance = gameState.balance
    const passedMilestones = gameState._passedMilestones ?? []
    for (const ms of MILESTONE_TABLE) {
      if (balance >= ms.threshold && !passedMilestones.includes(ms.threshold)) {
        setMilestone(ms)
        break
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = () => {
    if (onNext) onNext()
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>本日の成果</div>

      <div
        style={{
          ...styles.pnlDisplay,
          color: sessionPnL >= 0 ? '#26a69a' : '#ef5350',
        }}
      >
        {formatCurrency(sessionPnL)}
      </div>

      <div style={styles.statsBox}>
        <div style={styles.row}>
          <span style={styles.label}>取引回数</span>
          <span>{sessionTrades}回</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>勝率</span>
          <span>{formatPercent(winRate)}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>残高</span>
          <span>{formatCurrency(gameState.balance)}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>レベル</span>
          <span>Lv.{gameState.level}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>経験値</span>
          <span>{gameState.exp ?? 0} EXP</span>
        </div>
      </div>

      {leveledUp && (
        <div style={styles.levelUpBanner}>
          ✨ Level Up! Lv.{gameState.level} に到達！
        </div>
      )}

      {gameState.previewEvent && (
        <div style={styles.previewWarning}>
          ⚠ 明日は高インパクトイベントあり
        </div>
      )}

      <button style={styles.nextButton} onClick={handleNext}>
        翌日へ進む
      </button>

      <MilestoneOverlay milestone={milestone} onComplete={() => setMilestone(null)} />
    </div>
  )
}
