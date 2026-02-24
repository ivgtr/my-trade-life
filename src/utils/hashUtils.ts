const SEED = 0x1a2b3c4d

/** 残高と日数からdjb2ベースの非暗号ハッシュを生成する */
export function generateHash(balance: number, day: number): string {
  const str = `${SEED}:${Math.floor(balance)}:${day}`
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/** ハッシュが残高と日数の組み合わせと一致するか検証する */
export function verifyHash(hash: string, balance: number, day: number): boolean {
  return hash === generateHash(balance, day)
}
