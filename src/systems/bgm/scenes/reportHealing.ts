import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeGain } from '../audioUtils'

// 音名→周波数
const N: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
}

/**
 * reportHealing — ポケモンセンター風
 * C major、BPM 132、3/4拍子。ンパパ伴奏 + 明るいメロディ
 */
export const buildReportHealing: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []

  const bpm = 132
  const beatMs = (60 / bpm) * 1000 // ≈454ms

  const reverb = makeReverb(ctx, 1.2, 2.5)
  reverb.connect(masterGain)

  // メロディ（1拍=454ms、0=休符）
  const melody = [
    // A (4小節 x 3拍 = 12拍)
    N.E5, N.D5, N.C5, N.D5, N.E5, N.E5, N.E5, 0, N.D5, N.D5, N.D5, 0,
    // A' (12拍)
    N.E5, N.D5, N.C5, N.D5, N.E5, N.E5, N.E5, 0, N.E5, N.D5, N.C5, 0,
    // B (12拍)
    N.F5, N.E5, N.D5, N.E5, N.F5, N.F5, N.F5, 0, N.E5, N.E5, N.E5, 0,
    // B' (12拍)
    N.F5, N.E5, N.D5, N.C5, N.D5, N.E5, N.C5, 0, 0, 0, 0, 0,
  ]
  let melStep = 0

  function playMelody(): void {
    const freq = melody[melStep % melody.length]
    if (freq > 0) {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.09, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42)
      osc.start(now)
      osc.stop(now + 0.45)
      nodes.push(osc, gain)
    }
    melStep++
  }

  // コード進行（各1小節=3拍、16小節）
  // C→G→Am→Em→F→C→Dm→G → C→G→Am→Em→F→G→C→C
  const chordProg = [
    [N.C3, N.E3, N.G3],     // C
    [N.G3, N.B3, N.D4],     // G
    [N.A3, N.C4, N.E4],     // Am
    [N.E3, N.G3, N.B3],     // Em
    [N.F3, N.A3, N.C4],     // F
    [N.C3, N.E3, N.G3],     // C
    [N.D3, N.F3, N.A3],     // Dm
    [N.G3, N.B3, N.D4],     // G
    [N.C3, N.E3, N.G3],     // C
    [N.G3, N.B3, N.D4],     // G
    [N.A3, N.C4, N.E4],     // Am
    [N.E3, N.G3, N.B3],     // Em
    [N.F3, N.A3, N.C4],     // F
    [N.G3, N.B3, N.D4],     // G
    [N.C3, N.E3, N.G3],     // C
    [N.C3, N.E3, N.G3],     // C
  ]
  let chordBeat = 0

  // ンパパ伴奏（3/4拍子: 拍1=ベース、拍2,3=和音）
  function playAccomp(): void {
    const now = ctx.currentTime
    const measureIdx = Math.floor(chordBeat / 3) % chordProg.length
    const chord = chordProg[measureIdx]
    const beatInMeasure = chordBeat % 3

    if (beatInMeasure === 0) {
      // 拍1: ベース（ルート音のオクターブ下）
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(chord[0] / 2, now)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.06, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
      osc.start(now)
      osc.stop(now + 0.45)
      nodes.push(osc, gain)
    } else {
      // 拍2,3: 和音
      chord.forEach((freq) => {
        const osc = ctx.createOscillator()
        const gain = makeGain(ctx, 0)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)
        osc.connect(gain)
        gain.connect(reverb)
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.025, now + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
        osc.start(now)
        osc.stop(now + 0.35)
        nodes.push(osc, gain)
      })
    }
    chordBeat++
  }

  timers.push(setInterval(playMelody, beatMs))
  timers.push(setInterval(playAccomp, beatMs))
  return { nodes, timers }
}
