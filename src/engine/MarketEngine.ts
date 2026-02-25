import { gaussRandom } from '../utils/mathUtils'
import {
  TICK_INTERVAL, PRICE_MOVE, MOMENTUM, VOL_TRANSITION, TIME_OF_DAY,
  INTRADAY_SCENARIOS, SCENARIO_REGIME_BIAS, MEAN_REVERSION, EXTREME_EVENT,
} from './marketParams'
import { SESSION_START_MINUTES, SESSION_END_MINUTES, LUNCH_START_MINUTES, LUNCH_END_MINUTES } from '../constants/sessionTime'
import type {
  VolState, TimeZone, TickData, GameTime, MarketEngineConfig,
  RegimeParams, AnomalyParams, RegimeName,
  IntradayScenario, IntradayPhaseEntry, ExtremeEventState,
} from '../types/market'

/** 通常時間帯の圧縮レート（ゲーム内分/ms） — 3分セッション用 */
const NORMAL_RATE = 330 / 174750

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
  #openPrice: number
  #momentum: number
  #volState: VolState
  #speed: number
  #gameTime: number
  #externalForce: number
  #timerId: ReturnType<typeof setTimeout> | null
  #paused: boolean
  #running: boolean
  #intradayScenario: IntradayScenario
  #extremeEvent: ExtremeEventState | null
  #lastTickHigh: number
  #lastTickLow: number
  #onLunchStart: (() => void) | null

  constructor(config: MarketEngineConfig) {
    this.#regimeParams = config.regimeParams
    this.#anomalyParams = config.anomalyParams
    this.#onTick = config.onTick
    this.#onSessionEnd = config.onSessionEnd
    this.#currentPrice = config.openPrice
    this.#openPrice = config.openPrice
    this.#momentum = 0
    this.#volState = 'normal'
    this.#speed = config.speed
    this.#gameTime = SESSION_START_MINUTES
    this.#externalForce = 0
    this.#timerId = null
    this.#paused = false
    this.#running = false
    this.#intradayScenario = this.#selectScenario(config.regimeParams.regime)
    this.#extremeEvent = null
    this.#lastTickHigh = config.openPrice
    this.#lastTickLow = config.openPrice
    this.#onLunchStart = config.onLunchStart ?? null
  }

  /** エンジンを開始する。 */
  start(): void {
    this.#running = true
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

  /** 一時停止を解除する。 */
  resume(): void {
    this.#paused = false
    this.#scheduleNextTick()
  }

  /** 昼休み終了後に12:30から再開する。12:30境界tickを即時発行してから通常ループに入る。 */
  resumeFromLunch(): void {
    this.#gameTime = LUNCH_END_MINUTES
    this.#paused = false
    this.#resetTickHighLow()
    this.#emitTick()
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

  /** 境界tick発行前にhigh/lowを現在価格でリセットする。 */
  #resetTickHighLow(): void {
    this.#lastTickHigh = this.#currentPrice
    this.#lastTickLow = this.#currentPrice
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

    // ゲーム内時刻更新（固定刻み: 環境非依存で決定論的に進行）
    this.#gameTime += TICK_INTERVAL[this.#volState].mean * NORMAL_RATE

    // 昼休み到達チェック（11:30 = 690分）
    if (this.#gameTime >= LUNCH_START_MINUTES && this.#gameTime < LUNCH_END_MINUTES) {
      this.#gameTime = LUNCH_START_MINUTES
      this.#resetTickHighLow()
      this.#emitTick()
      this.pause()
      this.#onLunchStart?.()
      return
    }

    // 15:30（930分）到達チェック
    if (this.#gameTime >= SESSION_END_MINUTES) {
      this.#gameTime = SESSION_END_MINUTES
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
   * 価格変動モデル（幾何ブラウン運動）。
   * シナリオフェーズ・ドリフト・ショック・ファットテール・外部力・
   * モメンタム・平均回帰力・極端イベントを合算。
   * 全ショック成分は現在価格に比例する。
   */
  #updatePrice(): void {
    const prevPrice = this.#currentPrice
    const timeZone = this.#getTimeZone(this.#gameTime)
    const todParams = TIME_OF_DAY[timeZone]
    const phase = this.#getCurrentPhase()

    // 合成ボラティリティ倍率
    const combinedVolMult = this.#regimeParams.volMult *
      this.#anomalyParams.volBias * todParams.volMult * phase.volMult

    // ドリフト: フェーズのdriftOverrideがあれば上書き
    const driftRate = phase.driftOverride ??
      (this.#regimeParams.drift + this.#anomalyParams.driftBias)
    const drift = driftRate * this.#currentPrice

    // ショック: 価格比例（幾何ブラウン運動）
    const shock = gaussRandom() * this.#currentPrice * PRICE_MOVE.sdPct *
      combinedVolMult

    // ファットテール: 同様に価格比例
    let fatTail = 0
    if (Math.random() < PRICE_MOVE.fatTailP) {
      const multiplier = 3 + Math.random() * 2
      fatTail = gaussRandom() * this.#currentPrice * PRICE_MOVE.sdPct * multiplier
    }

    // 外部力（比率として保持、価格を乗じて適用。使用後に減衰）
    const externalEffect = this.#externalForce * this.#currentPrice
    this.#externalForce *= FORCE_DECAY
    if (Math.abs(this.#externalForce) < 0.00001) {
      this.#externalForce = 0
    }

    // 平均回帰力
    const meanRevForce = this.#calcMeanReversionForce(phase.meanRevStrength)

    // 極端イベント
    const extremeForce = this.#processExtremeEvent()

    // 合算
    const totalChange = drift + shock + fatTail + externalEffect +
      this.#momentum + meanRevForce + extremeForce
    let newPrice = this.#currentPrice + totalChange

    // 1円刻み丸め、最小10円
    newPrice = Math.max(10, Math.round(newPrice))
    this.#currentPrice = newPrice

    // tick内high/low推定
    const effectiveVol = this.#currentPrice * PRICE_MOVE.sdPct * combinedVolMult
    const { high, low } = this.#estimateTickHighLow(prevPrice, newPrice, effectiveVol)
    this.#lastTickHigh = high
    this.#lastTickLow = low

    // モメンタム更新（価格比例でクランプ）
    this.#momentum = this.#momentum * MOMENTUM.decay + (shock + fatTail) * (1 - MOMENTUM.decay)
    const maxMom = this.#currentPrice * MOMENTUM.maxAbsPct
    this.#momentum = Math.max(-maxMom, Math.min(maxMom, this.#momentum))
  }

  /** tick間の経路上の推定高値/安値をブラウンブリッジ的に推定する。 */
  #estimateTickHighLow(prevPrice: number, newPrice: number, effectiveVol: number): { high: number; low: number } {
    const maxP = Math.max(prevPrice, newPrice)
    const minP = Math.min(prevPrice, newPrice)
    const overshoot = Math.abs(gaussRandom()) * effectiveVol * 0.5
    return {
      high: Math.round(maxP + overshoot),
      low: Math.max(10, Math.round(minP - overshoot)),
    }
  }

  /** 重み付きランダムでセッション内シナリオを選択する。 */
  #selectScenario(regime: RegimeName): IntradayScenario {
    const biasTable = SCENARIO_REGIME_BIAS[regime]
    const weighted = INTRADAY_SCENARIOS.map(s => ({
      scenario: s,
      w: s.weight * (biasTable[s.name] ?? 1.0),
    }))
    const totalWeight = weighted.reduce((sum, { w }) => sum + w, 0)
    let rand = Math.random() * totalWeight
    for (const { scenario, w } of weighted) {
      rand -= w
      if (rand <= 0) return scenario
    }
    return weighted[weighted.length - 1].scenario
  }

  /** 現在のゲーム内時刻に対応するフェーズを返す。 */
  #getCurrentPhase(): IntradayPhaseEntry {
    const phases = this.#intradayScenario.phases
    let current = phases[0]
    for (const phase of phases) {
      if (this.#gameTime >= phase.startMinute) {
        current = phase
      } else {
        break
      }
    }
    return current
  }

  /** 始値からの乖離に応じた平均回帰力を計算する。 */
  #calcMeanReversionForce(meanRevStrength: number): number {
    if (meanRevStrength === 0) return 0
    const deviation = (this.#currentPrice - this.#openPrice) / this.#openPrice
    const absDeviation = Math.abs(deviation)
    if (absDeviation <= MEAN_REVERSION.threshold) return 0
    const excess = absDeviation - MEAN_REVERSION.threshold
    const sign = deviation > 0 ? -1 : 1
    const force = sign * MEAN_REVERSION.scale * this.#currentPrice * excess * meanRevStrength
    const maxForce = this.#currentPrice * MEAN_REVERSION.maxForcePct
    return Math.max(-maxForce, Math.min(maxForce, force))
  }

  /** 極端イベント（フラッシュクラッシュ/メルトアップ）の状態遷移と力を計算する。 */
  #processExtremeEvent(): number {
    if (this.#extremeEvent === null) {
      if (Math.random() < EXTREME_EVENT.triggerProb) {
        const isCrash = Math.random() < 0.5
        const duration = EXTREME_EVENT.activeDurationMin +
          Math.floor(Math.random() * (EXTREME_EVENT.activeDurationMax - EXTREME_EVENT.activeDurationMin + 1))
        this.#extremeEvent = {
          type: isCrash ? 'crash' : 'meltup',
          phase: 'active',
          ticksRemaining: duration,
          force: isCrash
            ? this.#currentPrice * EXTREME_EVENT.crashForcePct
            : this.#currentPrice * EXTREME_EVENT.meltUpForcePct,
          totalDisplacement: 0,
        }
      }
      return 0
    }

    const event = this.#extremeEvent

    if (event.phase === 'active') {
      const jitter = 0.7 + Math.random() * 0.6
      const force = event.force * jitter
      event.totalDisplacement += force
      event.ticksRemaining--
      if (event.ticksRemaining <= 0) {
        const recoveryDuration = EXTREME_EVENT.recoveryDurationMin +
          Math.floor(Math.random() * (EXTREME_EVENT.recoveryDurationMax - EXTREME_EVENT.recoveryDurationMin + 1))
        event.phase = 'recovery'
        event.force = -(event.totalDisplacement * EXTREME_EVENT.recoveryRatio) / recoveryDuration
        event.ticksRemaining = recoveryDuration
      }
      return force
    }

    // recovery phase
    const jitter = 0.8 + Math.random() * 0.4
    const force = event.force * jitter
    event.ticksRemaining--
    if (event.ticksRemaining <= 0) {
      this.#extremeEvent = null
    }
    return force
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
    if (gameTime <= LUNCH_START_MINUTES) return 'morning'
    if (gameTime < LUNCH_END_MINUTES) return 'lunch'
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
      high: this.#lastTickHigh,
      low: this.#lastTickLow,
      volume: this.#generateVolume(),
      timestamp: this.#gameTime,
      volState: this.#volState,
      timeZone,
    }
    this.#onTick(tickData)
  }
}
