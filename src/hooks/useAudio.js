import { useEffect, useRef } from 'react'
import { useGameContext } from '../state/GameContext'
import { AudioSystem } from '../systems/AudioSystem'
import { ConfigManager } from '../systems/ConfigManager'

/**
 * 画面フェーズの変更を監視してBGMを自動切替するフック。
 * App.jsx 等のトップレベルで1回だけ呼び出す。
 */
export function useAudio() {
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
