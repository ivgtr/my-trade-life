import { useState, useEffect } from 'react'
import { useGameContext } from '../state/GameContext'
import { ACTIONS } from '../state/actions'
import { formatCurrency } from '../utils/formatUtils'

const GAME_OVER_MESSAGES = [
  '市場はあなたを忘れた。',
  'また来世。',
  '残高：¥0　経験：プライスレス',
  '相場は続く。あなたは続かなかった。',
  '損切りは早く、利確は遅く。逆でしたね。',
  '次は必ずうまくいく。きっと。たぶん。',
  '板の向こうで誰かが今日も儲けている。',
  'お疲れ様でした。市場はお疲れではありません。',
  '証拠金維持率：計算不能',
  'これはゲームです。現実ではありません。たぶん。',
]

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#050510',
    color: '#555',
    fontFamily: 'monospace',
    transition: 'opacity 2s ease-in',
  },
  message: {
    fontSize: '22px',
    fontWeight: 'bold',
    textAlign: 'center',
    maxWidth: '400px',
    lineHeight: '1.6',
    marginBottom: '48px',
    color: '#888',
    opacity: 0,
    transition: 'opacity 3s ease-in',
  },
  messageVisible: {
    opacity: 1,
  },
  scoreBox: {
    marginBottom: '48px',
    textAlign: 'center',
    opacity: 0,
    transition: 'opacity 2s ease-in 2s',
  },
  scoreVisible: {
    opacity: 1,
  },
  scoreRow: {
    fontSize: '13px',
    marginBottom: '6px',
    color: '#666',
  },
  retryButton: {
    padding: '8px 20px',
    backgroundColor: 'transparent',
    color: '#555',
    border: '1px solid #333',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    opacity: 0,
    transition: 'opacity 2s ease-in 4s',
  },
  retryVisible: {
    opacity: 1,
  },
}

/**
 * ゲームオーバー画面。パワポケ風の不気味な演出。
 */
export default function GameOverScreen() {
  const { gameState, dispatch } = useGameContext()
  const [visible, setVisible] = useState(false)
  const [message] = useState(
    () => GAME_OVER_MESSAGES[Math.floor(Math.random() * GAME_OVER_MESSAGES.length)],
  )

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div style={{ ...styles.container, opacity: visible ? 1 : 0 }}>
      <div style={{ ...styles.message, ...(visible ? styles.messageVisible : {}) }}>
        {message}
      </div>

      <div style={{ ...styles.scoreBox, ...(visible ? styles.scoreVisible : {}) }}>
        <div style={styles.scoreRow}>最終残高: {formatCurrency(gameState.balance ?? 0)}</div>
        <div style={styles.scoreRow}>到達日数: {gameState.day ?? 0}日</div>
        <div style={styles.scoreRow}>総取引回数: {gameState.totalTrades ?? 0}回</div>
      </div>

      <button
        style={{ ...styles.retryButton, ...(visible ? styles.retryVisible : {}) }}
        onClick={() => dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'title' } })}
      >
        もう一度
      </button>
    </div>
  )
}
