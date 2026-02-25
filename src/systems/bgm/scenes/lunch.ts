import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeGain, makeLPF } from '../audioUtils'

/**
 * lunch — 穏やかな昼休みのひととき
 * 音楽的特徴: ゆったりしたペンタトニックアルペジオ + 温かいパッドコード
 * トレーディングの緊張感から解放される安らぎの雰囲気
 */
export const buildLunch: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []
  const reverb = makeReverb(ctx, 3.0, 1.5)
  const lpf = makeLPF(ctx, 2800)
  reverb.connect(lpf)
  lpf.connect(masterGain)

  // 温かいパッドコード（F - Dm - Bb - C）
  const chords = [
    [174.61, 220.00, 261.63],  // F
    [146.83, 174.61, 220.00],  // Dm
    [116.54, 146.83, 174.61],  // Bb
    [130.81, 164.81, 196.00],  // C
  ]
  const chordDur = 4.0
  let chordIdx = 0

  function playChord(): void {
    const now = ctx.currentTime
    const chord = chords[chordIdx % chords.length]
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.07 - i * 0.015, now + 0.6)
      gain.gain.linearRampToValueAtTime(0.04 - i * 0.01, now + chordDur - 0.8)
      gain.gain.linearRampToValueAtTime(0, now + chordDur)
      osc.start(now)
      osc.stop(now + chordDur + 0.1)
      nodes.push(osc, gain)
    })
    chordIdx++
  }

  // ペンタトニックアルペジオ（F major pentatonic: F G A C D）
  const arpNotes = [349.23, 392.00, 440.00, 523.25, 587.33, 523.25, 440.00, 392.00]
  let arpStep = 0

  function playArp(): void {
    const now = ctx.currentTime
    const freq = arpNotes[arpStep % arpNotes.length]
    const osc = ctx.createOscillator()
    const gain = makeGain(ctx, 0)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now)
    osc.connect(gain)
    gain.connect(reverb)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.045, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
    osc.start(now)
    osc.stop(now + 0.85)
    nodes.push(osc, gain)
    arpStep++
  }

  playChord()
  timers.push(setInterval(playChord, chordDur * 1000))
  timers.push(setInterval(playArp, 750))
  return { nodes, timers }
}
