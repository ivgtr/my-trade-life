import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeGain, makeLPF } from '../audioUtils'

/**
 * lunch — ほのぼの神社リスペクトな昼休みBGM
 * 音楽的特徴: G majorの軽快で跳ねるメロディ + 温かい循環コード
 * 明るく楽しい雰囲気でトレーディングの合間にほっと一息
 */
export const buildLunch: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []
  const reverb = makeReverb(ctx, 2.5, 1.5)
  const lpf = makeLPF(ctx, 4000)
  reverb.connect(lpf)
  lpf.connect(masterGain)

  // ほのぼのメロディ（G major, ~150 BPM の8分音符）
  const melody = [
    392.00, 493.88, 587.33, 493.88,  // G4 B4 D5 B4
    440.00, 493.88, 587.33, 659.26,  // A4 B4 D5 E5
    587.33, 493.88, 440.00, 392.00,  // D5 B4 A4 G4
    440.00, 493.88, 440.00, 392.00,  // A4 B4 A4 G4
  ]
  const EIGHTH = 200
  let mStep = 0

  function playNote(): void {
    const now = ctx.currentTime
    const freq = melody[mStep % melody.length]
    const osc = ctx.createOscillator()
    const gain = makeGain(ctx, 0)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now)
    osc.connect(gain)
    gain.connect(reverb)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.07, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.02, now + 0.12)
    gain.gain.linearRampToValueAtTime(0, now + 0.18)
    osc.start(now)
    osc.stop(now + 0.2)
    nodes.push(osc, gain)
    mStep++
  }

  // 温かいパッドコード（G - C - Em - D 循環）
  const chords = [
    [196.00, 246.94, 293.66],  // G  (G3 B3 D4)
    [261.63, 329.63, 392.00],  // C  (C4 E4 G4)
    [329.63, 392.00, 493.88],  // Em (E4 G4 B4)
    [293.66, 369.99, 440.00],  // D  (D4 F#4 A4)
  ]
  const CHORD_DUR = 1.6
  let cStep = 0

  function playChord(): void {
    const now = ctx.currentTime
    const chord = chords[cStep % chords.length]
    chord.forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.04, now + 0.3)
      gain.gain.linearRampToValueAtTime(0.025, now + CHORD_DUR - 0.3)
      gain.gain.linearRampToValueAtTime(0, now + CHORD_DUR)
      osc.start(now)
      osc.stop(now + CHORD_DUR + 0.1)
      nodes.push(osc, gain)
    })
    cStep++
  }

  playNote()
  playChord()
  timers.push(setInterval(playNote, EIGHTH))
  timers.push(setInterval(playChord, CHORD_DUR * 1000))
  return { nodes, timers }
}
