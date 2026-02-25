import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeGain } from '../audioUtils'

// G minor 音名→周波数
const N: Record<string, number> = {
  // Bass
  G2: 98.00, A2: 110.00, Bb2: 116.54, C3: 130.81, D3: 146.83, Eb3: 155.56,
  // Chord range
  Fs3: 185.00, G3: 196.00, A3: 220.00, Bb3: 233.08,
  C4: 261.63, D4: 293.66, Eb4: 311.13, F4: 349.23, Fs4: 369.99, G4: 392.00,
  // Melody range
  A4: 440.00, Bb4: 466.16, C5: 523.25, D5: 587.33, Eb5: 622.25, F5: 698.46, G5: 783.99,
}

/**
 * gameoverRetire — パワプロ・サクセス引退風
 * BPM 80、G minor。感傷的で穏やかなメロディ + 柔らかいパッドコード
 */
export const buildGameoverRetire: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []

  const bpm = 80
  const eighthMs = (60 / bpm / 2) * 1000
  const halfNoteMs = (60 / bpm) * 2 * 1000

  const reverb = makeReverb(ctx, 1.5, 2.0)
  reverb.connect(masterGain)

  // --- メロディ (triangle, 8分音符, 64 steps = 8 bars) ---
  const melody = [
    N.D5, 0, N.C5, N.Bb4, N.D5, 0, 0, N.G4,
    N.Bb4, 0, N.G4, N.Bb4, N.Eb5, 0, N.D5, 0,
    N.C5, 0, N.Bb4, N.C5, N.Eb5, 0, N.D5, N.C5,
    N.A4, 0, 0, 0, N.G4, 0, 0, 0,
    N.Bb4, 0, N.C5, N.D5, N.Bb4, 0, N.A4, 0,
    N.D5, 0, N.C5, N.Bb4, N.A4, 0, N.G4, N.Bb4,
    N.G4, 0, N.Bb4, N.C5, N.Eb5, 0, N.D5, 0,
    N.D5, 0, N.C5, 0, N.G4, 0, 0, 0,
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
      // ゆったり立ち上がり → 柔らかく減衰
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.07, now + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
      osc.start(now)
      osc.stop(now + 0.65)
      nodes.push(osc, gain)
    }
    melStep++
  }

  // --- コード進行 (sine, half notes, 16 entries = 8 bars) ---
  const chords = [
    [N.G3, N.Bb3, N.D4], [N.G3, N.Bb3, N.D4],
    [N.Eb3, N.G3, N.Bb3], [N.Eb3, N.G3, N.Bb3],
    [N.C4, N.Eb4, N.G4], [N.C4, N.Eb4, N.G4],
    [N.D3, N.Fs3, N.A3], [N.D3, N.Fs3, N.A3],
    [N.G3, N.Bb3, N.D4], [N.G3, N.Bb3, N.D4],
    [N.Bb3, N.D4, N.F4], [N.Bb3, N.D4, N.F4],
    [N.Eb3, N.G3, N.Bb3], [N.Eb3, N.G3, N.Bb3],
    [N.D3, N.Fs3, N.A3], [N.D3, N.Fs3, N.A3],
  ]
  let chordIdx = 0

  function playChord(): void {
    const now = ctx.currentTime
    const chord = chords[chordIdx % chords.length]
    for (const freq of chord) {
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.035, now + 0.15)
      gain.gain.linearRampToValueAtTime(0.02, now + halfNoteMs / 1000 - 0.2)
      gain.gain.linearRampToValueAtTime(0, now + halfNoteMs / 1000)
      osc.start(now)
      osc.stop(now + halfNoteMs / 1000 + 0.1)
      nodes.push(osc, gain)
    }
    chordIdx++
  }

  // --- ベース (triangle, half notes) ---
  const bassNotes = [
    N.G2, N.G2, N.Eb3, N.Eb3, N.C3, N.C3, N.D3, N.D3,
    N.G2, N.G2, N.Bb2, N.Bb2, N.Eb3, N.Eb3, N.D3, N.D3,
  ]
  let bassIdx = 0

  function playBass(): void {
    const now = ctx.currentTime
    const freq = bassNotes[bassIdx % bassNotes.length]
    const osc = ctx.createOscillator()
    const gain = makeGain(ctx, 0)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now)
    osc.connect(gain)
    gain.connect(reverb)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.05, now + 0.03)
    gain.gain.linearRampToValueAtTime(0.035, now + halfNoteMs / 1000 - 0.15)
    gain.gain.linearRampToValueAtTime(0, now + halfNoteMs / 1000)
    osc.start(now)
    osc.stop(now + halfNoteMs / 1000 + 0.05)
    nodes.push(osc, gain)
    bassIdx++
  }

  timers.push(setInterval(playMelody, eighthMs))
  timers.push(setInterval(playChord, halfNoteMs))
  timers.push(setInterval(playBass, halfNoteMs))
  return { nodes, timers }
}
