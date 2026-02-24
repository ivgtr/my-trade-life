export type VolState = 'high' | 'normal' | 'low'
export type TimeZone = 'open' | 'morning' | 'lunch' | 'afternoon' | 'close'
export type RegimeName = 'bullish' | 'bearish' | 'range' | 'turbulent' | 'bubble' | 'crash'

export interface TickData {
  price: number
  volume: number
  timestamp: number
  volState: VolState
  timeZone: TimeZone
}

export interface GameTime {
  hours: number
  minutes: number
  totalMinutes: number
  formatted: string
}

export interface MarketEngineConfig {
  openPrice: number
  regimeParams: RegimeParams
  anomalyParams: AnomalyParams
  speed: number
  onTick: (tick: TickData) => void
  onSessionEnd: () => void
}

export interface DailyCondition {
  displaySentiment: string
  actualSentiment: string
  actualStrength: number
  isAccurate: boolean
}

export interface RegimeParams {
  drift: number
  volMult: number
  regime: RegimeName
}

export interface AnomalyParams {
  driftBias: number
  volBias: number
  tendency: string
}

export interface MonthPreview {
  regime: string
  outlook: string
  volatility: string
}

export interface YearPreviewEntry {
  quarter: number
  regime: string
  drift: number
  volMult: number
}
