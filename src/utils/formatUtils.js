/**
 * 金額を「¥1,234,567」形式にフォーマットする。
 * 負の場合は「-¥1,234,567」形式になる。
 * @param {number} amount - 金額（円単位）
 * @returns {string} フォーマットされた金額文字列
 */
export function formatCurrency(amount) {
  const isNegative = amount < 0
  const formatted = Math.abs(amount).toLocaleString('ja-JP')
  return `${isNegative ? '-' : ''}¥${formatted}`
}

/**
 * 日付を「2025年4月1日（火）」形式にフォーマットする。
 * @param {Date} date - フォーマット対象の日付
 * @returns {string} フォーマットされた日付文字列
 */
export function formatDate(date) {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const w = weekdays[date.getDay()]
  return `${y}年${m}月${d}日（${w}）`
}

/**
 * 小数値をパーセンテージ「56.7%」形式にフォーマットする。
 * @param {number} value - 小数値（例: 0.567）
 * @returns {string} フォーマットされたパーセンテージ文字列
 */
export function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`
}
