export interface LevelUpEntry {
  level: number
  features: string[]
  leverage: number | null
  label: string
}

export interface LevelUpResult {
  newLevel: number
  unlocks: LevelUpEntry[]
}
