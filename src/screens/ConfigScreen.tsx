import { useState, useEffect } from 'react'
import { useGameContext } from '../state/GameContext'
import { ACTIONS } from '../state/actions'
import { ConfigManager } from '../systems/ConfigManager'
import { AudioSystem } from '../systems/AudioSystem'

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
    <div className="flex flex-col items-center justify-center min-h-dvh bg-bg-deepest text-text-primary font-mono">
      <div className="text-2xl font-bold mb-8">Config</div>
      <div className="flex flex-col gap-5 w-80">
        <div className="flex justify-between items-center">
          <span className="text-sm">BGM音量</span>
          <input
            type="range"
            min="0"
            max="100"
            value={config.bgmVolume}
            onChange={handleBGMVolume}
            className="w-40 cursor-pointer"
          />
          <span className="text-sm text-text-secondary min-w-9 text-right">{config.bgmVolume}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm">SE音量</span>
          <input
            type="range"
            min="0"
            max="100"
            value={config.seVolume}
            onChange={handleSEVolume}
            className="w-40 cursor-pointer"
          />
          <span className="text-sm text-text-secondary min-w-9 text-right">{config.seVolume}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm">デフォルト速度</span>
          <div className="flex gap-2">
            <button
              className={`py-2 px-4 border rounded-md cursor-pointer text-sm ${
                config.defaultSpeed === 1
                  ? 'bg-accent text-white border-accent'
                  : 'bg-bg-panel text-text-secondary border-bg-button'
              }`}
              onClick={() => handleSpeed(1)}
            >
              1倍
            </button>
            <button
              className={`py-2 px-4 border rounded-md cursor-pointer text-sm ${
                config.defaultSpeed === 2
                  ? 'bg-accent text-white border-accent'
                  : 'bg-bg-panel text-text-secondary border-bg-button'
              }`}
              onClick={() => handleSpeed(2)}
            >
              2倍
            </button>
          </div>
        </div>
      </div>

      <button
        className="mt-8 py-2.5 px-6 bg-bg-button text-text-primary border-none rounded-md cursor-pointer text-sm"
        onClick={() => dispatch({ type: ACTIONS.SET_PHASE, payload: { phase: 'title' } })}
      >
        タイトルへ戻る
      </button>
    </div>
  )
}
