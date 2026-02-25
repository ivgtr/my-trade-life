import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeGain } from '../audioUtils'

// A major 音名→周波数
const N: Record<string, number> = {
  // Bass
  E2: 82.41, Fs2: 92.50, A2: 110.00, B2: 123.47, D3: 146.83, E3: 164.81,
  // Chord range
  Fs3: 185.00, Gs3: 207.65, A3: 220.00, B3: 246.94,
  Cs4: 277.18, D4: 293.66, E4: 329.63, Fs4: 369.99,
  // Melody range
  A4: 440.00, B4: 493.88, Cs5: 554.37, D5: 587.33, E5: 659.26, Fs5: 739.99,
}

/**
 * tradingMatch — パワプロ・サクセス試合風
 * BPM 140、A major。力強く駆け抜けるメロディ + フルドラム
 */
export const buildTradingMatch: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []

  const bpm = 140
  const eighthMs = (60 / bpm / 2) * 1000
  const halfNoteMs = (60 / bpm) * 2 * 1000
  const beatMs = (60 / bpm) * 1000

  const reverb = makeReverb(ctx, 0.6, 2.5)
  reverb.connect(masterGain)

  // --- メロディ (triangle, 8分音符, 64 steps = 8 bars) ---
  const melody = [
    N.A4, 0, N.Cs5, N.A4, N.E5, 0, N.D5, 0,
    N.Cs5, 0, N.B4, N.Cs5, N.A4, 0, 0, 0,
    N.D5, 0, N.E5, N.Fs5, N.E5, 0, N.D5, 0,
    N.B4, 0, N.Cs5, N.D5, N.E5, 0, 0, 0,
    N.E5, 0, N.D5, N.Cs5, N.E5, 0, N.A4, 0,
    N.Fs4, 0, N.A4, N.B4, N.Cs5, 0, N.B4, 0,
    N.D5, 0, N.Cs5, N.B4, N.A4, 0, N.B4, 0,
    N.Cs5, 0, N.D5, N.E5, N.A4, 0, 0, 0,
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
      gain.gain.linearRampToValueAtTime(0.09, now + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
      osc.start(now)
      osc.stop(now + 0.4)
      nodes.push(osc, gain)
    }
    melStep++
  }

  // --- コード進行 (sine, half notes, 16 entries = 8 bars) ---
  const chords = [
    [N.A3, N.Cs4, N.E4], [N.A3, N.Cs4, N.E4],
    [N.Fs3, N.A3, N.Cs4], [N.Fs3, N.A3, N.Cs4],
    [N.D3, N.Fs3, N.A3], [N.D3, N.Fs3, N.A3],
    [N.Gs3, N.B3, N.E4], [N.Gs3, N.B3, N.E4],
    [N.A3, N.Cs4, N.E4], [N.A3, N.Cs4, N.E4],
    [N.Fs3, N.A3, N.Cs4], [N.Fs3, N.A3, N.Cs4],
    [N.B3, N.D4, N.Fs4], [N.B3, N.D4, N.Fs4],
    [N.Gs3, N.B3, N.E4], [N.Gs3, N.B3, N.E4],
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
      gain.gain.linearRampToValueAtTime(0.04, now + 0.04)
      gain.gain.linearRampToValueAtTime(0.025, now + halfNoteMs / 1000 - 0.08)
      gain.gain.linearRampToValueAtTime(0, now + halfNoteMs / 1000)
      osc.start(now)
      osc.stop(now + halfNoteMs / 1000 + 0.05)
      nodes.push(osc, gain)
    }
    chordIdx++
  }

  // --- ベース (triangle, half notes) ---
  const bassNotes = [
    N.A2, N.A2, N.Fs2, N.Fs2, N.D3, N.D3, N.E2, N.E2,
    N.A2, N.A2, N.Fs2, N.Fs2, N.B2, N.B2, N.E2, N.E2,
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

  // --- ドラム (kick 1,3 + snare 2,4) ---
  let drumStep = 0

  function playDrum(): void {
    const t = ctx.currentTime
    const beat = drumStep % 4

    if (beat === 0 || beat === 2) {
      const o = ctx.createOscillator()
      const g = makeGain(ctx, 0)
      o.type = 'sine'
      o.frequency.setValueAtTime(150, t)
      o.frequency.exponentialRampToValueAtTime(40, t + 0.1)
      o.connect(g)
      g.connect(masterGain)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.15, t + 0.005)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
      o.start(t)
      o.stop(t + 0.15)
      nodes.push(o, g)
    }

    if (beat === 1 || beat === 3) {
      const bufLen = ctx.sampleRate * 0.08
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.5)
      const src = ctx.createBufferSource()
      const g = makeGain(ctx, 0)
      const bpf = ctx.createBiquadFilter()
      bpf.type = 'bandpass'
      bpf.frequency.value = 2000
      bpf.Q.value = 1.2
      src.buffer = buf
      src.connect(bpf)
      bpf.connect(g)
      g.connect(masterGain)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.05, t + 0.002)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
      src.start(t)
      nodes.push(src, g, bpf)
    }

    drumStep++
  }

  // --- ハイハット (8分音符間隔) ---
  function playHihat(): void {
    const t = ctx.currentTime
    const bufLen = ctx.sampleRate * 0.03
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 3)
    const src = ctx.createBufferSource()
    const g = makeGain(ctx, 0)
    const hpf = ctx.createBiquadFilter()
    hpf.type = 'highpass'
    hpf.frequency.value = 9500
    src.buffer = buf
    src.connect(hpf)
    hpf.connect(g)
    g.connect(masterGain)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.025, t + 0.001)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03)
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
