/**
 * 指定された日付が祝日かどうかを判定する。
 * v1ではスタブとして常にfalseを返す。
 * @param {Date} date - 判定対象の日付
 * @returns {boolean} 祝日ならtrue
 */
export function isHoliday(date) {
  return false
}

/**
 * 指定された日付がSQ日（特別清算指数算出日）かどうかを判定する。
 * v1ではスタブとして常にfalseを返す。
 * @param {Date} date - 判定対象の日付
 * @returns {boolean} SQ日ならtrue
 */
export function isSQDay(date) {
  return false
}

/**
 * 指定された日付が市場休場日かどうかを判定する。
 * 土日または祝日の場合にtrueを返す。
 * @param {Date} date - 判定対象の日付
 * @returns {boolean} 市場休場日ならtrue
 */
export function isMarketClosed(date) {
  const day = date.getDay()
  return day === 0 || day === 6 || isHoliday(date)
}
