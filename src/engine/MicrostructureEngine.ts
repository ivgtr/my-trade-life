import { gaussRandom } from '../utils/mathUtils'
import {
  STICKY_PRICE, ROUND_NUMBER, IGNITION, STOP_HUNT,
  scaleProb,
} from './marketParams'
import { roundPrice, tickUnit } from './priceGrid'
import type { MicroContext, MicroResult, IgnitionState, StopHuntState, VolState } from '../types/market'

/** テスト用にオーバーライド可能なパラメータ群 */
export interface MicrostructureParams {
  STICKY_PRICE: {
    releaseMultMin: number
    releaseMultMax: number
    maxAccumulationMult: number
    volStateMaxTicks: Record<VolState, number>
  }
  ROUND_NUMBER: {
    attractionZone: number
    forceScale: number
    breakawayBoost: number
  }
  IGNITION: {
    triggerProb: number
    durationMin: number
    durationMax: number
    forcePct: number
    volStateMult: Record<VolState, number>
  }
  STOP_HUNT: {
    proximityZone: number
    triggerProb: number
    pierceDuration: number
    pierceForcePct: number
    reversalDuration: number
    reversalForcePct: number
  }
}

const DEFAULT_PARAMS: MicrostructureParams = {
  STICKY_PRICE,
  ROUND_NUMBER,
  IGNITION,
  STOP_HUNT,
}

/**
 * ミクロ構造エンジン。
 * Sticky Price・ラウンドナンバー・イグニション・ストップハンティングの
 * 4つのミクロ構造を管理し、tick単位の価格変動をリアルにする。
 */
export class MicrostructureEngine {
  #pendingPressure = 0
  #stickyCounter = 0
  #stickyThreshold: number
  #ignition: IgnitionState | null = null
  #stopHunt: StopHuntState | null = null
  #sessionHigh: number
  #sessionLow: number
  #params: MicrostructureParams

  constructor(openPrice: number, paramsOverride?: Partial<MicrostructureParams>) {
    this.#sessionHigh = openPrice
    this.#sessionLow = openPrice
    this.#params = { ...DEFAULT_PARAMS, ...paramsOverride }
    this.#stickyThreshold = this.#rollStickyThreshold('normal')
  }

  /** 毎ティック呼ばれるメインメソッド */
  update(ctx: MicroContext): MicroResult {
    // イグニション処理
    const ignitionForce = this.#processIgnition(ctx)

    // ストップハンティング処理
    const stopHuntForce = this.#processStopHunt(ctx)

    // マクロ力 + ミクロ力の合算
    const totalForce = ctx.totalChange + ignitionForce + stopHuntForce

    // ラウンドナンバー吸着力
    const roundForce = this.#calcRoundNumberForce(ctx.currentPrice, ctx.dt)
    const adjustedForce = totalForce + roundForce

    // Sticky Price制御
    const forceRelease = this.#ignition !== null || this.#stopHunt !== null
    const tick = tickUnit(ctx.currentPrice)
    const { price: newPrice, changed } = this.#applyStickyPrice(
      adjustedForce, tick, ctx.volState, forceRelease,
    )

    // 最終価格
    const finalPrice = changed
      ? roundPrice(ctx.currentPrice + newPrice)
      : ctx.currentPrice

    // セッション高値/安値更新
    if (changed) {
      if (finalPrice > this.#sessionHigh) this.#sessionHigh = finalPrice
      if (finalPrice < this.#sessionLow) this.#sessionLow = finalPrice
    }

    // tick内high/low推定
    const { high, low } = this.#estimateTickHighLow(finalPrice, ctx.effectiveVol)

    // ラウンドナンバーブレイクアウトのモメンタム追加
    const momentumBoost = this.#calcBreakawayBoost(ctx.currentPrice, finalPrice, changed)

    return {
      newPrice: finalPrice,
      appliedPriceChange: Math.abs(finalPrice - ctx.currentPrice),
      high: changed ? high : finalPrice,
      low: changed ? low : finalPrice,
      priceChanged: changed,
      ignitionActive: this.#ignition !== null,
      momentumBoost,
    }
  }

  /**
   * Sticky Price制御。
   * totalChangeを蓄積し、解放条件を満たしたとき一括適用する。
   */
  #applyStickyPrice(
    totalChange: number, tick: number, volState: VolState, forceRelease: boolean,
  ): { price: number; changed: boolean } {
    const params = this.#params.STICKY_PRICE
    const prevPressure = this.#pendingPressure

    // 蓄積
    this.#pendingPressure += totalChange

    // 蓄積上限クリップ
    const maxAccumulation = tick * params.maxAccumulationMult
    this.#pendingPressure = Math.max(-maxAccumulation, Math.min(maxAccumulation, this.#pendingPressure))

    this.#stickyCounter++

    // 符号反転チェック
    const signFlipped = prevPressure !== 0 &&
      Math.sign(prevPressure) !== Math.sign(this.#pendingPressure)

    // 解放条件
    const releaseMult = params.releaseMultMin +
      Math.random() * (params.releaseMultMax - params.releaseMultMin)
    const releaseThreshold = tick * releaseMult
    const pressureExceeded = Math.abs(this.#pendingPressure) >= releaseThreshold
    const tickLimitReached = this.#stickyCounter >= this.#stickyThreshold

    if (forceRelease || pressureExceeded || tickLimitReached || signFlipped) {
      const released = this.#pendingPressure
      this.#pendingPressure = 0
      this.#stickyCounter = 0
      this.#stickyThreshold = this.#rollStickyThreshold(volState)
      return { price: released, changed: true }
    }

    return { price: 0, changed: false }
  }

  /** 滞留閾値をランダムに決定する */
  #rollStickyThreshold(volState: VolState): number {
    const maxTicks = this.#params.STICKY_PRICE.volStateMaxTicks[volState]
    return 1 + Math.floor(Math.random() * maxTicks)
  }

  /**
   * ラウンドナンバー効果。
   * 近傍のキリ番への吸着力を計算する。
   */
  #calcRoundNumberForce(price: number, dt: number): number {
    const params = this.#params.ROUND_NUMBER
    const levels = [
      { unit: 100, strength: 0.3 },
      { unit: 500, strength: 0.6 },
      { unit: 1000, strength: 1.0 },
    ]

    let totalForce = 0
    for (const { unit, strength } of levels) {
      const nearest = Math.round(price / unit) * unit
      const distance = nearest - price
      const proximity = Math.abs(distance) / price

      if (proximity <= params.attractionZone) {
        // 距離が近いほど強い吸着力 (1 - proximity/zone で正規化)
        const normalizedProximity = 1 - proximity / params.attractionZone
        totalForce += Math.sign(distance) * params.forceScale * dt * price *
          normalizedProximity * strength
      }
    }

    return totalForce
  }

  /** キリ番をブレイクアウトした場合のモメンタム追加量を計算する */
  #calcBreakawayBoost(oldPrice: number, newPrice: number, changed: boolean): number {
    if (!changed) return 0

    const params = this.#params.ROUND_NUMBER
    const levels = [
      { unit: 1000, strength: 1.0 },
      { unit: 500, strength: 0.6 },
      { unit: 100, strength: 0.3 },
    ]

    for (const { unit, strength } of levels) {
      const oldNearest = Math.round(oldPrice / unit) * unit
      const newNearest = Math.round(newPrice / unit) * unit
      // キリ番を跨いだかチェック
      if (oldNearest !== newNearest) {
        const direction = Math.sign(newPrice - oldPrice)
        return direction * params.breakawayBoost * strength * newPrice
      }
    }

    return 0
  }

  /** モメンタム・イグニション処理 */
  #processIgnition(ctx: MicroContext): number {
    const params = this.#params.IGNITION

    // アクティブなイグニションの処理
    if (this.#ignition !== null) {
      const { direction, forcePerGameMinute } = this.#ignition
      const jitter = 0.7 + Math.random() * 0.6
      const force = direction * forcePerGameMinute * ctx.gameTimeDelta * jitter
      this.#ignition.timeRemaining -= ctx.gameTimeDelta
      if (this.#ignition.timeRemaining <= 0) {
        this.#ignition = null
      }
      return force
    }

    // 発火判定（extremeEvent中は抑制）
    if (ctx.extremeEventActive) return 0

    const prob = scaleProb(params.triggerProb * params.volStateMult[ctx.volState], ctx.dt)
    if (Math.random() >= prob) return 0

    // 発火
    const refTicks = params.durationMin +
      Math.floor(Math.random() * (params.durationMax - params.durationMin + 1))
    const durationMinutes = refTicks * ctx.gameTimePerRefTick

    // 方向: momentumSign方向に60%偏向
    const direction = ctx.momentumSign !== 0
      ? (Math.random() < 0.6 ? ctx.momentumSign : -ctx.momentumSign)
      : (Math.random() < 0.5 ? 1 : -1)

    const forcePerGameMinute = (ctx.currentPrice * params.forcePct) / ctx.gameTimePerRefTick

    this.#ignition = {
      direction,
      timeRemaining: durationMinutes,
      forcePerGameMinute,
    }

    // 初回ティックの力
    const jitter = 0.7 + Math.random() * 0.6
    return direction * forcePerGameMinute * ctx.gameTimeDelta * jitter
  }

  /** ストップハンティング処理 */
  #processStopHunt(ctx: MicroContext): number {
    const params = this.#params.STOP_HUNT

    // アクティブなストップハンティングの処理
    if (this.#stopHunt !== null) {
      const jitter = 0.7 + Math.random() * 0.6
      const force = this.#stopHunt.direction * this.#stopHunt.forcePerGameMinute *
        ctx.gameTimeDelta * jitter
      this.#stopHunt.timeRemaining -= ctx.gameTimeDelta

      if (this.#stopHunt.timeRemaining <= 0) {
        if (this.#stopHunt.phase === 'pierce') {
          // pierce → reversal遷移
          const reversalMinutes = params.reversalDuration * ctx.gameTimePerRefTick
          this.#stopHunt = {
            phase: 'reversal',
            direction: -this.#stopHunt.direction,
            timeRemaining: reversalMinutes,
            forcePerGameMinute: (ctx.currentPrice * params.reversalForcePct) / ctx.gameTimePerRefTick,
          }
        } else {
          this.#stopHunt = null
        }
      }

      return force
    }

    // 発火判定（extremeEvent中は抑制）
    if (ctx.extremeEventActive) return 0

    // セッション高値/安値の近傍判定
    const highProximity = Math.abs(ctx.currentPrice - this.#sessionHigh) / ctx.currentPrice
    const lowProximity = Math.abs(ctx.currentPrice - this.#sessionLow) / ctx.currentPrice

    const nearHigh = highProximity <= params.proximityZone && this.#sessionHigh > this.#sessionLow
    const nearLow = lowProximity <= params.proximityZone && this.#sessionHigh > this.#sessionLow

    if (!nearHigh && !nearLow) return 0

    if (Math.random() >= scaleProb(params.triggerProb, ctx.dt)) return 0

    // 発火: 高値近傍なら上方向にpierce、安値近傍なら下方向にpierce
    const pierceDirection = nearHigh ? 1 : -1
    const pierceMinutes = params.pierceDuration * ctx.gameTimePerRefTick

    this.#stopHunt = {
      phase: 'pierce',
      direction: pierceDirection,
      timeRemaining: pierceMinutes,
      forcePerGameMinute: (ctx.currentPrice * params.pierceForcePct) / ctx.gameTimePerRefTick,
    }

    const jitter = 0.7 + Math.random() * 0.6
    return pierceDirection * this.#stopHunt.forcePerGameMinute * ctx.gameTimeDelta * jitter
  }

  /** tick内の推定高値/安値を現在価格中心に対称に生成する */
  #estimateTickHighLow(price: number, effectiveVol: number): { high: number; low: number } {
    const tick = tickUnit(price)
    const minOvershoot = tickUnit(price + tick)
    const overshoot = Math.max(
      Math.abs(gaussRandom()) * effectiveVol * 0.5,
      minOvershoot,
    )
    return {
      high: roundPrice(price + overshoot),
      low: roundPrice(price - overshoot),
    }
  }
}
