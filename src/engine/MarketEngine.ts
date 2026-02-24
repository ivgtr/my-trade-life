import { gaussRandom } from '../utils/mathUtils'
import { TICK_INTERVAL, PRICE_MOVE, MOMENTUM, VOL_TRANSITION, TIME_OF_DAY } from './marketParams'
import type { VolState, TimeZone, TickData, GameTime, MarketEngineConfig, RegimeParams, AnomalyParams } from '../types/market'

/** 通常時間帯の圧縮レート（ゲーム内分/ms） — 3分セッション用 */
const NORMAL_RATE = 330 / 174750

/** 昼休みの圧縮レート — 3分セッション用 */
const LUNCH_RATE = 60 / 5250

/** 外部イベント力の減衰係数 */
const FORCE_DECAY = 0.7

/** ボラ状態ごとの基本出来高 */
const BASE_VOLUME: Record<VolState, number> = { high: 1500, normal: 800, low: 300 }

/**
 * セッション中のリアルタイム価格変動を生成するエンジン。
 * Tick生成・価格変動・時間帯管理を担う。
 */
export class MarketEngine {
  #regimeParams: RegimeParams
  #anomalyParams: AnomalyParams
  #onTick: (tick: TickData) => void
  #onSessionEnd: () => void
  #currentPrice: number
  #momentum: number
  #volState: VolState
  #speed: number
  #gameTime: number
  #externalForce: number
  #timerId: ReturnType<typeof setTimeout> | null
  #paused: boolean
  #running: boolean
  #lastTickRealTime: number

  constructor(config: MarketEngineConfig) {
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

  /** エンジンを開始する。 */
  start(): void {
    this.#running = true
    this.#lastTickRealTime = performance.now()
    this.#scheduleNextTick()
  }

  /** エンジンを停止する。 */
  stop(): void {
    this.#running = false
    if (this.#timerId !== null) {
      clearTimeout(this.#timerId)
      this.#timerId = null
    }
  }

  /** 再生速度を変更する。 */
  setSpeed(speed: number): void {
    this.#speed = speed
    if (this.#running && !this.#paused) {
      if (this.#timerId !== null) {
        clearTimeout(this.#timerId)
      }
      this.#scheduleNextTick()
    }
  }

  /** 外部イベント力を注入する（加算方式で重畳可能）。 */
  injectExternalForce(force: number): void {
    this.#externalForce += force
  }

  /** 一時停止する。 */
  pause(): void {
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
  resume(): void {
    this.#paused = false
    this.#lastTickRealTime = performance.now()
    this.#scheduleNextTick()
  }

  /** 現在のゲーム内時刻を取得する。 */
  getCurrentTime(): GameTime {
    const totalMinutes = this.#gameTime
    const hours = Math.floor(totalMinutes / 60)
    const minutes = Math.floor(totalMinutes % 60)
    const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    return { hours, minutes, totalMinutes, formatted }
  }

  /** 次のTickをスケジュールする。 */
  #scheduleNextTick(): void {
    this.#timerId = setTimeout(() => this.#executeTick(), this.#calcNextInterval())
  }

  /**
   * 次のTick間隔を計算する。
   * ボラ状態に応じたTICK_INTERVALからガウスサンプリング。
   */
  #calcNextInterval(): number {
    const { mean, sd } = TICK_INTERVAL[this.#volState]
    const interval = mean + gaussRandom() * sd
    return Math.max(20, interval / this.#speed)
  }

  /**
   * メインTickループ。
   * 時刻更新→終了チェック→ボラ遷移→価格更新→Tick発行→次スケジュール。
   */
  #executeTick(): void {
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
  #updatePrice(): void {
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
  #transitionVolState(): void {
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
   */
  #getTransitionsForState(current: VolState, biasTarget: VolState): Array<{ target: VolState; prob: number }> {
    const mapping: Record<VolState, Array<{ target: VolState; key: keyof typeof VOL_TRANSITION }>> = {
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

  /** ゲーム内時刻から時間帯を判定する。 */
  #getTimeZone(gameTime: number): TimeZone {
    if (gameTime < 570) return 'open'
    if (gameTime < 690) return 'morning'
    if (gameTime < 750) return 'lunch'
    if (gameTime < 870) return 'afternoon'
    return 'close'
  }

  /**
   * 出来高を生成する。
   * BASE_VOLUME × 時間帯倍率 × ランダム揺らぎ。
   */
  #generateVolume(): number {
    const timeZone = this.#getTimeZone(this.#gameTime)
    const todParams = TIME_OF_DAY[timeZone]
    const base = BASE_VOLUME[this.#volState]
    const randomFactor = 0.5 + Math.random()
    return Math.round(base * todParams.volMult * randomFactor)
  }

  /** TickDataを生成してonTickコールバックに通知する。 */
  #emitTick(): void {
    const timeZone = this.#getTimeZone(this.#gameTime)
    const tickData: TickData = {
      price: this.#currentPrice,
      volume: this.#generateVolume(),
      timestamp: this.#gameTime,
      volState: this.#volState,
      timeZone,
    }
    this.#onTick(tickData)
  }
}
