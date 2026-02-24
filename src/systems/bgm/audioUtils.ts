/** リバーブ用のImpulse Responseをノイズで生成 */
export function makeReverb(ctx: AudioContext, duration: number = 1.8, decay: number = 2.0): ConvolverNode {
  const len    = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
    }
  }
  const conv = ctx.createConvolver()
  conv.buffer = buffer
  return conv
}

/** ローパスフィルターを生成 */
export function makeLPF(ctx: AudioContext, freq: number, q: number = 1): BiquadFilterNode {
  const f = ctx.createBiquadFilter()
  f.type            = 'lowpass'
  f.frequency.value = freq
  f.Q.value         = q
  return f
}

/** ゲインノードを生成 */
export function makeGain(ctx: AudioContext, value: number = 1): GainNode {
  const g    = ctx.createGain()
  g.gain.value = value
  return g
}

/** フェードイン用のスケジュール */
export function fadeIn(gainNode: GainNode, ctx: AudioContext, duration: number = 1.2): void {
  const g = gainNode.gain
  g.cancelScheduledValues(ctx.currentTime)
  g.setValueAtTime(0, ctx.currentTime)
  g.linearRampToValueAtTime(1, ctx.currentTime + duration)
}

export function fadeOut(gainNode: GainNode, ctx: AudioContext, duration: number = 1.0, then?: () => void): void {
  const g = gainNode.gain
  g.cancelScheduledValues(ctx.currentTime)
  g.setValueAtTime(g.value, ctx.currentTime)
  g.linearRampToValueAtTime(0, ctx.currentTime + duration)
  if (then) setTimeout(then, duration * 1000 + 50)
}
