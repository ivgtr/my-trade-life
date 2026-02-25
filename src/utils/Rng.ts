import { normSInv } from './mathUtils'

/**
 * サブシステム分離用の決定的PRNG。
 * LCG (Linear Congruential Generator) ベース。
 * 同一seedで同一系列を再現できる。
 */
export class Rng {
  #state: number

  constructor(seed: number) {
    this.#state = seed >>> 0
  }

  /** [0, 1) 一様分布 */
  next(): number {
    this.#state = (this.#state * 1664525 + 1013904223) >>> 0
    return this.#state / 0x100000000
  }

  /** 標準正規分布 (normSInvベース) */
  gaussian(): number {
    const u = Math.max(1e-12, Math.min(1 - 1e-12, this.next()))
    return normSInv(u)
  }

  /** [min, max) 連続一様分布 */
  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  /** [min, max] 整数一様分布 */
  intInclusive(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1))
  }

  /** center ± spread/2 の一様分布 */
  jitter(center: number, spread: number): number {
    return center - spread / 2 + this.next() * spread
  }

  /** 確率 prob で true を返す */
  chance(prob: number): boolean {
    return this.next() < prob
  }
}
