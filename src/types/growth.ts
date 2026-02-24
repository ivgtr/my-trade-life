export interface LevelUpResult {
  newLevel: number
  newFeatures: string[]
  newLeverage: number | null
  label: string
}

export interface ExpBonus {
  baseExp: number
  bonusExp: number
  totalExp: number
  winRate: number
  trades: number
  wins: number
}
