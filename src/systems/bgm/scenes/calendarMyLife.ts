import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeGain } from '../audioUtils'

// 音名→周波数
const N: Record<string, number> = {
  Eb2: 77.78, Ab2: 103.83, Bb2: 116.54,
  C3: 130.81, Eb3: 155.56, G3: 196.00, Ab3: 207.65, Bb3: 233.08, D4: 293.66,
  C4: 261.63, Eb4: 311.13, F4: 349.23,
  Eb4h: 311.13, G4: 392.00, Ab4: 415.30, Bb4: 466.16,
  Eb5: 622.25, F5: 698.46, G5: 783.99, Ab5: 830.61, Bb5: 932.33,
}

/**
 * calendarMyLife — パワプロ・マイライフ風
 * BPM 115、Eb major。明るく軽快なメロディ + コード伴奏 + ドラム
 */
export const buildCalendarMyLife: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []

  const bpm = 115
  const eighthMs = (60 / bpm / 2) * 1000 // ≈261ms

  const reverb = makeReverb(ctx, 0.8, 3.0)
  reverb.connect(masterGain)

  // メロディ（8分音符、0=休符）
  const melody = [
    N.Eb5, 0, N.G5, N.F5, N.Eb5, 0, N.Bb4, 0, N.G4, 0, N.Ab4, N.Bb4, N.Eb5, 0, 0, 0,
    N.Eb5, 0, N.G5, N.Ab5, N.G5, 0, N.F5, 0, N.Eb5, 0, N.Bb4, N.G4, N.Eb4h, 0, 0, 0,
    N.Ab5, 0, N.G5, N.F5, N.Eb5, 0, N.F5, 0, N.G5, 0, N.Ab5, N.Bb5, N.Ab5, 0, N.G5, 0,
    N.F5, 0, N.G5, N.Ab5, N.G5, 0, N.F5, 0, N.Eb5, 0, N.F5, N.Eb5, N.Bb4, 0, 0, 0,
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
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
      osc.start(now)
      osc.stop(now + 0.45)
      nodes.push(osc, gain)
    }
    melStep++
  }

  // コード進行（各4拍=8ステップ分のタイミングで切替）
  const chords = [
    [N.Eb3, N.G3, N.Bb3], [N.Eb3, N.G3, N.Bb3], [N.Eb3, N.G3, N.Bb3], [N.Eb3, N.G3, N.Bb3],
    [N.Ab3, N.C4, N.Eb4], [N.Ab3, N.C4, N.Eb4],
    [N.Bb3, N.D4, N.F4], [N.Bb3, N.D4, N.F4],
    [N.Eb3, N.G3, N.Bb3], [N.Eb3, N.G3, N.Bb3],
    [N.C3, N.Eb3, N.G3], [N.C3, N.Eb3, N.G3],
    [N.Ab3, N.C4, N.Eb4], [N.Ab3, N.C4, N.Eb4],
    [N.Bb3, N.D4, N.F4], [N.Bb3, N.D4, N.F4],
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
      gain.gain.linearRampToValueAtTime(0.04, now + 0.05)
      gain.gain.linearRampToValueAtTime(0.03, now + halfNoteMs / 1000 - 0.1)
      gain.gain.linearRampToValueAtTime(0, now + halfNoteMs / 1000)
      osc.start(now)
      osc.stop(now + halfNoteMs / 1000 + 0.05)
      nodes.push(osc, gain)
    })
    chordIdx++
  }

  // ベース
  const bassNotes = [
    N.Eb2, N.Eb2, N.Eb2, N.Eb2, N.Ab2, N.Ab2, N.Bb2, N.Bb2,
    N.Eb2, N.Eb2, N.C3 / 2, N.C3 / 2, N.Ab2, N.Ab2, N.Bb2, N.Bb2,
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
    gain.gain.linearRampToValueAtTime(0.06, now + 0.02)
    gain.gain.linearRampToValueAtTime(0.04, now + halfNoteMs / 1000 - 0.1)
    gain.gain.linearRampToValueAtTime(0, now + halfNoteMs / 1000)
    osc.start(now)
    osc.stop(now + halfNoteMs / 1000 + 0.05)
    nodes.push(osc, gain)
    bassIdx++
  }

  // ドラム（キック拍1,3 + スネア拍2,4 + ハイハット8分）
  const beatMs = (60 / bpm) * 1000
  let drumStep = 0

  function playDrum(): void {
    const t = ctx.currentTime
    const beat = drumStep % 4

    // キック（拍1, 3）
    if (beat === 0 || beat === 2) {
      const o = ctx.createOscillator()
      const g = makeGain(ctx, 0)
      o.type = 'sine'
      o.frequency.setValueAtTime(140, t)
      o.frequency.exponentialRampToValueAtTime(40, t + 0.1)
      o.connect(g)
      g.connect(masterGain)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.15, t + 0.005)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
      o.start(t)
      o.stop(t + 0.18)
      nodes.push(o, g)
    }

    // スネア（拍2, 4）
    if (beat === 1 || beat === 3) {
      const bufLen = ctx.sampleRate * 0.1
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.5)
      const src = ctx.createBufferSource()
      const g = makeGain(ctx, 0)
      const bpf = ctx.createBiquadFilter()
      bpf.type = 'bandpass'
      bpf.frequency.value = 1800
      bpf.Q.value = 1
      src.buffer = buf
      src.connect(bpf)
      bpf.connect(g)
      g.connect(masterGain)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.04, t + 0.002)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
      src.start(t)
      nodes.push(src, g, bpf)
    }

    drumStep++
  }

  // ハイハット（8分音符間隔）
  function playHihat(): void {
    const t = ctx.currentTime
    const bufLen = ctx.sampleRate * 0.04
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 3)
    const src = ctx.createBufferSource()
    const g = makeGain(ctx, 0)
    const hpf = ctx.createBiquadFilter()
    hpf.type = 'highpass'
    hpf.frequency.value = 9000
    src.buffer = buf
    src.connect(hpf)
    hpf.connect(g)
    g.connect(masterGain)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.03, t + 0.001)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04)
    src.start(t)
    nodes.push(src, g, hpf)
  }

  timers.push(setInterval(playMelody, eighthMs))
  timers.push(setInterval(playChord, halfNoteMs))
  timers.push(setInterval(playBass, halfNoteMs))
  timers.push(setInterval(playDrum, beatMs))
  timers.push(setInterval(playHihat, eighthMs))
  return { nodes, timers }
}
