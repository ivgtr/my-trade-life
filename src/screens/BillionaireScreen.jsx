import { useEffect, useState } from 'react'
import { useGameContext } from '../state/GameContext'
import { ACTIONS } from '../state/actions'
import { AudioSystem } from '../systems/AudioSystem'
import { formatCurrency } from '../utils/formatUtils'

const CONFETTI_COUNT = 40

const styles = {
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#ffd700',
    fontFamily: 'monospace',
    overflow: 'hidden',
  },
  flash: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    zIndex: 100,
    pointerEvents: 'none',
  },
  logo: {
    fontSize: '48px',
    fontWeight: 'bold',
    letterSpacing: '8px',
    textShadow: '0 0 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 215, 0, 0.3)',
    marginBottom: '32px',
    zIndex: 10,
  },
  statsBox: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    border: '1px solid rgba(255, 215, 0, 0.3)',
    padding: '20px',
    borderRadius: '12px',
    width: '320px',
    marginBottom: '32px',
    zIndex: 10,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  },
  label: { color: '#b8860b' },
  value: { color: '#ffd700' },
  buttonRow: {
    display: 'flex',
    gap: '16px',
    zIndex: 10,
  },
  continueButton: {
    padding: '12px 24px',
    fontSize: '14px',
    backgroundColor: '#ffd700',
    color: '#0a0a0a',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  restartButton: {
    padding: '12px 24px',
    fontSize: '14px',
    backgroundColor: 'transparent',
    color: '#ffd700',
    border: '1px solid #ffd700',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  confetti: {
    position: 'fixed',
    top: '-20px',
    width: '10px',
    height: '10px',
    borderRadius: '2px',
    zIndex: 5,
    pointerEvents: 'none',
  },
}

const confettiColors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7']

/**
 * ビリオネア達成画面。フルスクリーンの派手な演出。
 */
export default function BillionaireScreen() {
  const { gameState, dispatch } = useGameContext()
  const [showFlash, setShowFlash] = useState(true)
  const [confettiItems] = useState(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 3,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    })),
  )

  useEffect(() => {
    AudioSystem.playSE('milestoneBig')
    const timer = setTimeout(() => setShowFlash(false), 300)
    return () => clearTimeout(timer)
  }, [])

  // CSS keyframes for confetti
  useEffect(() => {
    const id = 'billionaire-confetti-style'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.textContent = `
      @keyframes confettiFall {
        0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `
    document.head.appendChild(style)
  }, [])

  return (
    <div style={styles.container}>
      {/* フラッシュ */}
      {showFlash && (
        <div
          style={{
            ...styles.flash,
            opacity: showFlash ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />
      )}

      {/* 紙吹雪 */}
      {confettiItems.map((c) => (
        <div
          key={c.id}
          style={{
            ...styles.confetti,
            left: `${c.left}%`,
            width: `${c.size}px`,
            height: `${c.size}px`,
            backgroundColor: c.color,
            animation: `confettiFall ${c.duration}s linear ${c.delay}s infinite`,
          }}
        />
      ))}

      <div style={styles.logo}>BILLIONAIRE</div>

      <div style={styles.statsBox}>
        <div style={styles.row}>
          <span style={styles.label}>最終残高</span>
          <span style={styles.value}>{formatCurrency(gameState.balance)}</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>達成日数</span>
          <span style={styles.value}>{gameState.day ?? 0}日</span>
        </div>
        <div style={styles.row}>
          <span style={styles.label}>総取引回数</span>
          <span style={styles.value}>{gameState.totalTrades ?? 0}回</span>
        </div>
      </div>

      <div style={styles.buttonRow}>
        <button
          style={styles.continueButton}
          onClick={() => {
            dispatch({ type: ACTIONS.ENTER_ENDLESS })
            dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'calendar' } })
          }}
        >
          エンドレスモードで続ける
        </button>
        <button
          style={styles.restartButton}
          onClick={() => dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'title' } })}
        >
          最初からやり直す
        </button>
      </div>
    </div>
  )
}
