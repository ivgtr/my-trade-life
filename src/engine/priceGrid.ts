export const TICK_UNIT = 5

/** TICK_UNIT の倍数に丸める（負値でも対称: -2.5 → -5） */
export function roundToTick(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value) / TICK_UNIT) * TICK_UNIT
}

/** TICK_UNIT の倍数に切り下げ */
export function floorToTick(value: number): number {
  return Math.floor(value / TICK_UNIT) * TICK_UNIT
}

/** TICK_UNIT の倍数に切り上げ */
export function ceilToTick(value: number): number {
  return Math.ceil(value / TICK_UNIT) * TICK_UNIT
}

/** 価格を TICK_UNIT の倍数に丸め、最小価格10円を保証する */
export function roundPrice(price: number): number {
  return Math.max(10, roundToTick(price))
}
