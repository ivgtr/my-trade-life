import { TIME_OF_DAY, BASE_VOLUME, VOLUME_DYNAMICS } from './marketParams'
import type { VolumeContext, AlgoOverride } from '../types/market'
import type { Rng } from '../utils/Rng'

/**
 * 出来高モデル。
 * 価格変動量・イグニション・sticky状態に連動した出来高を生成する。
 * randomFactorは対数正規分布、ソフトキャップで上限を滑らかに制限する。
 */
export class VolumeModel {
  #rng: Rng

  constructor(rng: Rng) {
    this.#rng = rng
  }

  generate(ctx: VolumeContext, algoOverride?: AlgoOverride): number {
    const cap = BASE_VOLUME[ctx.volState] * 10

    // アルゴオーバーライド時は既存倍率をバイパスし、ソフトキャップのみ適用
    if (algoOverride) {
      return Math.round(cap * Math.tanh(algoOverride.volume / cap))
    }

    const todParams = TIME_OF_DAY[ctx.timeZone]
    const base = BASE_VOLUME[ctx.volState]
    const randomFactor = Math.exp(this.#rng.gaussian() * 0.6)

    // 価格変動連動倍率
    const changeRatio = ctx.currentPrice > 0
      ? Math.abs(ctx.priceChange) / (ctx.currentPrice * VOLUME_DYNAMICS.changeSensitivity)
      : 0
    const changeMult = 1 + Math.min(changeRatio, VOLUME_DYNAMICS.maxChangeMult - 1)

    // イベント倍率
    const eventMult = ctx.ignitionActive
      ? VOLUME_DYNAMICS.ignitionMult
      : ctx.priceChanged
        ? 1.0
        : VOLUME_DYNAMICS.stickyMult

    const raw = base * todParams.volMult * randomFactor * changeMult * eventMult
    return Math.round(cap * Math.tanh(raw / cap))
  }
}
