const CONFIG_KEY = 'daytraderlife_config'

const DEFAULT_CONFIG = {
  bgmVolume: 50,
  seVolume: 70,
  defaultSpeed: 1,
}

let cachedConfig = null

/**
 * ゲーム設定管理シングルトン。
 * localStorage で永続化し、セーブデータとは分離する。
 *
 * Implements Req 2.1, 2.2, 2.3
 */
export const ConfigManager = {
  /**
   * localStorageから設定を読み込む。存在しない場合はDEFAULT_CONFIGを返す。
   * @returns {Object} 設定オブジェクト
   */
  load() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY)
      if (raw) {
        cachedConfig = { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
      } else {
        cachedConfig = { ...DEFAULT_CONFIG }
      }
    } catch {
      cachedConfig = { ...DEFAULT_CONFIG }
    }
    return { ...cachedConfig }
  },

  /**
   * 個別の設定項目を更新し、即時localStorageへ書き込む。
   * @param {string} key - 設定キー
   * @param {*} value - 設定値
   */
  set(key, value) {
    if (!cachedConfig) this.load()
    cachedConfig[key] = value
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(cachedConfig))
    } catch {
      // localStorage書き込み失敗は無視（メモリ上のキャッシュは更新済み）
    }
  },

  /**
   * 全設定を返す。
   * @returns {Object}
   */
  getAll() {
    if (!cachedConfig) this.load()
    return { ...cachedConfig }
  },

  /**
   * BGM音量を0〜1スケールで返す（AudioSystem連携用）。
   * @returns {number}
   */
  getBGMVolume01() {
    if (!cachedConfig) this.load()
    return cachedConfig.bgmVolume / 100
  },

  /**
   * SE音量を0〜1スケールで返す（AudioSystem連携用）。
   * @returns {number}
   */
  getSEVolume01() {
    if (!cachedConfig) this.load()
    return cachedConfig.seVolume / 100
  },
}
