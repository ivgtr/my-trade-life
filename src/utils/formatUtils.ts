/** 金額を「¥1,234,567」形式にフォーマットする */
export function formatCurrency(amount: number): string {
  const isNegative = amount < 0
  const formatted = Math.abs(amount).toLocaleString('ja-JP')
  return `${isNegative ? '-' : ''}¥${formatted}`
}

/** 日付を「2025年4月1日（火）」形式にフォーマットする */
export function formatDate(date: Date): string {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土']
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const w = weekdays[date.getDay()]
  return `${y}年${m}月${d}日（${w}）`
}

/** 小数値をパーセンテージ「56.7%」形式にフォーマットする */
export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

/** 損益率を「+4.2%」「-6.6%」形式にフォーマットする */
export function formatPnlPercent(pnl: number, cost: number): string {
  if (cost === 0) return '0.0%'
  const pct = (pnl / cost) * 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}
