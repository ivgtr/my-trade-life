import { useState } from 'react'
import { useGameContext } from '../state/GameContext'
import { ACTIONS } from '../state/actions'
import { SaveSystem } from '../systems/SaveSystem'

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
    fontSize: '36px',
    fontWeight: 'bold',
    letterSpacing: '4px',
    marginBottom: '48px',
    color: '#ffd700',
    textShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
  },
  menu: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '260px',
  },
  button: {
    padding: '14px 24px',
    fontSize: '16px',
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    border: '1px solid #3a3a4e',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.2s',
  },
  buttonDisabled: {
    padding: '14px 24px',
    fontSize: '16px',
    backgroundColor: '#1a1a2e',
    color: '#555',
    border: '1px solid #2a2a3e',
    borderRadius: '8px',
    cursor: 'not-allowed',
    textAlign: 'left',
  },
  dialog: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 500,
  },
  dialogBox: {
    backgroundColor: '#1a1a2e',
    padding: '24px',
    borderRadius: '12px',
    textAlign: 'center',
    maxWidth: '360px',
  },
  dialogText: {
    marginBottom: '16px',
    fontSize: '14px',
  },
  dialogButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  dialogConfirm: {
    padding: '8px 20px',
    backgroundColor: '#ef5350',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  dialogCancel: {
    padding: '8px 20px',
    backgroundColor: '#3a3a4e',
    color: '#e0e0e0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
}

/**
 * タイトル画面。
 */
export default function TitleScreen({ onNewGame, onLoadGame }) {
  const { dispatch } = useGameContext()
  const [showConfirm, setShowConfirm] = useState(false)
  const hasSave = SaveSystem.hasSaveData()

  const handleNewGame = () => {
    if (hasSave) {
      setShowConfirm(true)
    } else if (onNewGame) {
      onNewGame()
    }
  }

  const confirmNewGame = () => {
    setShowConfirm(false)
    SaveSystem.deleteSaveData()
    if (onNewGame) onNewGame()
  }

  const handleLoad = () => {
    if (onLoadGame) onLoadGame()
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>DAY TRADER LIFE</div>
      <div style={styles.menu}>
        <button style={styles.button} onClick={handleNewGame}>
          ▶ New Game
        </button>
        <button
          style={hasSave ? styles.button : styles.buttonDisabled}
          onClick={hasSave ? handleLoad : undefined}
          disabled={!hasSave}
        >
          Load Game
        </button>
        <button
          style={styles.button}
          onClick={() => dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'config' } })}
        >
          Config
        </button>
        <button
          style={styles.button}
          onClick={() => dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'importExport' } })}
        >
          Import / Export
        </button>
      </div>

      {showConfirm && (
        <div style={styles.dialog}>
          <div style={styles.dialogBox}>
            <div style={styles.dialogText}>
              既存のセーブデータを上書きしますが、よろしいですか？
            </div>
            <div style={styles.dialogButtons}>
              <button style={styles.dialogConfirm} onClick={confirmNewGame}>上書きする</button>
              <button style={styles.dialogCancel} onClick={() => setShowConfirm(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
