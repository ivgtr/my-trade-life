/**
 * 指定された日付が祝日かどうかを判定する。
 * v1ではスタブとして常にfalseを返す。
 */
export function isHoliday(_date: Date): boolean {
  return false
}

/**
 * 指定された日付がSQ日（特別清算指数算出日）かどうかを判定する。
 * v1ではスタブとして常にfalseを返す。
 */
export function isSQDay(_date: Date): boolean {
  return false
}

/** 指定された日付が市場休場日（土日または祝日）かどうかを判定する */
export function isMarketClosed(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 || isHoliday(date)
}
