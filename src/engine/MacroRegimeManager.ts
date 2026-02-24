import { REGIME_PARAMS, REGIME_ORDER, MARKOV_MATRIX, MONTHLY_ANOMALY } from './marketParams'
import type { RegimeName, DailyCondition, RegimeParams, AnomalyParams, MonthPreview, YearPreviewEntry } from '../types/market'

/** 初期レジーム候補（ゲーム開始時に等確率で選択） */
const INITIAL_REGIMES: readonly RegimeName[] = ['bullish', 'bearish', 'range']

/** プレイヤーレベルごとの地合い表示精度 */
const ACCURACY_BY_LEVEL: Record<number, number> = { 1: 0.50, 2: 0.60, 3: 0.70, 4: 0.75, 5: 0.80 }

interface RegimeHistoryEntry {
  quarter: number
  regime: RegimeName
}

interface MacroRegimeState {
  currentRegime: RegimeName | null
  currentQuarter: number
  regimeHistory: RegimeHistoryEntry[]
}

/**
 * マクロ地合い（レジーム）管理クラス。
 * マルコフ連鎖による四半期ごとのレジーム遷移と、
 * プレイヤーレベル連動の二層地合いモデルを実現する。
 */
export class MacroRegimeManager {
  #currentRegime: RegimeName | null
  #currentQuarter: number
  #regimeHistory: RegimeHistoryEntry[]

  constructor(state: MacroRegimeState | null = null) {
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
  initializeFirstQuarter(): void {
    const index = Math.floor(Math.random() * INITIAL_REGIMES.length)
    this.#currentRegime = INITIAL_REGIMES[index]
    this.#currentQuarter = 1
    this.#regimeHistory.push({ quarter: this.#currentQuarter, regime: this.#currentRegime })
  }

  /**
   * マルコフ連鎖で次のレジームを選択する（プライベートヘルパー）。
   * 累積確率方式で遷移先を決定する。
   */
  #markovStep(currentRegime: RegimeName): RegimeName {
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
   */
  transitionQuarter(): RegimeName {
    this.#currentRegime = this.#markovStep(this.#currentRegime!)
    this.#currentQuarter++
    this.#regimeHistory.push({ quarter: this.#currentQuarter, regime: this.#currentRegime })
    return this.#currentRegime
  }

  /**
   * 日次の地合い情報を生成する。
   * プレイヤーレベルに応じた精度で表示用と実際の地合いを返す。
   */
  generateDailyCondition(playerLevel: number): DailyCondition {
    const level = Math.max(1, Math.min(5, Math.floor(playerLevel)))
    const accuracy = ACCURACY_BY_LEVEL[level]
    const isAccurate = Math.random() < accuracy
    const actualSentiment = this.#currentRegime!

    let displaySentiment: string
    if (isAccurate) {
      displaySentiment = actualSentiment
    } else {
      const others = REGIME_ORDER.filter((r) => r !== actualSentiment)
      displaySentiment = others[Math.floor(Math.random() * others.length)]
    }

    const actualStrength = Math.random()

    return { displaySentiment, actualSentiment, actualStrength, isAccurate }
  }

  /** 現在のレジームパラメータを取得する。 */
  getRegimeParams(): RegimeParams {
    const params = REGIME_PARAMS[this.#currentRegime!]
    return { drift: params.drift, volMult: params.volMult, regime: this.#currentRegime! }
  }

  /**
   * 指定月のアノマリーパラメータを取得する。
   * 未定義月はデフォルト値を返す。
   */
  getAnomalyParams(month: number): AnomalyParams {
    const anomaly = MONTHLY_ANOMALY[month as keyof typeof MONTHLY_ANOMALY]
    if (!anomaly) {
      return { driftBias: 0, volBias: 1.0, tendency: '' }
    }
    return { driftBias: anomaly.driftBias, volBias: anomaly.volBias, tendency: anomaly.tendency }
  }

  /**
   * プレイヤーレベルに応じたアノマリー情報を返す。
   * Lv4未満はnull、Lv4以上は月別アノマリーを返す。
   */
  getVisibleAnomalyInfo(month: number, playerLevel: number): AnomalyParams | null {
    if (playerLevel < 4) {
      return null
    }
    return this.getAnomalyParams(month)
  }

  /**
   * 来月の見通し情報を生成する。
   * 現在のレジームのdrift/volMultからテキストを生成する。
   */
  getNextMonthPreview(): MonthPreview {
    const params = REGIME_PARAMS[this.#currentRegime!]

    let outlook: string
    if (params.drift > 0) {
      outlook = '上昇傾向'
    } else if (params.drift < 0) {
      outlook = '下落傾向'
    } else {
      outlook = '横ばい'
    }

    let volatility: string
    if (params.volMult >= 1.5) {
      volatility = '高い'
    } else if (params.volMult >= 1.0) {
      volatility = '普通'
    } else {
      volatility = '低い'
    }

    return { regime: this.#currentRegime!, outlook, volatility }
  }

  /**
   * 来年（4四半期分）のレジーム予想をシミュレーションする。
   * 内部状態は変更しない（読み取り専用のシミュレーション）。
   */
  getNextYearPreview(): YearPreviewEntry[] {
    const preview: YearPreviewEntry[] = []
    let simRegime = this.#currentRegime!
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

  /** 状態をシリアライズして返す。復元用。 */
  serialize(): MacroRegimeState {
    return {
      currentRegime: this.#currentRegime,
      currentQuarter: this.#currentQuarter,
      regimeHistory: [...this.#regimeHistory],
    }
  }
}
