import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeGain } from '../audioUtils'

// 音名→周波数
const N: Record<string, number> = {
  F3: 174.61, G3: 196.00, A3: 220.00, Bb3: 233.08, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  A4: 440.00, Bb4: 466.16, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
}

/**
 * calendarVillage — どうぶつの森風
 * BPM 110、F major。Maj7thコードの柔らかい雰囲気 + スウィングメロディ
 */
export const buildCalendarVillage: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []

  const bpm = 110
  const reverb = makeReverb(ctx, 1.5, 2.5)
  reverb.connect(masterGain)

  // メロディ（スウィング: 長短交互 364ms/182ms → 平均273ms）
  const melody = [
    N.F5, N.A5, N.G5, N.F5, N.D5, N.C5, N.D5, N.F5, N.E5, N.F5, N.A5, N.G5, N.F5, N.D5, N.C5, 0,
    N.Bb4, N.C5, N.D5, N.F5, N.E5, N.D5, N.C5, N.A4, N.Bb4, N.C5, N.D5, N.C5, N.A4, N.F4, 0, 0,
  ]
  let melStep = 0
  const swingLong = (60 / bpm) * (2 / 3) * 2 * 1000  // ≈364ms
  const swingShort = (60 / bpm) * (1 / 3) * 2 * 1000 // ≈182ms

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
      gain.gain.linearRampToValueAtTime(0.08, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc.start(now)
      osc.stop(now + 0.4)
      nodes.push(osc, gain)
    }
    melStep++
    // 次のステップのタイミングをスウィングで調整
    const nextIsLong = melStep % 2 === 0
    clearInterval(melTimer)
    melTimer = setTimeout(function swing() {
      playMelody()
      const dur = melStep % 2 === 0 ? swingLong : swingShort
      melTimer = setTimeout(swing, dur)
      timers.push(melTimer)
    }, nextIsLong ? swingLong : swingShort)
    timers.push(melTimer)
  }

  let melTimer: ReturnType<typeof setTimeout> = setTimeout(playMelody, 0)
  timers.push(melTimer)

  // コード進行（各2拍=1091ms）
  // FMaj7 → FMaj7 → BbMaj7 → BbMaj7 → Gm7 → Am7 → C7 → C7
  const chords = [
    [N.F3, N.A3, N.C4, N.E4],     // FMaj7
    [N.F3, N.A3, N.C4, N.E4],
    [N.Bb3, N.D4, N.F4, N.A4],    // BbMaj7
    [N.Bb3, N.D4, N.F4, N.A4],
    [N.G3, N.Bb3, N.D4, N.F4],    // Gm7
    [N.A3, N.C4, N.E4, N.G3 * 2], // Am7 (G4)
    [N.C4, N.E4, N.G3 * 2, N.Bb3 * 2], // C7 (G4, Bb4)
    [N.C4, N.E4, N.G3 * 2, N.Bb3 * 2],
  ]
  const halfNoteMs = (60 / bpm) * 2 * 1000
  let chordIdx = 0

  function playChord(): void {
    const now = ctx.currentTime
    const chord = chords[chordIdx % chords.length]
    chord.forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.035, now + 0.05)
      gain.gain.linearRampToValueAtTime(0.02, now + halfNoteMs / 1000 - 0.15)
      gain.gain.linearRampToValueAtTime(0, now + halfNoteMs / 1000)
      osc.start(now)
      osc.stop(now + halfNoteMs / 1000 + 0.05)
      nodes.push(osc, gain)
    })
    chordIdx++
  }

  // ベース（各コードのルート音のオクターブ下）
  const bassNotes = [
    N.F3 / 2, N.F3 / 2, N.Bb3 / 2, N.Bb3 / 2,
    N.G3 / 2, N.A3 / 2, N.C4 / 2, N.C4 / 2,
  ]
  let bassIdx = 0

  function playBass(): void {
    const now = ctx.currentTime
    const freq = bassNotes[bassIdx % bassNotes.length]
    const osc = ctx.createOscillator()
    const gain = makeGain(ctx, 0)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, now)
    osc.connect(gain)
    gain.connect(reverb)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.05, now + 0.02)
    gain.gain.linearRampToValueAtTime(0.03, now + halfNoteMs / 1000 - 0.1)
    gain.gain.linearRampToValueAtTime(0, now + halfNoteMs / 1000)
    osc.start(now)
    osc.stop(now + halfNoteMs / 1000 + 0.05)
    nodes.push(osc, gain)
    bassIdx++
  }

  playChord()
  playBass()
  timers.push(setInterval(playChord, halfNoteMs))
  timers.push(setInterval(playBass, halfNoteMs))
  return { nodes, timers }
}
