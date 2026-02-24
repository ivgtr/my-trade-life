import type { BGMBuilder, BGMNodeSet } from '../types'
import { makeReverb, makeGain } from '../audioUtils'

// 音名→周波数
const N: Record<string, number> = {
  G1: 49.00, Ab1: 51.91, Bb1: 58.27,
  C2: 65.41, Eb2: 77.78, 'F#2': 92.50, G2: 98.00,
  C4: 261.63, D4: 293.66, Eb4: 311.13, F4: 349.23, G4: 392.00, Ab4: 415.30, Bb4: 466.16,
  B4: 493.88,
}

/**
 * tradingInfiltrate — MGS潜入風
 * BPM 100、Cm調。緊張感のある静かなベースライン + メロディ
 */
export const buildTradingInfiltrate: BGMBuilder = (ctx, masterGain) => {
  const nodes: AudioNode[] = []
  const timers: BGMNodeSet['timers'] = []

  const bpm = 100
  const eighthMs = (60 / bpm / 2) * 1000 // 300ms

  const reverb = makeReverb(ctx, 1.5, 2.0)
  reverb.connect(masterGain)

  // ベース（triangle、各1拍=600ms、8音ループ）
  const bassLine = [N.C2, N.Eb2, N.G2, N['F#2'], N.C2, N.Bb1, N.Ab1, N.G1]
  const beatMs = (60 / bpm) * 1000 // 600ms
  let bassStep = 0

  function playBass(): void {
    const freq = bassLine[bassStep % bassLine.length]
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = makeGain(ctx, 0)
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, now)
    osc.connect(gain)
    gain.connect(reverb)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.08, now + 0.02)
    gain.gain.linearRampToValueAtTime(0.06, now + beatMs / 1000 - 0.1)
    gain.gain.linearRampToValueAtTime(0, now + beatMs / 1000)
    osc.start(now)
    osc.stop(now + beatMs / 1000 + 0.05)
    nodes.push(osc, gain)
    bassStep++
  }

  // メロディ（小節5-8で登場、8分音符=300ms、32ステップループ）
  const melodyLine = [
    0, 0, 0, 0, 0, 0, 0, 0, N.G4, N.Ab4, N.G4, N.Eb4, N.D4, N.C4, N.D4, N.Eb4,
    0, 0, 0, 0, 0, 0, 0, 0, N.Bb4, N.Ab4, N.G4, N.F4, N.Eb4, N.D4, N.C4, 0,
  ]
  let melStep = 0

  function playMelody(): void {
    const freq = melodyLine[melStep % melodyLine.length]
    if (freq > 0) {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = makeGain(ctx, 0)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gain)
      gain.connect(reverb)
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(0.07, now + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
      osc.start(now)
      osc.stop(now + 0.3)
      nodes.push(osc, gain)
    }
    melStep++
  }

  // ハイハット（HPFノイズ 9000Hz、8分音符、vol 0.03）
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

  // スネア（BPFノイズ 1500Hz、拍3+拍4裏）
  let snareStep = 0
  function playSnare(): void {
    // 8ステップで1周期（8分音符8つ=4拍）
    const pos = snareStep % 8
    // 拍3=pos4、拍4裏=pos7
    if (pos === 4 || pos === 7) {
      const t = ctx.currentTime
      const bufLen = ctx.sampleRate * 0.12
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 2)
      const src = ctx.createBufferSource()
      const g = makeGain(ctx, 0)
      const bpf = ctx.createBiquadFilter()
      bpf.type = 'bandpass'
      bpf.frequency.value = 1500
      bpf.Q.value = 2
      src.buffer = buf
      src.connect(bpf)
      bpf.connect(g)
      g.connect(masterGain)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.05, t + 0.002)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
      src.start(t)
      nodes.push(src, g, bpf)
    }
    snareStep++
  }

  // テンション音（sine B4、LFO 0.3Hz、vol 0-0.02）
  const tensionOsc = ctx.createOscillator()
  const tensionGain = makeGain(ctx, 0)
  const tensionLfo = ctx.createOscillator()
  const tensionLfoG = makeGain(ctx, 0.01)
  tensionOsc.type = 'sine'
  tensionOsc.frequency.value = N.B4
  tensionLfo.type = 'sine'
  tensionLfo.frequency.value = 0.3
  tensionLfo.connect(tensionLfoG)
  tensionLfoG.connect(tensionGain.gain)
  tensionOsc.connect(tensionGain)
  tensionGain.connect(reverb)
  tensionGain.gain.setValueAtTime(0.01, ctx.currentTime)
  tensionOsc.start(ctx.currentTime)
  tensionLfo.start(ctx.currentTime)
  nodes.push(tensionOsc, tensionGain, tensionLfo, tensionLfoG)

  timers.push(setInterval(playBass, beatMs))
  timers.push(setInterval(playMelody, eighthMs))
  timers.push(setInterval(playHihat, eighthMs))
  timers.push(setInterval(playSnare, eighthMs))
  return { nodes, timers }
}
