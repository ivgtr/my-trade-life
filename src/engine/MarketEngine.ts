import {
  TICK_INTERVAL, PRICE_MOVE, MOMENTUM, VOL_TRANSITION, TIME_OF_DAY,
  INTRADAY_SCENARIOS, SCENARIO_REGIME_BIAS, MEAN_REVERSION, EXTREME_EVENT,
  REFERENCE_TICK_MEAN, scaleDecay, scaleProb,
} from './marketParams'
import { SESSION_START_MINUTES, SESSION_END_MINUTES, LUNCH_START_MINUTES, LUNCH_END_MINUTES } from '../constants/sessionTime'
import { MicrostructureEngine } from './MicrostructureEngine'
import { VolumeModel } from './VolumeModel'
import { OrderFlowPatternEngine } from './OrderFlowPatternEngine'
import { Rng } from '../utils/Rng'
import type {
  VolState, TimeZone, TickData, GameTime, MarketEngineConfig,
  RegimeParams, AnomalyParams, RegimeName, MicroResult, AlgoOverride,
  IntradayScenario, IntradayPhaseEntry, ExtremeEventState,
} from '../types/market'

/** 通常時間帯の圧縮レート（ゲーム内分/ms） — 3分セッション用 */
const NORMAL_RATE = 330 / 174750

/** 外部イベント力の減衰係数 */
const FORCE_DECAY = 0.7

/**
 * セッション中のリアルタイム価格変動を生成するエンジン。
 * Tick生成・価格変動・時間帯管理を担う。
 * ミクロ構造はMicrostructureEngine、出来高はVolumeModelに委譲する。
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
  #scheduledInterval: number
  #microstructure: MicrostructureEngine
  #volumeModel: VolumeModel
  #orderFlow: OrderFlowPatternEngine
  #lastMicroResult: MicroResult | null
  #priceRng: Rng

  constructor(config: MarketEngineConfig) {
    const seed = config.seed ?? Date.now()
    this.#priceRng = new Rng(seed)
    const volumeRng = new Rng(seed + 1)
    const microRng = new Rng(seed + 2)
    const patternRng = new Rng(seed + 3)

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
    this.#scheduledInterval = TICK_INTERVAL.normal.mean
    this.#microstructure = new MicrostructureEngine(config.openPrice, microRng)
    this.#volumeModel = new VolumeModel(volumeRng)
    this.#orderFlow = new OrderFlowPatternEngine(patternRng)
    this.#lastMicroResult = null
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
    this.#lastMicroResult = null
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
   * scheduledInterval（speed除算前）をdt計算・gameTime進行の基準として保持。
   */
  #calcNextInterval(): number {
    const { mean, sd } = TICK_INTERVAL[this.#volState]
    // 物理dt: 正規分布ベース（ゲーム内時刻進行の基準）
    const physics = Math.max(20, mean + this.#priceRng.gaussian() * sd)
    // 表示間隔: 指数分布でバースト/沈黙を表現
    const displayRaw = mean * -Math.log(1 - this.#priceRng.next())
    const display = Math.max(20, Math.min(displayRaw, mean * 3))
    this.#scheduledInterval = physics
    return Math.max(20, display / this.#speed)
  }

  /**
   * メインTickループ。
   * dt算出→時刻更新→終了チェック→ボラ遷移→価格更新→Tick発行→次スケジュール。
   */
  #executeTick(): void {
    if (!this.#running || this.#paused) return

    // dt: 実スケジュール間隔 / 基準間隔（全変換の基礎）
    const dt = this.#scheduledInterval / REFERENCE_TICK_MEAN

    // ゲーム内時刻更新: scheduledIntervalベース（dtと同じ時間基準）
    this.#gameTime += this.#scheduledInterval * NORMAL_RATE

    // 昼休み到達チェック（11:30 = 690分）
    if (this.#gameTime >= LUNCH_START_MINUTES && this.#gameTime < LUNCH_END_MINUTES) {
      this.#gameTime = LUNCH_START_MINUTES
      this.#lastMicroResult = null
      this.#resetTickHighLow()
      this.#emitTick()
      this.pause()
      this.#onLunchStart?.()
      return
    }

    // 15:30（930分）到達チェック
    if (this.#gameTime >= SESSION_END_MINUTES) {
      this.#gameTime = SESSION_END_MINUTES
      this.#lastMicroResult = null
      this.#emitTick()
      this.#running = false
      this.#onSessionEnd()
      return
    }

    // ボラティリティ状態遷移
    this.#transitionVolState(dt)

    // 価格変動計算
    this.#updatePrice(dt)

    // OrderFlowパターン更新
    const algoOverride = this.#orderFlow.update(dt, this.#volState)

    // Tick発行
    this.#emitTick(algoOverride)

    // 次Tickスケジュール
    this.#scheduleNextTick()
  }

  /**
   * 価格変動モデル。
   * マクロ力を計算し、ミクロ構造エンジンに委譲する。
   */
  #updatePrice(dt: number): void {
    const gameTimeDelta = this.#scheduledInterval * NORMAL_RATE
    const gameTimePerRefTick = REFERENCE_TICK_MEAN * NORMAL_RATE
    const phase = this.#getCurrentPhase()

    // 合成ボラティリティ倍率
    const todParams = TIME_OF_DAY[this.#getTimeZone(this.#gameTime)]
    const combinedVolMult = this.#regimeParams.volMult *
      this.#anomalyParams.volBias * todParams.volMult * phase.volMult

    // ドリフト: 線形スケーリング
    const driftRate = phase.driftOverride ??
      (this.#regimeParams.drift + this.#anomalyParams.driftBias)
    const drift = driftRate * dt * this.#currentPrice

    // ショック: dt未適用（ティック増でボラ増、意図的）
    const shock = this.#priceRng.gaussian() * this.#currentPrice * PRICE_MOVE.sdPct *
      combinedVolMult

    // ファットテール: 確率をscaleProb
    let fatTail = 0
    if (this.#priceRng.chance(scaleProb(PRICE_MOVE.fatTailP, dt))) {
      const multiplier = this.#priceRng.range(3, 5)
      fatTail = this.#priceRng.gaussian() * this.#currentPrice * PRICE_MOVE.sdPct * multiplier
    }

    // 外部力: 適用量は線形、減衰は指数
    const externalEffect = this.#externalForce * this.#currentPrice * dt
    this.#externalForce *= scaleDecay(FORCE_DECAY, dt)
    if (Math.abs(this.#externalForce) < 0.00001) {
      this.#externalForce = 0
    }

    // 平均回帰力: 線形スケーリング
    const meanRevForce = this.#calcMeanReversionForce(phase.meanRevStrength, dt)

    // 極端イベント
    const extremeForce = this.#processExtremeEvent(dt)

    // モメンタム: 減衰は指数、適用量は線形
    const effectiveDecay = scaleDecay(MOMENTUM.decay, dt)
    this.#momentum = this.#momentum * effectiveDecay + (shock + fatTail) * (1 - effectiveDecay)
    const maxMom = this.#currentPrice * MOMENTUM.maxAbsPct
    this.#momentum = Math.max(-maxMom, Math.min(maxMom, this.#momentum))
    const momentumEffect = this.#momentum * dt

    // マクロ力合算
    const totalChange = drift + shock + fatTail + externalEffect +
      momentumEffect + meanRevForce + extremeForce

    // ミクロ構造へ委譲
    const result = this.#microstructure.update({
      currentPrice: this.#currentPrice,
      totalChange,
      dt,
      gameTimeDelta,
      gameTimePerRefTick,
      volState: this.#volState,
      effectiveVol: this.#currentPrice * PRICE_MOVE.sdPct * combinedVolMult,
      momentumSign: Math.sign(this.#momentum),
      extremeEventActive: this.#extremeEvent !== null,
    })

    this.#currentPrice = result.newPrice
    this.#lastTickHigh = result.high
    this.#lastTickLow = result.low

    // キリ番ブレイクアウトのモメンタム反映
    if (result.momentumBoost !== 0) {
      this.#momentum += result.momentumBoost
      const momCap = this.#currentPrice * MOMENTUM.maxAbsPct
      this.#momentum = Math.max(-momCap, Math.min(momCap, this.#momentum))
    }

    this.#lastMicroResult = result
  }

  /** 重み付きランダムでセッション内シナリオを選択する。 */
  #selectScenario(regime: RegimeName): IntradayScenario {
    const biasTable = SCENARIO_REGIME_BIAS[regime]
    const weighted = INTRADAY_SCENARIOS.map(s => ({
      scenario: s,
      w: s.weight * (biasTable[s.name] ?? 1.0),
    }))
    const totalWeight = weighted.reduce((sum, { w }) => sum + w, 0)
    let rand = this.#priceRng.next() * totalWeight
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

  /** 始値からの乖離に応じた平均回帰力を計算する。線形スケーリング適用。 */
  #calcMeanReversionForce(meanRevStrength: number, dt: number): number {
    if (meanRevStrength === 0) return 0
    const deviation = (this.#currentPrice - this.#openPrice) / this.#openPrice
    const absDeviation = Math.abs(deviation)
    if (absDeviation <= MEAN_REVERSION.threshold) return 0
    const excess = absDeviation - MEAN_REVERSION.threshold
    const sign = deviation > 0 ? -1 : 1
    const price = this.#currentPrice
    const force = sign * MEAN_REVERSION.scale * dt * price * excess * meanRevStrength
    const maxForce = price * MEAN_REVERSION.maxForcePct * dt
    return Math.max(-maxForce, Math.min(maxForce, force))
  }

  /** 極端イベント（フラッシュクラッシュ/メルトアップ）の状態遷移と力を計算する。game-minutesベース。 */
  #processExtremeEvent(dt: number): number {
    const gameTimeDelta = this.#scheduledInterval * NORMAL_RATE
    const gameTimePerRefTick = REFERENCE_TICK_MEAN * NORMAL_RATE

    if (this.#extremeEvent === null) {
      if (this.#priceRng.chance(scaleProb(EXTREME_EVENT.triggerProb, dt))) {
        const isCrash = this.#priceRng.chance(0.5)
        const { activeDurationMin: min, activeDurationMax: max } = EXTREME_EVENT
        const refTicks = this.#priceRng.intInclusive(min, max)
        const durationMinutes = refTicks * gameTimePerRefTick
        const forcePct = isCrash ? EXTREME_EVENT.crashForcePct : EXTREME_EVENT.meltUpForcePct
        this.#extremeEvent = {
          type: isCrash ? 'crash' : 'meltup',
          phase: 'active',
          timeRemaining: durationMinutes,
          force: (this.#currentPrice * forcePct) / gameTimePerRefTick,
          totalDisplacement: 0,
        }
      }
      return 0
    }

    const event = this.#extremeEvent

    if (event.phase === 'active') {
      const jitter = this.#priceRng.jitter(1.0, 0.6)
      const forceThisTick = event.force * gameTimeDelta * jitter
      event.totalDisplacement += forceThisTick
      event.timeRemaining -= gameTimeDelta
      if (event.timeRemaining <= 0) {
        const { recoveryDurationMin: rMin, recoveryDurationMax: rMax } = EXTREME_EVENT
        const recoveryRefTicks = this.#priceRng.intInclusive(rMin, rMax)
        const recoveryMinutes = recoveryRefTicks * gameTimePerRefTick
        event.phase = 'recovery'
        event.force = -(event.totalDisplacement * EXTREME_EVENT.recoveryRatio) / recoveryMinutes
        event.timeRemaining = recoveryMinutes
      }
      return forceThisTick
    }

    // recovery phase
    const jitter = this.#priceRng.jitter(1.0, 0.4)
    const forceThisTick = event.force * gameTimeDelta * jitter
    event.timeRemaining -= gameTimeDelta
    if (event.timeRemaining <= 0) {
      this.#extremeEvent = null
    }
    return forceThisTick
  }

  /**
   * ボラティリティ状態遷移。
   * VOL_TRANSITIONの確率にバイアスを適用後、scaleProbでdt変換。
   */
  #transitionVolState(dt: number): void {
    const timeZone = this.#getTimeZone(this.#gameTime)
    const todParams = TIME_OF_DAY[timeZone]
    const biasTarget = todParams.volPhBias

    const transitions = this.#getTransitionsForState(this.#volState, biasTarget, dt)
    const rand = this.#priceRng.next()
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
   * 順序: bias適用(基準tickレート) → scaleProb(dt変換)
   */
  #getTransitionsForState(current: VolState, biasTarget: VolState, dt: number): Array<{ target: VolState; prob: number }> {
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
      // 1. 基準tick確率にバイアスを適用
      let biasedProb = VOL_TRANSITION[key]
      if (target === biasTarget) {
        biasedProb *= 1.5
      } else if (current === biasTarget) {
        biasedProb *= 0.5
      }
      // 2. バイアス適用済み確率をdt変換
      return { target, prob: scaleProb(biasedProb, dt) }
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

  /** TickDataを生成してonTickコールバックに通知する。 */
  #emitTick(algoOverride?: AlgoOverride): void {
    const timeZone = this.#getTimeZone(this.#gameTime)
    const volume = this.#volumeModel.generate({
      volState: this.#volState,
      timeZone,
      priceChange: this.#lastMicroResult?.appliedPriceChange ?? 0,
      currentPrice: this.#currentPrice,
      ignitionActive: this.#lastMicroResult?.ignitionActive ?? false,
      priceChanged: this.#lastMicroResult?.priceChanged ?? true,
    }, algoOverride)
    const tickData: TickData = {
      price: this.#currentPrice,
      high: this.#lastTickHigh,
      low: this.#lastTickLow,
      volume,
      timestamp: this.#gameTime,
      volState: this.#volState,
      timeZone,
    }
    this.#onTick(tickData)
  }
}
