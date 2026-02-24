import type { BGMSceneId, SEId } from '../types/audio'
import { bgmPlayer } from './bgm'
import { sePlayer } from './se'

/** 画面フェーズ -> BGMシーンIDのマッピングテーブル */
const PHASE_TO_BGM: Record<string, BGMSceneId | null> = {
  title:          'title',
  importExport:   'title',
  calendar:       'calendar',
  morning:        'calendar',
  session:        'trading',
  report:         'report',
  weekend:        'report',
  monthlyReport:  'report',
  yearlyReport:   'report',
  gameOver:       'gameover',
  billionaire:    null, // BGM停止（SEのmilestoneBigで対応）
}

/**
 * BGM/SEファサード・シングルトン。
 * bgmPlayer / sePlayer をラップし、ConfigManagerと連携する。
 */
export const AudioSystem = {
  playBGM(sceneId: BGMSceneId): void {
    bgmPlayer.play(sceneId)
  },

  stopBGM(): void {
    bgmPlayer.stop()
  },

  playSE(seId: SEId): void {
    sePlayer.play(seId)
  },

  setBGMVolume(volume: number): void {
    bgmPlayer.setVolume(volume)
  },

  setSEVolume(volume: number): void {
    sePlayer.setVolume(volume)
  },

  initFromConfig(config: { bgmVolume?: number; seVolume?: number }): void {
    bgmPlayer.setVolume((config.bgmVolume ?? 50) / 100)
    sePlayer.setVolume((config.seVolume ?? 70) / 100)
  },

  getBGMSceneForPhase(phase: string): BGMSceneId | null {
    return PHASE_TO_BGM[phase] ?? null
  },
}
