import { gaussRandom } from '../utils/mathUtils'
import { TICK_INTERVAL, PRICE_MOVE, MOMENTUM, VOL_TRANSITION, TIME_OF_DAY } from './marketParams'

/**
 * @typedef {Object} TickData
 * @property {number} price - 現在価格（10円刻み）
 * @property {number} volume - 出来高
 * @property {number} timestamp - ゲーム内時刻（分）
 * @property {string} volState - ボラティリティ状態（high/normal/low）
 * @property {string} timeZone - 時間帯（open/morning/lunch/afternoon/close）
 */

/**
 * @typedef {Object} GameTime
 * @property {number} hours - 時
 * @property {number} minutes - 分
 * @property {number} totalMinutes - 合計分数
 * @property {string} formatted - "HH:MM" 形式
 */

/**
 * @typedef {Object} MarketEngineConfig
 * @property {number} openPrice - 始値
 * @property {import('./MacroRegimeManager').RegimeParams} regimeParams - レジームパラメータ
 * @property {import('./MacroRegimeManager').AnomalyParams} anomalyParams - アノマリー補正
 * @property {number} speed - 再生速度（1 or 2）
 * @property {function(TickData): void} onTick - Tickコールバック
 * @property {function(): void} onSessionEnd - セッション終了コールバック
 */

/** 通常時間帯の圧縮レート（ゲーム内分/ms） — 3分セッション用 */
const NORMAL_RATE = 330 / 174750

/** 昼休みの圧縮レート — 3分セッション用 */
const LUNCH_RATE = 60 / 5250

/** 外部イベント力の減衰係数 */
const FORCE_DECAY = 0.7

/** ボラ状態ごとの基本出来高 */
const BASE_VOLUME = Object.freeze({ high: 1500, normal: 800, low: 300 })

/**
 * セッション中のリアルタイム価格変動を生成するエンジン。
 * Tick生成・価格変動・時間帯管理を担う。
 */
export class MarketEngine {
  /** @type {number} 始値（不変） */
  #openPrice
  /** @type {import('./MacroRegimeManager').RegimeParams} レジームパラメータ */
  #regimeParams
  /** @type {import('./MacroRegimeManager').AnomalyParams} アノマリー補正 */
  #anomalyParams
  /** @type {function(TickData): void} Tickコールバック */
  #onTick
  /** @type {function(): void} セッション終了コールバック */
  #onSessionEnd
  /** @type {number} 現在価格 */
  #currentPrice
  /** @type {number} モメンタム累積値 */
  #momentum
  /** @type {string} ボラティリティ状態 */
  #volState
  /** @type {number} 再生速度(1/2) */
  #speed
  /** @type {number} ゲーム内時刻（分, 540=9:00） */
  #gameTime
  /** @type {number} 外部イベント力 */
  #externalForce
  /** @type {number|null} setTimeout ID */
  #timerId
  /** @type {boolean} 一時停止フラグ */
  #paused
  /** @type {boolean} 実行中フラグ */
  #running
  /** @type {number} 前回Tick時刻(performance.now) */
  #lastTickRealTime

  /**
   * @param {MarketEngineConfig} config
   */
  constructor(config) {
    this.#openPrice = config.openPrice
    this.#regimeParams = config.regimeParams
    this.#anomalyParams = config.anomalyParams
    this.#onTick = config.onTick
    this.#onSessionEnd = config.onSessionEnd
    this.#currentPrice = config.openPrice
    this.#momentum = 0
    this.#volState = 'normal'
    this.#speed = config.speed
    this.#gameTime = 540
    this.#externalForce = 0
    this.#timerId = null
    this.#paused = false
    this.#running = false
    this.#lastTickRealTime = 0
  }

  /**
   * エンジンを開始する。
   */
  start() {
    this.#running = true
    this.#lastTickRealTime = performance.now()
    this.#scheduleNextTick()
  }

  /**
   * エンジンを停止する。
   */
  stop() {
    this.#running = false
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId)
      this.#timerId = null
    }
  }

  /**
   * 再生速度を変更する。
   * @param {number} speed - 新しい再生速度（1 or 2）
   */
  setSpeed(speed) {
    this.#speed = speed
    if (this.#running && !this.#paused) {
      if (this.#timerId !== null) {
        clearTimeout(this.#timerId)
      }
      this.#scheduleNextTick()
    }
  }

  /**
   * 外部イベント力を注入する（加算方式で重畳可能）。
   * @param {number} force - 外部イベント力
   */
  injectExternalForce(force) {
    this.#externalForce += force
  }

  /**
   * 一時停止する。
   */
  pause() {
    this.#paused = true
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId)
      this.#timerId = null
    }
  }

  /**
   * 一時停止を解除する。
   * pause中の経過時間を補正し、resume後に時刻が飛ばない。
   */
  resume() {
    this.#paused = false
    this.#lastTickRealTime = performance.now()
    this.#scheduleNextTick()
  }

  /**
   * 現在のゲーム内時刻を取得する。
   * @returns {GameTime}
   */
  getCurrentTime() {
    const totalMinutes = this.#gameTime
    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.floor(totalMinutes % 60)
    const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    return { hours, minutes, totalMinutes, formatted }
  }

  /**
   * 次のTickをスケジュールする。
   */
  #scheduleNextTick() {
    this.#timerId = setTimeout(() => this.#executeTick(), this.#calcNextInterval())
  }

  /**
   * 次のTick間隔を計算する。
   * ボラ状態に応じたTICK_INTERVALからガウスサンプリング。
   * @returns {number} 次のTick間隔（ms）
   */
  #calcNextInterval() {
    const { mean, sd } = TICK_INTERVAL[this.#volState]
    const interval = mean + gaussRandom() * sd
    return Math.max(20, interval / this.#speed)
  }

  /**
   * メインTickループ。
   * 時刻更新→終了チェック→ボラ遷移→価格更新→Tick発行→次スケジュール。
   */
  #executeTick() {
    if (!this.#running || this.#paused) return

    const now = performance.now()
    const realDelta = now - this.#lastTickRealTime
    this.#lastTickRealTime = now

    // ゲーム内時刻更新（昼休みは高圧縮レート）
    const timeZone = this.#getTimeZone(this.#gameTime)
    const rate = timeZone === 'lunch' ? LUNCH_RATE : NORMAL_RATE
    this.#gameTime += realDelta * rate * this.#speed

    // 15:30（930分）到達チェック
    if (this.#gameTime >= 930) {
      this.#gameTime = 930
      this.#emitTick()
      this.#running = false
      this.#onSessionEnd()
      return
    }

    // ボラティリティ状態遷移
    this.#transitionVolState()

    // 価格変動計算
    this.#updatePrice()

    // Tick発行
    this.#emitTick()

    // 次Tickスケジュール
    this.#scheduleNextTick()
  }

  /**
   * 価格変動モデル。
   * ドリフト・ショック・ファットテール・外部力・モメンタムを合算。
   */
  #updatePrice() {
    const timeZone = this.#getTimeZone(this.#gameTime)
    const todParams = TIME_OF_DAY[timeZone]

    // ドリフト
    const drift = (this.#regimeParams.drift + this.#anomalyParams.driftBias) * this.#currentPrice

    // ショック
    const shock = gaussRandom() * PRICE_MOVE.sd *
      this.#regimeParams.volMult * this.#anomalyParams.volBias * todParams.volMult

    // ファットテール
    let fatTail = 0
    if (Math.random() < PRICE_MOVE.fatTailP) {
      const multiplier = 3 + Math.random() * 2
      fatTail = gaussRandom() * PRICE_MOVE.sd * multiplier
    }

    // 外部力（使用後に減衰）
    const externalEffect = this.#externalForce
    this.#externalForce *= FORCE_DECAY
    if (Math.abs(this.#externalForce) < 0.5) {
      this.#externalForce = 0
    }

    // 合算
    const totalChange = drift + shock + fatTail + externalEffect + this.#momentum
    let newPrice = this.#currentPrice + totalChange

    // 10円刻み丸め、最小10円
    newPrice = Math.max(10, Math.round(newPrice / 10) * 10)
    this.#currentPrice = newPrice

    // モメンタム更新
    this.#momentum = this.#momentum * MOMENTUM.decay + (shock + fatTail) * (1 - MOMENTUM.decay)
    this.#momentum = Math.max(-MOMENTUM.maxAbs, Math.min(MOMENTUM.maxAbs, this.#momentum))
  }

  /**
   * ボラティリティ状態遷移。
   * VOL_TRANSITIONの確率で遷移し、TIME_OF_DAYのvolPhBiasでバイアスを掛ける。
   */
  #transitionVolState() {
    const timeZone = this.#getTimeZone(this.#gameTime)
    const todParams = TIME_OF_DAY[timeZone]
    const biasTarget = todParams.volPhBias

    const transitions = this.#getTransitionsForState(this.#volState, biasTarget)
    const rand = Math.random()
    let cumulative = 0

    for (const { target, prob } of transitions) {
      cumulative += prob
      if (rand < cumulative) {
        this.#volState = target
        return
      }
    }
  }

  /**
   * 現在のボラ状態から遷移可能な候補と確率を返す。
   * biasTargetへの遷移は1.5倍、離脱は0.5倍のバイアスを掛ける。
   * @param {string} current - 現在のボラ状態
   * @param {string} biasTarget - バイアス先のボラ状態
   * @returns {Array<{target: string, prob: number}>}
   */
  #getTransitionsForState(current, biasTarget) {
    const mapping = {
      high:   [
        { target: 'normal', key: 'highToNormal' },
        { target: 'low',    key: 'highToLow' },
      ],
      normal: [
        { target: 'high', key: 'normalToHigh' },
        { target: 'low',  key: 'normalToLow' },
      ],
      low:    [
        { target: 'normal', key: 'lowToNormal' },
        { target: 'high',   key: 'lowToHigh' },
      ],
    }

    return mapping[current].map(({ target, key }) => {
      let prob = VOL_TRANSITION[key]
      if (target === biasTarget) {
        prob *= 1.5
      } else if (current === biasTarget) {
        prob *= 0.5
      }
      return { target, prob }
    })
  }

  /**
   * ゲーム内時刻から時間帯を判定する。
   * @param {number} gameTime - ゲーム内時刻（分）
   * @returns {string} 時間帯名
   */
  #getTimeZone(gameTime) {
    if (gameTime < 570) return 'open'
    if (gameTime < 690) return 'morning'
    if (gameTime < 750) return 'lunch'
    if (gameTime < 870) return 'afternoon'
    return 'close'
  }

  /**
   * 出来高を生成する。
   * BASE_VOLUME × 時間帯倍率 × ランダム揺らぎ。
   * @returns {number}
   */
  #generateVolume() {
    const timeZone = this.#getTimeZone(this.#gameTime)
    const todParams = TIME_OF_DAY[timeZone]
    const base = BASE_VOLUME[this.#volState]
    const randomFactor = 0.5 + Math.random()
    return Math.round(base * todParams.volMult * randomFactor)
  }

  /**
   * TickDataを生成してonTickコールバックに通知する。
   */
  #emitTick() {
    const timeZone = this.#getTimeZone(this.#gameTime)
    /** @type {TickData} */
    const tickData = {
      price: this.#currentPrice,
      volume: this.#generateVolume(),
      timestamp: this.#gameTime,
      volState: this.#volState,
      timeZone,
    }
    this.#onTick(tickData)
  }
}
