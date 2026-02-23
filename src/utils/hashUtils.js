const SEED = 0x1a2b3c4d

/**
 * 残高と日数からdjb2ベースの非暗号ハッシュを生成する
 * @param {number} balance - 残高（小数点以下切り捨て）
 * @param {number} day - 経過日数
 * @returns {string} 8桁の16進数ハッシュ文字列
 */
export function generateHash(balance, day) {
  const str = `${SEED}:${Math.floor(balance)}:${day}`
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/**
 * ハッシュが残高と日数の組み合わせと一致するか検証する
 * @param {string} hash - 検証対象のハッシュ文字列
 * @param {number} balance - 残高
 * @param {number} day - 経過日数
 * @returns {boolean} ハッシュが一致すればtrue
 */
export function verifyHash(hash, balance, day) {
  return hash === generateHash(balance, day)
}
