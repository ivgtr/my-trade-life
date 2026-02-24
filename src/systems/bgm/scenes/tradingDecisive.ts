import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeLPF, makeGain } from '../audioUtils'

// 音名→周波数
const N: Record<string, number> = {
  A1: 55.00, D2: 73.42, E2: 82.41, F2: 87.31,
  G3: 196.00, A3: 220.00, Bb3: 233.08, 'C#4': 277.18,
  D4: 293.66, E4: 329.63, F4: 349.23, A4: 440.00,
}

/**
 * tradingDecisive — エヴァ「決戦」風
 * BPM 138、Dm調。マーチリズム + ベースオスティナート + 弦トレモロ
 */
export const buildTradingDecisive: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []

  const bpm = 138
  const beatMs = (60 / bpm) * 1000  // ≈434ms
  const sixteenthMs = beatMs / 4    // ≈108ms

  // ベースオスティナート（square、8音=8拍ループ）
  const bassLine = [N.D2, N.D2, N.F2, N.F2, N.E2, N.E2, N.D2, N.A1]
  let bassStep = 0

  function playBass(): void {
    const freq = bassLine[bassStep % bassLine.length]
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = makeGain(ctx, 0)
    const lpf = makeLPF(ctx, 600, 2)
    osc.type = 'square'
    osc.frequency.setValueAtTime(freq, now)
    osc.connect(lpf)
    lpf.connect(gain)
    gain.connect(masterGain)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.10, now + 0.01)
    gain.gain.setValueAtTime(0.10, now + beatMs / 1000 - 0.04)
    gain.gain.linearRampToValueAtTime(0, now + beatMs / 1000)
    osc.start(now)
    osc.stop(now + beatMs / 1000 + 0.01)
    nodes.push(osc, gain, lpf)
    bassStep++
  }

  // トレモロ和声（sawtooth x3、4拍ごとに切替、LPF 2000）
  // Dm→Bb→Gm→A（ドミナント）= 16拍周期
  const tremoloChords = [
    [N.D4, N.F4, N.A4],       // Dm
    [N.Bb3, N.D4, N.F4],      // Bb
    [N.G3, N.Bb3, N.D4],      // Gm
    [N.A3, N['C#4'], N.E4],   // A
  ]
  let tremoloIdx = 0
  const tremoloOscs: OscillatorNode[] = []
  const tremoloLpf = makeLPF(ctx, 2000, 1)
  tremoloLpf.connect(masterGain)

  function startTremolo(): void {
    const now = ctx.currentTime
    const chord = tremoloChords[0]
    chord.forEach((freq) => {
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0.03)
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, now)

      // トレモロLFO（8Hz → 弦のトレモロ効果）
      const lfo = ctx.createOscillator()
      const lfoG = makeGain(ctx, 0.015)
      lfo.type = 'sine'
      lfo.frequency.value = 8
      lfo.connect(lfoG)
      lfoG.connect(gain.gain)

      osc.connect(gain)
      gain.connect(tremoloLpf)
      osc.start(now)
      lfo.start(now)
      nodes.push(osc, gain, lfo, lfoG)
      tremoloOscs.push(osc)
    })
  }

  function switchTremolo(): void {
    tremoloIdx++
    const chord = tremoloChords[tremoloIdx % tremoloChords.length]
    const now = ctx.currentTime
    tremoloOscs.forEach((osc, i) => {
      osc.frequency.linearRampToValueAtTime(chord[i], now + 0.1)
    })
  }

  // スネアパターン（16分音符、32ステップ=2小節分）
  const snarePattern = [1,0,0,1, 1,0,0,1, 1,0,1,1, 1,0,1,0, 1,0,0,1, 1,0,0,1, 1,1,1,0, 1,0,1,1]
  let snareStep = 0

  function playSnare(): void {
    if (snarePattern[snareStep % snarePattern.length]) {
      const t = ctx.currentTime
      const bufLen = ctx.sampleRate * 0.06
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2)
      const src = ctx.createBufferSource()
      const g = makeGain(ctx, 0)
      const bpf = ctx.createBiquadFilter()
      bpf.type = 'bandpass'
      bpf.frequency.value = 2000
      bpf.Q.value = 1.5
      src.buffer = buf
      src.connect(bpf)
      bpf.connect(g)
      g.connect(masterGain)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.04, t + 0.002)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.06)
      src.start(t)
      nodes.push(src, g, bpf)
    }
    snareStep++
  }

  // キック（各小節の拍1、sine 120→40Hz）
  let kickBeat = 0
  function playKick(): void {
    if (kickBeat % 4 === 0) {
      const t = ctx.currentTime
      const o = ctx.createOscillator()
      const g = makeGain(ctx, 0)
      o.type = 'sine'
      o.frequency.setValueAtTime(120, t)
      o.frequency.exponentialRampToValueAtTime(40, t + 0.1)
      o.connect(g)
      g.connect(masterGain)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.18, t + 0.005)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15)
      o.start(t)
      o.stop(t + 0.18)
      nodes.push(o, g)
    }
    kickBeat++
  }

  startTremolo()
  nodes.push(tremoloLpf)
  timers.push(setInterval(playBass, beatMs))
  timers.push(setInterval(switchTremolo, beatMs * 4))
  timers.push(setInterval(playSnare, sixteenthMs))
  timers.push(setInterval(playKick, beatMs))
  return { nodes, timers }
}
