import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeGain } from '../audioUtils'

/**
 * calendar — 軽めの中立ループ
 * 音楽的特徴: シンプルなマリンバ風ループ
 */
export const buildCalendar: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []
  const reverb = makeReverb(ctx, 1.0, 3.0)
  reverb.connect(masterGain)

  // マリンバ風ノート
  const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 440.00, 523.25]
  let   step   = 0

  function playNote(): void {
    const now  = ctx.currentTime
    const freq = melody[step % melody.length]
    const osc  = ctx.createOscillator()
    const gain = makeGain(ctx, 0)
    osc.type      = 'sine'
    osc.frequency.setValueAtTime(freq, now)

    // ハーモニクス（倍音を少し加えてマリンバらしく）
    const osc2  = ctx.createOscillator()
    const gain2 = makeGain(ctx, 0)
    osc2.type      = 'sine'
    osc2.frequency.setValueAtTime(freq * 2, now)

    osc.connect(gain)
    osc2.connect(gain2)
    gain.connect(reverb)
    gain2.connect(reverb)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.10, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

    gain2.gain.setValueAtTime(0, now)
    gain2.gain.linearRampToValueAtTime(0.03, now + 0.01)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

    osc.start(now); osc.stop(now + 0.55)
    osc2.start(now); osc2.stop(now + 0.35)
    nodes.push(osc, gain, osc2, gain2)
    step++
  }

  timers.push(setInterval(playNote, 480))
  return { nodes, timers }
}
