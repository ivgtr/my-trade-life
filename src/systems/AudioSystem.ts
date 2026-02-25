import type { BGMSceneId, SEId } from '../types/audio'
import type { BGMBuilder } from './bgm/types'
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
 * bgmPlayer / sePlayer をラップし、2軸（セッション許可 / ユーザー好み）でBGM再生を制御する。
 */
export const AudioSystem = {
  _audioUnlocked: false,
  _audioPreferred: true,
  _pendingScene: null as BGMSceneId | null,

  playBGM(sceneId: BGMSceneId): void {
    this._pendingScene = sceneId
    if (!this._audioUnlocked || !this._audioPreferred) return
    bgmPlayer.play(sceneId)
  },

  playBGMBuilder(builder: BGMBuilder): void {
    this._pendingScene = null
    if (!this._audioUnlocked || !this._audioPreferred) return
    bgmPlayer.playBuilder(builder)
  },

  stopBGM(): void {
    this._pendingScene = null
    bgmPlayer.stop()
  },

  playSE(seId: SEId): void {
    if (!this._audioUnlocked || !this._audioPreferred) return
    sePlayer.play(seId)
  },

  setBGMVolume(volume: number): void {
    bgmPlayer.setVolume(volume)
  },

  setSEVolume(volume: number): void {
    sePlayer.setVolume(volume)
  },

  unlockAudio(): void {
    this._audioUnlocked = true
    if (this._audioPreferred && this._pendingScene) {
      bgmPlayer.play(this._pendingScene)
    }
  },

  setAudioPreferred(preferred: boolean): void {
    this._audioPreferred = preferred
    if (this._audioUnlocked && preferred && this._pendingScene) {
      bgmPlayer.play(this._pendingScene)
    } else if (!preferred) {
      bgmPlayer.stop()
    }
  },

  initFromConfig(config: { bgmVolume?: number; seVolume?: number; audioEnabled?: boolean }): void {
    bgmPlayer.setVolume((config.bgmVolume ?? 50) / 100)
    sePlayer.setVolume((config.seVolume ?? 70) / 100)
    this._audioPreferred = config.audioEnabled ?? true
  },

  getBGMSceneForPhase(phase: string): BGMSceneId | null {
    return PHASE_TO_BGM[phase] ?? null
  },
}
