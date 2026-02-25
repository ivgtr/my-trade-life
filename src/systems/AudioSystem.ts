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
 * bgmPlayer / sePlayer をラップし、2軸（セッション許可 / ユーザー好み）でBGM再生を制御する。
 */
export const AudioSystem = {
  _audioUnlocked: false,
  _bgmPreferred: true,
  _pendingScene: null as BGMSceneId | null,

  playBGM(sceneId: BGMSceneId): void {
    this._pendingScene = sceneId
    if (!this._audioUnlocked || !this._bgmPreferred) return
    bgmPlayer.play(sceneId)
  },

  stopBGM(): void {
    this._pendingScene = null
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

  unlockAudio(): void {
    this._audioUnlocked = true
    if (this._bgmPreferred && this._pendingScene) {
      bgmPlayer.play(this._pendingScene)
    }
  },

  setBGMPreferred(preferred: boolean): void {
    this._bgmPreferred = preferred
    if (this._audioUnlocked && preferred && this._pendingScene) {
      bgmPlayer.play(this._pendingScene)
    } else if (!preferred) {
      bgmPlayer.stop()
    }
  },

  initFromConfig(config: { bgmVolume?: number; seVolume?: number; bgmEnabled?: boolean }): void {
    bgmPlayer.setVolume((config.bgmVolume ?? 50) / 100)
    sePlayer.setVolume((config.seVolume ?? 70) / 100)
    this._bgmPreferred = config.bgmEnabled ?? true
  },

  getBGMSceneForPhase(phase: string): BGMSceneId | null {
    return PHASE_TO_BGM[phase] ?? null
  },
}
