import { useGameContext } from '../state/GameContext'
import { ACTIONS } from '../state/actions'

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
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '24px',
    color: '#ffd700',
  },
  infoBox: {
    backgroundColor: '#1a1a2e',
    padding: '20px',
    borderRadius: '8px',
    width: '320px',
    marginBottom: '16px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  },
  label: {
    color: '#a0a0b0',
  },
  sentimentBullish: { color: '#26a69a' },
  sentimentBearish: { color: '#ef5350' },
  sentimentNeutral: { color: '#a0a0b0' },
  warning: {
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
  enterButton: {
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

const SENTIMENT_LABELS = {
  bullish: '強気',
  bearish: '弱気',
  range: 'レンジ',
  turbulent: '荒れ',
  bubble: 'バブル',
  crash: '暴落',
}

const SENTIMENT_ICONS = {
  bullish: '📈',
  bearish: '📉',
  range: '➡️',
  turbulent: '🌊',
  bubble: '🚀',
  crash: '💥',
}

function getSentimentStyle(sentiment) {
  if (sentiment === 'bullish' || sentiment === 'bubble') return styles.sentimentBullish
  if (sentiment === 'bearish' || sentiment === 'crash') return styles.sentimentBearish
  return styles.sentimentNeutral
}

/**
 * 朝の地合い確認画面。レベルに応じた情報を開示する。
 */
export default function MorningScreen() {
  const { gameState, dispatch } = useGameContext()
  const level = gameState.level ?? 1
  const dailyCondition = gameState.dailyCondition
  const previewEvent = gameState.previewEvent
  const anomaly = gameState.anomalyInfo

  const handleEnter = () => {
    dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'session' } })
  }

  const displaySentiment = dailyCondition?.displaySentiment ?? 'range'

  return (
    <div style={styles.container}>
      <div style={styles.title}>朝の地合い確認</div>

      <div style={styles.infoBox}>
        {/* Lv1: テキストのみ */}
        <div style={styles.row}>
          <span style={styles.label}>今日の地合い</span>
          <span style={getSentimentStyle(displaySentiment)}>
            {level >= 2 && SENTIMENT_ICONS[displaySentiment]}{' '}
            {SENTIMENT_LABELS[displaySentiment] ?? '不明'}
          </span>
        </div>

        {/* Lv3: 実強度 */}
        {level >= 3 && dailyCondition && (
          <div style={styles.row}>
            <span style={styles.label}>強度</span>
            <span>{(dailyCondition.actualStrength * 100).toFixed(0)}%</span>
          </div>
        )}

        {/* Lv4: アノマリー情報 */}
        {level >= 4 && anomaly && anomaly.tendency && (
          <div style={styles.row}>
            <span style={styles.label}>月次傾向</span>
            <span>{anomaly.tendency}</span>
          </div>
        )}
      </div>

      {/* 前日予告イベント */}
      {previewEvent && (
        <div style={styles.warning}>
          ⚠ 高インパクトイベントあり
        </div>
      )}

      <button style={styles.enterButton} onClick={handleEnter}>
        場に入る
      </button>
    </div>
  )
}
