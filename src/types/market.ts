export type Timeframe = 1 | 5 | 15

export type VolState = 'high' | 'normal' | 'low'
export type TimeZone = 'open' | 'morning' | 'lunch' | 'afternoon' | 'close'
export type RegimeName = 'bullish' | 'bearish' | 'range' | 'turbulent' | 'bubble' | 'crash'

export interface TickData {
  price: number
  high: number
  low: number
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
  onLunchStart?: () => void
  seed?: number
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

export interface GapResult {
  openPrice: number
  gapAmount: number
  gapPercent: number
  isGapUp: boolean
}

/** セッション内シナリオの1フェーズ */
export interface IntradayPhaseEntry {
  startMinute: number
  driftOverride: number | null
  volMult: number
  meanRevStrength: number
}

/** セッション内シナリオ定義 */
export interface IntradayScenario {
  name: string
  weight: number
  phases: IntradayPhaseEntry[]
}

/** 極端イベント（フラッシュクラッシュ/メルトアップ）の状態 */
export interface ExtremeEventState {
  type: 'crash' | 'meltup'
  phase: 'active' | 'recovery'
  timeRemaining: number       // game-minutes
  force: number               // force per game-minute
  totalDisplacement: number
}

/** MarketEngine → MicrostructureEngine へ渡すコンテキスト */
export interface MicroContext {
  currentPrice: number
  totalChange: number
  dt: number
  gameTimeDelta: number
  gameTimePerRefTick: number
  volState: VolState
  effectiveVol: number
  momentumSign: number
  extremeEventActive: boolean
}

/** MicrostructureEngine → MarketEngine へ返す結果 */
export interface MicroResult {
  newPrice: number
  appliedPriceChange: number
  high: number
  low: number
  priceChanged: boolean
  ignitionActive: boolean
  momentumBoost: number
}

/** VolumeModel へ渡すコンテキスト */
export interface VolumeContext {
  volState: VolState
  timeZone: TimeZone
  priceChange: number
  currentPrice: number
  ignitionActive: boolean
  priceChanged: boolean
}

/** アルゴパターンからのオーバーライド */
export interface AlgoOverride {
  volume: number
}

/** イグニション状態（MicrostructureEngine内部） */
export interface IgnitionState {
  direction: number
  timeRemaining: number
  totalDuration: number
  forcePerGameMinute: number
}

/** ストップハンティング状態（MicrostructureEngine内部） */
export interface StopHuntState {
  phase: 'pierce' | 'reversal'
  direction: number
  timeRemaining: number
  forcePerGameMinute: number
}
