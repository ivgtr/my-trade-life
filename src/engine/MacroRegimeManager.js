import { REGIME_PARAMS, REGIME_ORDER, MARKOV_MATRIX, MONTHLY_ANOMALY } from './marketParams'

/**
 * @typedef {Object} DailyCondition
 * @property {string} displaySentiment - 表示用の地合い（プレイヤーに見せる）
 * @property {string} actualSentiment - 実際の地合い（内部計算用）
 * @property {number} actualStrength - 地合いの強度（0〜1）
 * @property {boolean} isAccurate - 表示と実際が一致しているか
 */

/**
 * @typedef {Object} RegimeParams
 * @property {number} drift - ドリフト値
 * @property {number} volMult - ボラティリティ倍率
 * @property {string} regime - レジーム名
 */

/**
 * @typedef {Object} AnomalyParams
 * @property {number} driftBias - ドリフトバイアス
 * @property {number} volBias - ボラティリティバイアス
 * @property {string} tendency - 傾向の説明
 */

/**
 * @typedef {Object} MonthPreview
 * @property {string} regime - 現在のレジーム名
 * @property {string} outlook - 見通しテキスト
 * @property {string} volatility - ボラティリティ水準
 */

/**
 * @typedef {Object} YearPreviewEntry
 * @property {number} quarter - 四半期番号
 * @property {string} regime - レジーム名
 * @property {number} drift - ドリフト値
 * @property {number} volMult - ボラティリティ倍率
 */

/** 初期レジーム候補（ゲーム開始時に等確率で選択） */
const INITIAL_REGIMES = ['bullish', 'bearish', 'range']

/** プレイヤーレベルごとの地合い表示精度 */
const ACCURACY_BY_LEVEL = { 1: 0.50, 2: 0.60, 3: 0.70, 4: 0.75, 5: 0.80 }

/**
 * マクロ地合い（レジーム）管理クラス。
 * マルコフ連鎖による四半期ごとのレジーム遷移と、
 * プレイヤーレベル連動の二層地合いモデルを実現する。
 */
export class MacroRegimeManager {
  /** @type {string|null} 現在の実際のレジーム名 */
  #currentRegime
  /** @type {number} 通算四半期番号 */
  #currentQuarter
  /** @type {Array<{quarter: number, regime: string}>} レジーム遷移履歴 */
  #regimeHistory

  /**
   * @param {Object|null} state - 復元用のシリアライズ済み状態。nullの場合は空初期化
   */
  constructor(state = null) {
    if (state) {
      this.#currentRegime = state.currentRegime
      this.#currentQuarter = state.currentQuarter
      this.#regimeHistory = state.regimeHistory ? [...state.regimeHistory] : []
    } else {
      this.#currentRegime = null
      this.#currentQuarter = 0
      this.#regimeHistory = []
    }
  }

  /**
   * ゲーム開始時の最初の四半期レジームを決定する。
   * INITIAL_REGIMESから等確率でランダム選択する。
   */
  initializeFirstQuarter() {
    const index = Math.floor(Math.random() * INITIAL_REGIMES.length)
    this.#currentRegime = INITIAL_REGIMES[index]
    this.#currentQuarter = 1
    this.#regimeHistory.push({ quarter: this.#currentQuarter, regime: this.#currentRegime })
  }

  /**
   * マルコフ連鎖で次のレジームを選択する（プライベートヘルパー）。
   * 累積確率方式で遷移先を決定する。
   * @param {string} currentRegime - 現在のレジーム名
   * @returns {string} 次のレジーム名
   */
  #markovStep(currentRegime) {
    const row = MARKOV_MATRIX[currentRegime]
    const rand = Math.random()
    let cumulative = 0
    for (let i = 0; i < row.length; i++) {
      cumulative += row[i]
      if (rand < cumulative) {
        return REGIME_ORDER[i]
      }
    }
    // 浮動小数点誤差対策: 最後のレジームをフォールバック
    return REGIME_ORDER[REGIME_ORDER.length - 1]
  }

  /**
   * 四半期遷移を実行する。
   * マルコフ連鎖で次のレジームに遷移し、履歴に追加する。
   * @returns {string} 新しいレジーム名
   */
  transitionQuarter() {
    this.#currentRegime = this.#markovStep(this.#currentRegime)
    this.#currentQuarter++
    this.#regimeHistory.push({ quarter: this.#currentQuarter, regime: this.#currentRegime })
    return this.#currentRegime
  }

  /**
   * 日次の地合い情報を生成する。
   * プレイヤーレベルに応じた精度で表示用と実際の地合いを返す。
   * @param {number} playerLevel - プレイヤーレベル（1〜5）
   * @returns {DailyCondition}
   */
  generateDailyCondition(playerLevel) {
    const level = Math.max(1, Math.min(5, Math.floor(playerLevel)))
    const accuracy = ACCURACY_BY_LEVEL[level]
    const isAccurate = Math.random() < accuracy
    const actualSentiment = this.#currentRegime

    let displaySentiment
    if (isAccurate) {
      displaySentiment = actualSentiment
    } else {
      const others = REGIME_ORDER.filter((r) => r !== actualSentiment)
      displaySentiment = others[Math.floor(Math.random() * others.length)]
    }

    const actualStrength = Math.random()

    return { displaySentiment, actualSentiment, actualStrength, isAccurate }
  }

  /**
   * 現在のレジームパラメータを取得する。
   * @returns {RegimeParams}
   */
  getRegimeParams() {
    const params = REGIME_PARAMS[this.#currentRegime]
    return { drift: params.drift, volMult: params.volMult, regime: this.#currentRegime }
  }

  /**
   * 指定月のアノマリーパラメータを取得する。
   * 未定義月はデフォルト値を返す。
   * @param {number} month - 月（1〜12）
   * @returns {AnomalyParams}
   */
  getAnomalyParams(month) {
    const anomaly = MONTHLY_ANOMALY[month]
    if (!anomaly) {
      return { driftBias: 0, volBias: 1.0, tendency: '' }
    }
    return { driftBias: anomaly.driftBias, volBias: anomaly.volBias, tendency: anomaly.tendency }
  }

  /**
   * プレイヤーレベルに応じたアノマリー情報を返す。
   * Lv4未満はnull、Lv4以上は月別アノマリーを返す。
   * @param {number} month - 月（1〜12）
   * @param {number} playerLevel - プレイヤーレベル（1〜5）
   * @returns {AnomalyParams|null}
   */
  getVisibleAnomalyInfo(month, playerLevel) {
    if (playerLevel < 4) {
      return null
    }
    return this.getAnomalyParams(month)
  }

  /**
   * 来月の見通し情報を生成する。
   * 現在のレジームのdrift/volMultからテキストを生成する。
   * @returns {MonthPreview}
   */
  getNextMonthPreview() {
    const params = REGIME_PARAMS[this.#currentRegime]

    let outlook
    if (params.drift > 0) {
      outlook = '上昇傾向'
    } else if (params.drift < 0) {
      outlook = '下落傾向'
    } else {
      outlook = '横ばい'
    }

    let volatility
    if (params.volMult >= 1.5) {
      volatility = '高い'
    } else if (params.volMult >= 1.0) {
      volatility = '普通'
    } else {
      volatility = '低い'
    }

    return { regime: this.#currentRegime, outlook, volatility }
  }

  /**
   * 来年（4四半期分）のレジーム予想をシミュレーションする。
   * 内部状態は変更しない（読み取り専用のシミュレーション）。
   * @returns {YearPreviewEntry[]}
   */
  getNextYearPreview() {
    const preview = []
    let simRegime = this.#currentRegime
    for (let i = 0; i < 4; i++) {
      simRegime = this.#markovStep(simRegime)
      const params = REGIME_PARAMS[simRegime]
      preview.push({
        quarter: this.#currentQuarter + 1 + i,
        regime: simRegime,
        drift: params.drift,
        volMult: params.volMult,
      })
    }
    return preview
  }

  /**
   * 状態をシリアライズして返す。復元用。
   * @returns {{ currentRegime: string|null, currentQuarter: number, regimeHistory: Array<{quarter: number, regime: string}> }}
   */
  serialize() {
    return {
      currentRegime: this.#currentRegime,
      currentQuarter: this.#currentQuarter,
      regimeHistory: [...this.#regimeHistory],
    }
  }
}
