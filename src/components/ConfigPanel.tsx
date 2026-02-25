import { useState } from 'react'
import { ConfigManager } from '../systems/ConfigManager'
import { AudioSystem } from '../systems/AudioSystem'
import { applyAudioPreference } from '../systems/audioPreference'

export default function ConfigPanel() {
  const [config, setConfig] = useState(() => ConfigManager.load())

  const handleAudioEnabled = (enabled: boolean) => {
    applyAudioPreference(enabled)
    setConfig((c) => ({ ...c, audioEnabled: enabled }))
  }

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

  const handleInvertColors = (inverted: boolean) => {
    ConfigManager.set('invertColors', inverted)
    ConfigManager.applyColorTheme()
    setConfig((c) => ({ ...c, invertColors: inverted }))
  }

  return (
    <div className="flex flex-col gap-5 w-80">
      <div className="flex justify-between items-center">
        <span className="text-sm">音声</span>
        <div className="flex gap-2">
          <button
            className={`py-2 px-4 border rounded-md cursor-pointer text-sm ${
              config.audioEnabled
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-panel text-text-secondary border-bg-button'
            }`}
            onClick={() => handleAudioEnabled(true)}
          >
            ON
          </button>
          <button
            className={`py-2 px-4 border rounded-md cursor-pointer text-sm ${
              !config.audioEnabled
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-panel text-text-secondary border-bg-button'
            }`}
            onClick={() => handleAudioEnabled(false)}
          >
            OFF
          </button>
        </div>
      </div>

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

      <div className="flex justify-between items-center">
        <span className="text-sm">損益カラー</span>
        <div className="flex gap-2">
          <button
            className={`py-2 px-4 border rounded-md cursor-pointer text-sm ${
              !config.invertColors
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-panel text-text-secondary border-bg-button'
            }`}
            onClick={() => handleInvertColors(false)}
          >
            <span className="text-[#26a69a]">益</span>/<span className="text-[#ef5350]">損</span>
          </button>
          <button
            className={`py-2 px-4 border rounded-md cursor-pointer text-sm ${
              config.invertColors
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-panel text-text-secondary border-bg-button'
            }`}
            onClick={() => handleInvertColors(true)}
          >
            <span className="text-[#ef5350]">益</span>/<span className="text-[#26a69a]">損</span>
          </button>
        </div>
      </div>
    </div>
  )
}
