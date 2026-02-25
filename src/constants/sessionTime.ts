/** セッション時間（ゲーム内分）— engine/utilsの双方から参照する単一情報源 */
export const SESSION_START_MINUTES = 540   // 09:00
export const SESSION_END_MINUTES = 930     // 15:30
export const LUNCH_START_MINUTES = 690     // 11:30
export const LUNCH_END_MINUTES = 750       // 12:30

/** 昼休み帯の判定（分単位）。11:30超〜12:30未満が昼休み内部。11:30ちょうど=前場最終、12:30ちょうど=後場開始。 */
export function isDuringLunch(minutes: number): boolean {
  return minutes > LUNCH_START_MINUTES && minutes < LUNCH_END_MINUTES
}

/** 昼休み帯の判定（秒単位）。 */
export function isDuringLunchSeconds(seconds: number): boolean {
  return seconds > LUNCH_START_MINUTES * 60 && seconds < LUNCH_END_MINUTES * 60
}
