import { describe, it, expect } from 'vitest'
import {
  calculateDailyBonus,
  checkLevelUp,
  getMaxLeverage,
  getExpToNextLevel,
  EXP_TABLE,
  MAX_LEVEL,
} from '../GrowthSystem'

describe('calculateDailyBonus', () => {
  it('基本計算: 勝率 × 取引回数 × BONUS_EXP_PER_TRADE', () => {
    // 10取引, 5勝 → winRate=0.5, effectiveTrades=10, bonus=floor(0.5*10*5)=25
    expect(calculateDailyBonus(10, 5)).toBe(25)
  })

  it('逓減閾値超えで経験値が減少する', () => {
    // 14取引, 14勝 → winRate=1.0, effectiveTrades=10+sqrt(4)=12, bonus=floor(1.0*12*5)=60
    expect(calculateDailyBonus(14, 14)).toBe(60)
  })

  it('取引0回では0を返す', () => {
    expect(calculateDailyBonus(0, 0)).toBe(0)
  })

  it('全敗では0を返す', () => {
    expect(calculateDailyBonus(5, 0)).toBe(0)
  })
})

describe('checkLevelUp', () => {
  it('経験値不足ではnullを返す', () => {
    expect(checkLevelUp(1, 50)).toBeNull()
  })

  it('単一レベルアップ', () => {
    const result = checkLevelUp(1, 100)
    expect(result).not.toBeNull()
    expect(result!.newLevel).toBe(2)
    expect(result!.unlocks).toHaveLength(1)
    expect(result!.unlocks[0].level).toBe(2)
    expect(result!.unlocks[0].features).toEqual(['dailySentimentIcon'])
    expect(result!.unlocks[0].label).toBe('地合いアイコン表示')
  })

  it('複数レベル同時アップで全てのレベルの解放情報を返す', () => {
    // Lv1 → Lv4 (exp=600 で Lv2,3,4 全て通過)
    const result = checkLevelUp(1, 600)
    expect(result).not.toBeNull()
    expect(result!.newLevel).toBe(4)
    expect(result!.unlocks).toHaveLength(3)
    expect(result!.unlocks[0].level).toBe(2)
    expect(result!.unlocks[1].level).toBe(3)
    expect(result!.unlocks[2].level).toBe(4)
  })

  it('最大レベルではnullを返す', () => {
    expect(checkLevelUp(MAX_LEVEL, 99999)).toBeNull()
  })

  it('次のレベルの閾値ちょうどでレベルアップする', () => {
    const result = checkLevelUp(1, EXP_TABLE[2])
    expect(result).not.toBeNull()
    expect(result!.newLevel).toBe(2)
  })

  it('次のレベルの閾値マイナス1ではレベルアップしない', () => {
    expect(checkLevelUp(1, EXP_TABLE[2] - 1)).toBeNull()
  })
})

describe('getMaxLeverage', () => {
  it('Lv1は1倍', () => {
    expect(getMaxLeverage(1)).toBe(1)
  })

  it('Lv2はレバレッジ変更なしで1倍のまま', () => {
    expect(getMaxLeverage(2)).toBe(1)
  })

  it('Lv3で2倍に解放', () => {
    expect(getMaxLeverage(3)).toBe(2)
  })

  it('Lv4で3倍に解放', () => {
    expect(getMaxLeverage(4)).toBe(3)
  })

  it('Lv5で3.3倍に解放', () => {
    expect(getMaxLeverage(5)).toBe(3.3)
  })

  it('Lv6以降はレバレッジ変更なしで3.3倍のまま', () => {
    expect(getMaxLeverage(6)).toBe(3.3)
    expect(getMaxLeverage(7)).toBe(3.3)
    expect(getMaxLeverage(8)).toBe(3.3)
  })
})

describe('getExpToNextLevel', () => {
  it('Lv1の次のレベル必要経験値', () => {
    expect(getExpToNextLevel(1)).toBe(EXP_TABLE[2])
  })

  it('最大レベルではnullを返す', () => {
    expect(getExpToNextLevel(MAX_LEVEL)).toBeNull()
  })
})
