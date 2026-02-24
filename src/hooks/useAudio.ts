import { useEffect, useRef } from 'react'
import { useGameContext } from './useGameContext'
import { AudioSystem } from '../systems/AudioSystem'
import { ConfigManager } from '../systems/ConfigManager'

export function useAudio(): void {
  const { gameState } = useGameContext()
  const initializedRef = useRef(false)

  // 初回マウント時にConfigManagerから音量を読み込む
  useEffect(() => {
    if (!initializedRef.current) {
      const config = ConfigManager.getAll()
      AudioSystem.initFromConfig(config)
      initializedRef.current = true
    }
  }, [])

  // phase変更時にBGMを自動切替
  useEffect(() => {
    const sceneId = AudioSystem.getBGMSceneForPhase(gameState.phase)
    if (sceneId === null) {
      AudioSystem.stopBGM()
    } else if (sceneId) {
      AudioSystem.playBGM(sceneId)
    }
  }, [gameState.phase])
}
