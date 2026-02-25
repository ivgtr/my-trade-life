import { TIME_OF_DAY, BASE_VOLUME, VOLUME_DYNAMICS } from './marketParams'
import type { VolumeContext } from '../types/market'

/**
 * 出来高モデル。
 * 価格変動量・イグニション・sticky状態に連動した出来高を生成する。
 */
export class VolumeModel {
  generate(ctx: VolumeContext): number {
    const todParams = TIME_OF_DAY[ctx.timeZone]
    const base = BASE_VOLUME[ctx.volState]
    const randomFactor = 0.5 + Math.random()

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

    return Math.round(base * todParams.volMult * randomFactor * changeMult * eventMult)
  }
}
