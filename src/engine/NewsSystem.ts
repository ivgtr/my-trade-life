import { PRICE_MOVE } from './marketParams'
import type { RegimeName } from '../types/market'
import type { NewsEvent, PreviewEvent, WeekendNews } from '../types/news'

interface NewsTemplate {
  headline: string
  impactRange: readonly [number, number]
}

/** 即時型ニューステンプレート */
const IMMEDIATE_TEMPLATES: readonly NewsTemplate[] = Object.freeze([
  { headline: '日銀が金融政策を緊急変更',           impactRange: [0.6, 1.0] },
  { headline: '大手企業が経営破綻を発表',           impactRange: [-1.0, -0.6] },
  { headline: '為替が急変動、円が急騰',             impactRange: [-0.8, -0.4] },
  { headline: '政府が緊急経済対策を発表',           impactRange: [0.4, 0.8] },
  { headline: '海外市場で大規模売りが発生',         impactRange: [-0.8, -0.4] },
  { headline: '大手機関投資家が大量買い',           impactRange: [0.4, 0.8] },
  { headline: '地政学リスクが急激に高まる',         impactRange: [-0.7, -0.3] },
  { headline: 'テクノロジー大手が画期的新技術を発表', impactRange: [0.3, 0.7] },
])

/** 前日予告型ニューステンプレート */
const SCHEDULED_TEMPLATES: readonly NewsTemplate[] = Object.freeze([
  { headline: 'FOMC政策金利発表',         impactRange: [-0.8, 0.8] },
  { headline: '雇用統計発表',             impactRange: [-0.6, 0.6] },
  { headline: '主要企業決算発表',         impactRange: [-0.5, 0.5] },
  { headline: '消費者物価指数（CPI）発表', impactRange: [-0.6, 0.6] },
  { headline: 'GDP速報値発表',            impactRange: [-0.5, 0.5] },
  { headline: '日銀金融政策決定会合',     impactRange: [-0.7, 0.7] },
  { headline: '貿易収支発表',             impactRange: [-0.4, 0.4] },
])

/** 週末ニューステンプレート */
const WEEKEND_TEMPLATES: readonly NewsTemplate[] = Object.freeze([
  { headline: '週末の海外市場が大幅変動',         impactRange: [-0.6, 0.6] },
  { headline: '政府高官が経済政策について言及',   impactRange: [-0.4, 0.4] },
  { headline: '大手企業のM&A報道',               impactRange: [0.2, 0.5] },
  { headline: '国際会議で新たな合意',             impactRange: [-0.3, 0.3] },
  { headline: '中央銀行総裁が週末会見',           impactRange: [-0.5, 0.5] },
  { headline: '新興国市場に不安材料',             impactRange: [-0.5, -0.1] },
])

/** 地合い別の発動確率テーブル（1セッションあたり） */
const TRIGGER_PROBABILITY: Record<string, number> = Object.freeze({
  range:     0.20,
  bullish:   0.35,
  bearish:   0.35,
  turbulent: 0.75,
  bubble:    0.85,
  crash:     0.85,
})

/** 地合い別の最大イベント数 */
const MAX_EVENTS: Record<string, number> = Object.freeze({
  range:     1,
  bullish:   1,
  bearish:   1,
  turbulent: 2,
  bubble:    3,
  crash:     3,
})

/** セッションのゲーム内時間帯（分） */
const SESSION_START = 540  // 9:00
const SESSION_END = 930    // 15:30

/** 続報の最小間隔（ゲーム内分） */
const FOLLOW_UP_MIN_GAP = 30

let eventIdCounter = 0

interface WeekendModifier {
  driftBias: number
  volBias: number
  triggerProbBias: number
}

interface NewsSystemConfig {
  currentRegime: RegimeName
  onNewsTriggered: (event: NewsEvent) => void
}

/**
 * ブレイキングニュースシステム
 *
 * Implements Req 5.3, 12.1, 12.2, 12.3, 12.5, 17.2, 27.2
 */
export class NewsSystem {
  #currentRegime: RegimeName
  #onNewsTriggered: (event: NewsEvent) => void
  #scheduledEvents: NewsEvent[]
  #pendingPreview: PreviewEvent | null
  #triggeredIds: Set<string>
  #weekendModifier: WeekendModifier | null

  constructor(config: NewsSystemConfig) {
    this.#currentRegime = config.currentRegime
    this.#onNewsTriggered = config.onNewsTriggered
    this.#scheduledEvents = []
    this.#pendingPreview = null
    this.#triggeredIds = new Set()
    this.#weekendModifier = null
  }

  /** 現在のレジームを更新する。 */
  setRegime(regime: RegimeName): void {
    this.#currentRegime = regime
  }

  /** セッション開始時に当日のニュースイベントをスケジュールする。 */
  scheduleSessionEvents(_sessionDurationMs: number): NewsEvent[] {
    this.#scheduledEvents = []
    this.#triggeredIds = new Set()

    // 前日予告型イベントがある場合、まずそれをスケジュール
    if (this.#pendingPreview) {
      const template = SCHEDULED_TEMPLATES.find(
        (t) => t.headline === this.#pendingPreview!.headline,
      )
      const impactRange: readonly [number, number] = template ? template.impactRange : [-0.5, 0.5]
      const event = this.#createEvent(
        'scheduled',
        this.#pendingPreview.headline,
        this.#randomTriggerTime(),
        impactRange,
        false,
      )
      this.#scheduledEvents.push(event)
      this.#pendingPreview = null
    }

    // 発動確率判定
    let triggerProb = TRIGGER_PROBABILITY[this.#currentRegime] ?? 0.20
    if (this.#weekendModifier?.triggerProbBias) {
      triggerProb = Math.min(1.0, Math.max(0, triggerProb + this.#weekendModifier.triggerProbBias))
    }

    if (Math.random() >= triggerProb && this.#scheduledEvents.length === 0) {
      return [...this.#scheduledEvents]
    }

    // 即時型イベントの生成（前日予告分を除いた残り枠）
    const maxEvents = MAX_EVENTS[this.#currentRegime] ?? 1
    const remainingSlots = maxEvents - this.#scheduledEvents.length

    if (remainingSlots > 0 && (this.#scheduledEvents.length > 0 || Math.random() < triggerProb)) {
      // 少なくとも1件は生成（確率判定済み or 前日予告あり）
      const eventCount = remainingSlots > 1
        ? 1 + Math.floor(Math.random() * remainingSlots)
        : 1

      for (let i = 0; i < eventCount; i++) {
        const isFollowUp = i > 0 || this.#scheduledEvents.length > 0
        const template = this.#pickTemplate(IMMEDIATE_TEMPLATES)
        const triggerTime = this.#calcFollowUpTime(isFollowUp)

        const event = this.#createEvent(
          'immediate',
          template.headline,
          triggerTime,
          template.impactRange,
          isFollowUp,
        )
        this.#scheduledEvents.push(event)
      }
    }

    // triggerTimeでソート
    this.#scheduledEvents.sort((a, b) => a.triggerTime - b.triggerTime)

    // 最初のイベントはisFollowUp=false
    if (this.#scheduledEvents.length > 0) {
      this.#scheduledEvents[0].isFollowUp = false
    }

    // 週末補正をリセット
    this.#weekendModifier = null

    return [...this.#scheduledEvents]
  }

  /** Tick毎の発動チェック。gameTimeに到達したイベントを発動する。 */
  checkTriggers(gameTime: number): void {
    for (const event of this.#scheduledEvents) {
      if (this.#triggeredIds.has(event.id)) continue
      if (gameTime >= event.triggerTime) {
        this.#triggeredIds.add(event.id)
        this.#onNewsTriggered(event)
      }
    }
  }

  /** 前日予告イベントを生成する（成果報告画面用）。 */
  generatePreviewEvent(): PreviewEvent | null {
    // 前日予告の発生確率（地合いによる変動）
    const previewProb = TRIGGER_PROBABILITY[this.#currentRegime] ?? 0.20
    if (Math.random() >= previewProb * 0.5) {
      this.#pendingPreview = null
      return null
    }

    const template = this.#pickTemplate(SCHEDULED_TEMPLATES)
    this.#pendingPreview = {
      headline: template.headline,
      type: 'scheduled',
    }
    return { ...this.#pendingPreview }
  }

  /** 週末ニュースを生成する。 */
  generateWeekendNews(): WeekendNews[] {
    const count = 1 + Math.floor(Math.random() * 3) // 1〜3件
    const news: WeekendNews[] = []
    const usedIndices = new Set<number>()

    for (let i = 0; i < count; i++) {
      let idx: number
      do {
        idx = Math.floor(Math.random() * WEEKEND_TEMPLATES.length)
      } while (usedIndices.has(idx) && usedIndices.size < WEEKEND_TEMPLATES.length)
      usedIndices.add(idx)

      const template = WEEKEND_TEMPLATES[idx]
      const [min, max] = template.impactRange
      const impact = min + Math.random() * (max - min)

      news.push({
        id: this.#generateId(),
        headline: template.headline,
        impact: Math.round(impact * 100) / 100,
      })
    }

    return news
  }

  /**
   * ニュースイベントの外部イベント力を返す（比率）。
   * MarketEngine.injectExternalForce() に渡す値を算出する。
   * MarketEngine側で currentPrice を乗じて適用される。
   */
  getExternalForce(event: NewsEvent): number {
    // impact（-1.0〜1.0）を価格変動のスケール（PRICE_MOVE.sdPct基準）に変換
    // impact=1.0 で約5σ相当のショック
    return event.impact * PRICE_MOVE.sdPct * 5
  }

  /** 週末ニュースの内部影響を返す（翌週の地合い・発生確率補正用）。 */
  getWeekendImpact(news: WeekendNews[]): WeekendModifier {
    if (!news || news.length === 0) {
      return { driftBias: 0, volBias: 1.0, triggerProbBias: 0 }
    }

    // 全ニュースのimpactを集約
    const totalImpact = news.reduce((sum, n) => sum + n.impact, 0)
    const avgImpact = totalImpact / news.length

    const modifier: WeekendModifier = {
      driftBias: avgImpact * 0.0002,
      volBias: 1.0 + Math.abs(avgImpact) * 0.3,
      triggerProbBias: Math.abs(avgImpact) * 0.1,
    }

    // 内部に保持して翌週のscheduleSessionEventsで参照
    this.#weekendModifier = modifier

    return { ...modifier }
  }

  /** スケジュール済みイベント一覧を取得する。 */
  getScheduledEvents(): NewsEvent[] {
    return [...this.#scheduledEvents]
  }

  /** テンプレートからランダムに1件選択する。 */
  #pickTemplate(templates: readonly NewsTemplate[]): NewsTemplate {
    return templates[Math.floor(Math.random() * templates.length)]
  }

  /** イベントを生成する。 */
  #createEvent(
    type: 'immediate' | 'scheduled',
    headline: string,
    triggerTime: number,
    impactRange: readonly [number, number],
    isFollowUp: boolean,
  ): NewsEvent {
    const [min, max] = impactRange
    const impact = min + Math.random() * (max - min)

    return {
      id: this.#generateId(),
      type,
      headline,
      triggerTime,
      impact: Math.round(impact * 100) / 100,
      isFollowUp,
    }
  }

  /** ランダムなセッション内発動時刻を生成する。 */
  #randomTriggerTime(): number {
    return SESSION_START + Math.floor(Math.random() * (SESSION_END - SESSION_START))
  }

  /**
   * 続報用の発動時刻を計算する。
   * 既存イベントの最後の時刻から一定間隔を空ける。
   */
  #calcFollowUpTime(isFollowUp: boolean): number {
    if (!isFollowUp || this.#scheduledEvents.length === 0) {
      return this.#randomTriggerTime()
    }

    const lastTime = this.#scheduledEvents[this.#scheduledEvents.length - 1].triggerTime
    const minTime = lastTime + FOLLOW_UP_MIN_GAP
    const maxTime = SESSION_END - 10

    if (minTime >= maxTime) {
      return maxTime
    }

    return minTime + Math.floor(Math.random() * (maxTime - minTime))
  }

  /** ユニークなイベントIDを生成する。 */
  #generateId(): string {
    eventIdCounter++
    return `news_${Date.now()}_${eventIdCounter}`
  }
}
