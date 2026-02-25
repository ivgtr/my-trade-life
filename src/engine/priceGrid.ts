/** 最小価格（円） */
export const MIN_PRICE = 10

/** 価格帯に応じたtick幅（呼値）を返す */
export function tickUnit(price: number): number {
  if (price <= 3_000) return 1
  if (price <= 5_000) return 5
  if (price <= 30_000) return 10
  if (price <= 50_000) return 50
  if (price <= 100_000) return 100
  if (price <= 300_000) return 500
  return 1_000
}

/** tick幅の倍数に丸める（負値でも対称） */
export function roundToTick(value: number, tick: number): number {
  return Math.sign(value) * Math.round(Math.abs(value) / tick) * tick
}

/** 価格をtick幅の倍数に切り下げ */
export function floorToTick(price: number): number {
  const tick = tickUnit(price)
  return Math.floor(price / tick) * tick
}

/** 価格をtick幅の倍数に切り上げ */
export function ceilToTick(price: number): number {
  const tick = tickUnit(price)
  return Math.ceil(price / tick) * tick
}

/** 価格をtick幅の倍数に丸め、最小価格を保証 */
export function roundPrice(price: number): number {
  const tick = tickUnit(price)
  return Math.max(MIN_PRICE, roundToTick(price, tick))
}
