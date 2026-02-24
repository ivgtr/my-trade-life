import { useState, useEffect } from 'react'
import { useGameContext } from '../state/GameContext'
import { ACTIONS } from '../state/actions'
import { ConfigManager } from '../systems/ConfigManager'
import { AudioSystem } from '../systems/AudioSystem'

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
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '320px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '14px',
  },
  slider: {
    width: '160px',
    cursor: 'pointer',
  },
  value: {
    fontSize: '14px',
    color: '#a0a0b0',
    minWidth: '36px',
    textAlign: 'right',
  },
  toggleRow: {
    display: 'flex',
    gap: '8px',
  },
  toggleButton: {
    padding: '8px 16px',
    border: '1px solid #3a3a4e',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  toggleActive: {
    backgroundColor: '#6366f1',
    color: '#fff',
    borderColor: '#6366f1',
  },
  toggleInactive: {
    backgroundColor: '#1a1a2e',
    color: '#a0a0b0',
  },
  backButton: {
    marginTop: '32px',
    padding: '10px 24px',
    backgroundColor: '#3a3a4e',
    color: '#e0e0e0',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
} as const

export default function ConfigScreen() {
  const { dispatch } = useGameContext()
  const [config, setConfig] = useState(() => ConfigManager.load())

  useEffect(() => {
    setConfig(ConfigManager.load())
  }, [])

  const handleBGMVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    ConfigManager.set('bgmVolume', v)
    AudioSystem.setBGMVolume(v / 100)
    setConfig((c) => ({ ...c, bgmVolume: v }))
  }

  const handleSEVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value)
    ConfigManager.set('seVolume', v)
    AudioSystem.setSEVolume(v / 100)
    setConfig((c) => ({ ...c, seVolume: v }))
  }

  const handleSpeed = (speed: number) => {
    ConfigManager.set('defaultSpeed', speed)
    setConfig((c) => ({ ...c, defaultSpeed: speed }))
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>Config</div>
      <div style={styles.form}>
        <div style={styles.row}>
          <span style={styles.label}>BGM音量</span>
          <input
            type="range"
            min="0"
            max="100"
            value={config.bgmVolume}
            onChange={handleBGMVolume}
            style={styles.slider}
          />
          <span style={styles.value}>{config.bgmVolume}</span>
        </div>

        <div style={styles.row}>
          <span style={styles.label}>SE音量</span>
          <input
            type="range"
            min="0"
            max="100"
            value={config.seVolume}
            onChange={handleSEVolume}
            style={styles.slider}
          />
          <span style={styles.value}>{config.seVolume}</span>
        </div>

        <div style={styles.row}>
          <span style={styles.label}>デフォルト速度</span>
          <div style={styles.toggleRow}>
            <button
              style={{
                ...styles.toggleButton,
                ...(config.defaultSpeed === 1 ? styles.toggleActive : styles.toggleInactive),
              }}
              onClick={() => handleSpeed(1)}
            >
              1倍
            </button>
            <button
              style={{
                ...styles.toggleButton,
                ...(config.defaultSpeed === 2 ? styles.toggleActive : styles.toggleInactive),
              }}
              onClick={() => handleSpeed(2)}
            >
              2倍
            </button>
          </div>
        </div>
      </div>

      <button
        style={styles.backButton}
        onClick={() => dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'title' } })}
      >
        タイトルへ戻る
      </button>
    </div>
  )
}
