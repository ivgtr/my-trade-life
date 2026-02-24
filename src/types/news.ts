export interface NewsEvent {
  id: string
  type: 'immediate' | 'scheduled'
  headline: string
  triggerTime: number
  impact: number
  isFollowUp: boolean
}

export interface PreviewEvent {
  headline: string
  type: 'scheduled'
}

export interface WeekendNews {
  id: string
  headline: string
  impact: number
}
