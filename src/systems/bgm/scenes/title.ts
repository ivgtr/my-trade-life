import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeLPF, makeGain } from '../audioUtils'

/**
 * title — 静かなアンビエント・スローアルペジオ
 * 音楽的特徴: Cmajスケールのゆったりしたアルペジオ + パッドコード
 */
export const buildTitle: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []
  const reverb = makeReverb(ctx, 2.5, 1.8)
  const lpf    = makeLPF(ctx, 3200)
  reverb.connect(lpf)
  lpf.connect(masterGain)

  // コードパッド（C - Am - F - G）
  const chords = [
    [261.63, 329.63, 392.00],  // C
    [220.00, 261.63, 329.63],  // Am
    [174.61, 220.00, 261.63],  // F
    [196.00, 246.94, 293.66],  // G
  ]
  const chordDur = 3.2
  let   chordIdx = 0

  function playChord(): void {
    const now   = ctx.currentTime
    const chord = chords[chordIdx % chords.length]
    chord.forEach((freq, i) => {
      const osc  = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type      = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.10 - i * 0.02, now + 0.4)
      gain.gain.linearRampToValueAtTime(0.06 - i * 0.01, now + chordDur - 0.5)
      gain.gain.linearRampToValueAtTime(0, now + chordDur)
      osc.start(now)
      osc.stop(now + chordDur)
      nodes.push(osc, gain)
    })
    chordIdx++
  }

  // アルペジオ
  const arpNotes = [261.63, 329.63, 392.00, 329.63, 293.66, 261.63]
  let   arpStep  = 0
  function playArp(): void {
    const now  = ctx.currentTime
    const freq = arpNotes[arpStep % arpNotes.length]
    const osc  = ctx.createOscillator()
    const gain = makeGain(ctx, 0)
    osc.type      = 'triangle'
    osc.frequency.setValueAtTime(freq * 2, now)
    osc.connect(gain)
    gain.connect(reverb)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.06, now + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
    osc.start(now)
    osc.stop(now + 0.65)
    nodes.push(osc, gain)
    arpStep++
  }

  playChord()
  timers.push(setInterval(playChord, chordDur * 1000))
  timers.push(setInterval(playArp, 600))
  return { nodes, timers }
}
