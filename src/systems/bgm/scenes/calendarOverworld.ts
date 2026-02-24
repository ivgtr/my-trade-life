import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeGain } from '../audioUtils'

// 音名→周波数
const N: Record<string, number> = {
  E2: 82.41, G2: 98.00, A2: 110.00, B2: 123.47, C3: 130.81,
  E4: 329.63, F4: 349.23, 'F#4': 369.99, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
}

/**
 * calendarOverworld — マリオ地上風
 * BPM 140、C major。square波レトロサウンド
 */
export const buildCalendarOverworld: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []

  const bpm = 140
  const eighthMs = (60 / bpm / 2) * 1000 // ≈214ms

  // メロディ（square波、8分音符、0=休符）
  const melody = [
    N.E5, N.E5, 0, N.E5, 0, N.C5, N.E5, 0, N.G5, 0, 0, 0, N.G4, 0, 0, 0,
    N.C5, 0, 0, N.G4, 0, 0, N.E4, 0, 0, N.A4, 0, N.B4, 0, N.A4, 0, 0,
    N.G4, 0, N['F#4'], N.F4, N.E4, 0, N.C5, 0, N.E5, 0, N.F5, N.D5, N.E5, 0, N.C5, 0,
    N.A4, 0, N.B4, N.C5, 0, N.B4, N.A4, N.G4, 0, N.E5, 0, N.D5, N.C5, 0, 0, 0,
  ]
  let melStep = 0

  function playMelody(): void {
    const freq = melody[melStep % melody.length]
    if (freq > 0) {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'square'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(masterGain)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.06, now + 0.01)
      gain.gain.setValueAtTime(0.06, now + eighthMs / 1000 - 0.02)
      gain.gain.linearRampToValueAtTime(0, now + eighthMs / 1000)
      osc.start(now)
      osc.stop(now + eighthMs / 1000 + 0.01)
      nodes.push(osc, gain)
    }
    melStep++
  }

  // ベース（triangle波、2拍=428ms間隔、16音ループ）
  const bassLine = [
    N.C3, 0, N.G2, 0, N.E2, 0, N.G2, 0, N.A2, 0, N.G2, 0, N.A2, 0, N.B2, 0,
  ]
  const halfBeatMs = (60 / bpm) * 1000 // 4分音符=428ms
  let bassStep = 0

  function playBass(): void {
    const freq = bassLine[bassStep % bassLine.length]
    if (freq > 0) {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(masterGain)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.07, now + 0.01)
      gain.gain.setValueAtTime(0.07, now + halfBeatMs / 1000 - 0.03)
      gain.gain.linearRampToValueAtTime(0, now + halfBeatMs / 1000)
      osc.start(now)
      osc.stop(now + halfBeatMs / 1000 + 0.01)
      nodes.push(osc, gain)
    }
    bassStep++
  }

  // ドラム（キック+スネア交互4分音符）
  let drumStep = 0
  function playDrum(): void {
    const t = ctx.currentTime
    if (drumStep % 2 === 0) {
      // キック
      const o = ctx.createOscillator()
      const g = makeGain(ctx, 0)
      o.type = 'sine'
      o.frequency.setValueAtTime(150, t)
      o.frequency.exponentialRampToValueAtTime(40, t + 0.08)
      o.connect(g)
      g.connect(masterGain)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.12, t + 0.005)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
      o.start(t)
      o.stop(t + 0.15)
      nodes.push(o, g)
    } else {
      // スネア（ノイズ）
      const bufLen = ctx.sampleRate * 0.06
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2)
      const src = ctx.createBufferSource()
      const g = makeGain(ctx, 0)
      src.buffer = buf
      src.connect(g)
      g.connect(masterGain)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.05, t + 0.002)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
      src.start(t)
      nodes.push(src, g)
    }
    drumStep++
  }

  timers.push(setInterval(playMelody, eighthMs))
  timers.push(setInterval(playBass, eighthMs))
  timers.push(setInterval(playDrum, halfBeatMs))
  return { nodes, timers }
}
