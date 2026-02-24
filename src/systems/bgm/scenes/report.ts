import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeGain } from '../audioUtils'

/**
 * report — 落ち着いた・やや温かみのある
 * 音楽的特徴: ゆったりしたピアノ風コード＋パッド
 */
export const buildReport: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []
  const reverb = makeReverb(ctx, 2.8, 1.5)
  reverb.connect(masterGain)

  const progression = [
    [261.63, 329.63, 392.00, 523.25],  // C
    [246.94, 311.13, 369.99, 493.88],  // B7
    [220.00, 277.18, 329.63, 440.00],  // Am
    [196.00, 261.63, 329.63, 392.00],  // G
  ]
  let cIdx = 0

  function playChord(): void {
    const now   = ctx.currentTime
    const chord = progression[cIdx % progression.length]
    chord.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type      = i === 0 ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(freq, now + i * 0.04)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now + i * 0.04)
      gain.gain.linearRampToValueAtTime(0.07 - i * 0.01, now + i * 0.04 + 0.3)
      gain.gain.linearRampToValueAtTime(0.04, now + 3.5)
      gain.gain.linearRampToValueAtTime(0, now + 4.0)
      osc.start(now + i * 0.04)
      osc.stop(now + 4.2)
      nodes.push(osc, gain)
    })
    cIdx++
  }

  playChord()
  timers.push(setInterval(playChord, 4000))
  return { nodes, timers }
}
