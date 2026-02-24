import { bgmPlayer } from './bgm'
import { sePlayer } from './se'

/**
 * 画面フェーズ → BGMシーンIDのマッピングテーブル
 * @type {Record<string, string|null>}
 */
const PHASE_TO_BGM = {
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
  /**
   * BGMシーンを切り替える。
   * @param {'title'|'trading'|'calendar'|'report'|'gameover'} sceneId
   */
  playBGM(sceneId) {
    bgmPlayer.play(sceneId)
  },

  /**
   * BGMを停止する。
   */
  stopBGM() {
    bgmPlayer.stop()
  },

  /**
   * SEを再生する。
   * @param {'entry'|'exit'|'profit'|'loss'|'losscut'|'news'|'levelup'|'milestone'|'milestoneBig'|'calendarFlip'} seId
   */
  playSE(seId) {
    sePlayer.play(seId)
  },

  /**
   * BGM音量を設定する（0〜1）。
   * @param {number} volume
   */
  setBGMVolume(volume) {
    bgmPlayer.setVolume(volume)
  },

  /**
   * SE音量を設定する（0〜1）。
   * @param {number} volume
   */
  setSEVolume(volume) {
    sePlayer.setVolume(volume)
  },

  /**
   * ConfigManagerの設定から初期音量を設定する。
   * @param {Object} config - ConfigManager.getAll() の戻り値
   */
  initFromConfig(config) {
    bgmPlayer.setVolume((config.bgmVolume ?? 50) / 100)
    sePlayer.setVolume((config.seVolume ?? 70) / 100)
  },

  /**
   * 画面フェーズからBGMシーンIDを取得する。
   * @param {string} phase - 画面フェーズ名
   * @returns {string|null} BGMシーンID（nullの場合はBGM停止）
   */
  getBGMSceneForPhase(phase) {
    return PHASE_TO_BGM[phase] ?? null
  },
}
